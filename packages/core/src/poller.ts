import {
  BehaviorSubject,
  switchMap,
  type Observable,
  interval,
  retry,
  Subject,
  map,
  merge,
  Subscription,
  filter,
  take,
  mergeMap,
  tap,
  defer,
  concat,
} from "rxjs";
import { EcashTransaction, LightningTransaction } from "./transaction";
import { Proof } from "./proof";
import { CashuMint, CashuWallet, getDecodedToken } from "@cashu/cashu-ts";
import { getProofsFromToken } from "./token";

export interface Poller {
  addEcash(transaction: EcashTransaction): void;
  addLightning(transaction: LightningTransaction): void;
  spentNotifier$: Observable<EcashTransaction[]>;
  paidNotifier$: Observable<[LightningTransaction, Proof[]]>;
  check(): void;
  destroy(): void;
}

export class RxPoller implements Poller {
  paidNotifier$: Observable<[LightningTransaction, Proof[]]>;
  spentNotifier$: Observable<EcashTransaction[]>;
  #ecash$$ = new BehaviorSubject<EcashTransaction[]>([]);
  #lightning: LightningTransaction[] = [];
  #lightning$$ = new Subject<LightningTransaction>();
  #mint: CashuMint;
  #wallet: CashuWallet;
  #spentNotifier$$ = new Subject<EcashTransaction[]>();
  #paidNotifier$$ = new Subject<[LightningTransaction, Proof[]]>();
  #check$$ = new Subject<void>();
  #lightningSub: Subscription;
  #ecashSub: Subscription;
  constructor(
    public readonly mintUrl: string,
    private readonly checkInterval = 10000,
    private readonly attempts = 20,
  ) {
    this.#mint = new CashuMint(mintUrl);
    this.#wallet = new CashuWallet(this.#mint);
    this.paidNotifier$ = this.#paidNotifier$$.asObservable();
    this.spentNotifier$ = this.#spentNotifier$$.asObservable();

    this.#lightningSub = this.#createLightningChecker().subscribe(([t, p]) => {
      this.#lightning = this.#lightning.filter((tx) => tx.hash !== t.hash);
      this.#paidNotifier$$.next([t, p]);
    });

    this.#ecashSub = this.#createEcashChecker().subscribe((transactions) => {
      this.#ecash$$.next(
        this.#ecash$$.getValue().filter((tx) => !transactions.includes(tx)),
      );
      this.#spentNotifier$$.next(transactions);
    });
  }

  addEcash(transaction: EcashTransaction): void {
    const exists = this.#ecash.find((t) => t.token === transaction.token);
    if (exists) {
      return;
    }
    this.#ecash$$.next([...this.#ecash, transaction]);
  }

  addLightning(transaction: LightningTransaction): void {
    const exists = this.#lightning.find((t) => t.hash === transaction.hash);
    if (exists) {
      return;
    }
    this.#lightning.push(transaction);
    this.#lightning$$.next(transaction);
  }

  check(): void {
    this.#check$$.next();
  }

  destroy(): void {
    this.#lightningSub.unsubscribe();
    this.#ecashSub.unsubscribe();
  }

  #createLightningChecker() {
    return this.#lightning$$.pipe(
      mergeMap((t) =>
        defer(() => this.#wallet.requestTokens(t.amount, t.hash)).pipe(
          tap((r) => console.log("got proofs", r)),
          retry({ count: this.attempts, delay: this.checkInterval }),
          map(({ proofs }) => [t, proofs] as [LightningTransaction, Proof[]]),
        ),
      ),
    );
  }

  #createEcashChecker() {
    const checkTrigger$ = this.#check$$.pipe(map(() => this.#ecash));
    return merge(this.#ecash$$, checkTrigger$).pipe(
      filter(() => this.#ecash.length > 0),
      switchMap(() => {
        return concat(
          interval(0).pipe(take(1)),
          interval(this.checkInterval),
        ).pipe(
          filter(() => this.#ecash.length > 0),
          switchMap(async () => this.#checkEcash(this.#ecash)),
          take(this.attempts),
          filter((p) => p.length > 0),
        );
      }),
    );
  }

  async #checkEcash(ecash: EcashTransaction[]) {
    const proofsToCheck = ecash.flatMap((t) =>
      getProofsFromToken(getDecodedToken(t.token)),
    );
    const spentProofs = await this.#wallet.checkProofsSpent(proofsToCheck);
    const proofSecrets = spentProofs.map((p) => p.secret);
    return ecash.filter((t) =>
      getProofsFromToken(getDecodedToken(t.token)).some((pp) =>
        proofSecrets.includes(pp.secret),
      ),
    );
  }

  get #ecash() {
    return this.#ecash$$.getValue();
  }
}
