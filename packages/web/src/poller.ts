import { CashuMint, CashuWallet, getDecodedToken } from "@cashu/cashu-ts";
import {
  BehaviorSubject,
  Subject,
  filter,
  map,
  switchMap,
  interval,
  Observable,
  take,
  combineLatest,
  retry,
} from "rxjs";
import {
  EcashTransaction,
  LightningTransaction,
  Proof,
  getProofsFromToken,
} from "@cashu-wallet/core";

export class Poller {
  #wallet: CashuWallet;
  #mint: CashuMint;
  invoicePaidNotifier$: Subject<[LightningTransaction, Proof[]]> =
    new Subject();
  tokenSpentNotifier$: Subject<EcashTransaction[]> = new Subject();
  #lightningChecker$: Observable<LightningTransaction[]>;
  #tokenChecker: Observable<EcashTransaction[]>;
  #lightningTransactions$$ = new BehaviorSubject<LightningTransaction[]>([]);
  #ecashTransactions$$ = new BehaviorSubject<EcashTransaction[]>([]);

  constructor(
    public readonly mintUrl: string,
    private readonly checkInterval = 10000,
    private readonly attempts = 20
  ) {
    this.#mint = new CashuMint(mintUrl);
    this.#wallet = new CashuWallet(this.#mint);
  }

  addLightning(transaction: LightningTransaction) {
    const existing = this.#lightningTransactions.find(
      (t) => t.hash === transaction.hash
    );
    if (existing) {
      return;
    }
    this.#lightningTransactions$$.next([
      ...this.#lightningTransactions$$.getValue(),
      transaction,
    ]);
  }

  addEcash(transaction: EcashTransaction) {
    const existing = this.#ecashTransactions.find(
      (t) => t.token === transaction.token
    );
    if (existing) {
      return;
    }
    this.#ecashTransactions$$.next([...this.#ecashTransactions, transaction]);
  }

  addInvoice(invoice: LightningTransaction) {
    const existing = this.#lightningTransactions.find(
      (t) => t.hash === invoice.hash
    );
    if (existing) {
      return;
    }
    this.#lightningTransactions$$.next([
      ...this.#lightningTransactions$$.getValue(),
      invoice,
    ]);
  }

  #createInvoiceChecker() {
    return interval(this.checkInterval).pipe(
      map(() => this.#lightningTransactions),
      filter((invoices) => invoices.length > 0),
      switchMap((invoices) =>
        combineLatest(
          invoices.map((i) =>
            this.#wallet
              .requestTokens(i.amount, i.hash)
              .then((t) => ({ invoice: i, proofs: t.proofs }))
          )
        )
      ),
      retry(this.attempts),
      filter((invoices) => invoices.length > 0)
    );
  }

  #createProofChecker() {
    return interval(this.checkInterval).pipe(
      map(() => this.#ecashTransactions),
      filter((ts) => ts.length > 0),
      switchMap(async (ts) => {
        const proofsToCheck = ts.flatMap((t) =>
          getProofsFromToken(getDecodedToken(t.token))
        );
        const spentProofs = await this.#wallet.checkProofsSpent(proofsToCheck);
        const proofSecrets = spentProofs.map((p) => p.secret);
        return ts.filter((t) =>
          getProofsFromToken(getDecodedToken(t.token)).some((pp) =>
            proofSecrets.includes(pp.secret)
          )
        );
      }),
      take(this.attempts),
      filter((p) => p.length > 0)
    );
  }

  get #lightningTransactions() {
    return this.#lightningTransactions$$.getValue();
  }

  get #ecashTransactions() {
    return this.#ecashTransactions$$.getValue();
  }
}
