import {
  BehaviorSubject,
  switchMap,
  type Observable,
  interval,
  combineLatest,
  retry,
  Subject,
  map,
  merge,
  Subscription,
  filter,
  take,
} from "rxjs";
import { EcashTransaction, LightningTransaction } from "./transaction";
import { Proof } from "./proof";
import { CashuMint, CashuWallet, getDecodedToken } from "@cashu/cashu-ts";
import { getProofsFromToken } from "./token";

export interface Poller {
  addEcash(transaction: EcashTransaction): void;
  addLightning(transaction: LightningTransaction): void;
  spentNotifier$: Observable<EcashTransaction[]>;
  paidNotifier$: Observable<[LightningTransaction, Proof[]][]>;
  check(): void;
  destroy(): void;
}

export class RxPoller implements Poller {
  paidNotifier$: Observable<[LightningTransaction, Proof[]][]>;
  spentNotifier$: Observable<EcashTransaction[]>;
  #ecash$$ = new BehaviorSubject<EcashTransaction[]>([]);
  $lightning$$ = new Subject<LightningTransaction>();
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
    initial?: { ecash: EcashTransaction[]; lightning: LightningTransaction[] },
  ) {
    this.#mint = new CashuMint(mintUrl);
    this.#wallet = new CashuWallet(this.#mint);
    this.paidNotifier$ = this.#paidNotifier$$.asObservable();
    this.spentNotifier$ = this.#spentNotifier$$.asObservable();
    if (initial) {
      this.#ecash$$.next(initial.ecash);
      this.#lightning$$.next(initial.lightning);
    }

    this.#lightningSub = this.#createLightningChecker().subscribe(
      (transactions) => {
        transactions.forEach(([t]) => {
          this.#lightning$$.next(
            this.#lightning$$.getValue().filter((tx) => tx.hash !== t.hash),
          );
        });
        this.#paidNotifier$$.next(transactions);
      },
    );

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
    this.#lightning$$.next([...this.#lightning, transaction]);
  }

  check(): void {
    this.#check$$.next();
  }

  destroy(): void {
    this.#lightningSub.unsubscribe();
    this.#ecashSub.unsubscribe();
  }

  #createLightningChecker() {
    return merge(this.#lightning$$, checkTrigger$).pipe(
      switchMap((transactions) => {
        return interval(this.checkInterval).pipe(
          filter(() => transactions.length > 0),
          switchMap(() =>
            combineLatest(
              transactions.map((t) =>
                this.#wallet
                  .requestTokens(t.amount, t.hash)
                  .then(
                    (proofs) =>
                      [t, proofs.proofs] as [LightningTransaction, Proof[]],
                  ),
              ),
            ),
          ),
          retry(this.attempts),
        );
      }),
    );
  }

  #createEcashChecker() {
    const checkTrigger$ = this.#check$$.pipe(map(() => this.#ecash));
    return merge(this.#ecash$$, checkTrigger$).pipe(
      switchMap((ecash) => {
        return interval(this.checkInterval).pipe(
          filter(() => ecash.length > 0),
          switchMap(async () => {
            const proofsToCheck = ecash.flatMap((t) =>
              getProofsFromToken(getDecodedToken(t.token)),
            );
            const spentProofs =
              await this.#wallet.checkProofsSpent(proofsToCheck);
            const proofSecrets = spentProofs.map((p) => p.secret);
            return ecash.filter((t) =>
              getProofsFromToken(getDecodedToken(t.token)).some((pp) =>
                proofSecrets.includes(pp.secret),
              ),
            );
          }),
          take(this.attempts),
          filter((p) => p.length > 0),
        );
      }),
    );
  }

  get #ecash() {
    return this.#ecash$$.getValue();
  }

  get #lightning() {
    return this.#lightning$$.getValue();
  }
}
