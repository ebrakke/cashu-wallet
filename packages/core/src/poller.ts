import { CashuMint, CashuWallet, Proof } from "@cashu/cashu-ts";
import {
  BehaviorSubject,
  Subject,
  filter,
  map,
  switchMap,
  interval,
  Observable,
  take,
  Subscription,
  combineLatest,
  retry,
} from "rxjs";
import { EcashTransaction, LightningTransaction } from "./transaction";
import { getProofsFromTransaction } from "./utils";

export class Poller {
  #wallet: CashuWallet;
  #mint: CashuMint;
  #proofs$$: BehaviorSubject<EcashTransaction[]> = new BehaviorSubject(
    [] as EcashTransaction[],
  );
  #invoices$$: BehaviorSubject<LightningTransaction[]> = new BehaviorSubject(
    [] as LightningTransaction[],
  );
  proofSpentNotifier$: Subject<EcashTransaction[]> = new Subject();
  invoicePaidNotifier$: Subject<{
    invoice: LightningTransaction;
    proofs: Proof[];
  }> = new Subject();
  #proofChecker$: Observable<EcashTransaction[]>;
  #invoiceChecker$: Observable<
    { invoice: LightningTransaction; proofs: Proof[] }[]
  >;
  proofSub?: Subscription;
  invoiceSub?: Subscription;

  constructor(
    public readonly mintUrl: string,
    private readonly checkInterval = 10000,
    private readonly attempts = 20,
  ) {
    this.#mint = new CashuMint(mintUrl);
    this.#wallet = new CashuWallet(this.#mint);

    this.#proofChecker$ = this.#createProofChecker();
    this.#invoiceChecker$ = this.#createInvoiceChecker();
  }
  get #proofs() {
    return this.#proofs$$.getValue();
  }

  get #invoices() {
    return this.#invoices$$.getValue();
  }

  addEcash(transaction: EcashTransaction) {
    const existing = this.#proofs.find((t) => t.token === transaction.token);
    if (existing) {
      return;
    }
    if (this.proofSub) {
      this.proofSub.unsubscribe();
    }
    this.#proofs$$.next([...this.#proofs, transaction]);
    this.proofSub = this.#proofChecker$.subscribe({
      next: (ts) => {
        this.proofSpentNotifier$.next(ts);
        const secretsSpent = ts
          .flatMap(getProofsFromTransaction)
          .map((p) => p.secret);
        const filteredProofs = this.#proofs.filter((t) => {
          const proofs = getProofsFromTransaction(t);
          return !proofs.some((p) => secretsSpent.includes(p.secret));
        });
        this.#proofs$$.next(filteredProofs);
      },
      complete: () => {
        this.proofSub?.unsubscribe();
        this.proofSub = undefined;
      },
    });
  }

  addInvoice(invoice: LightningTransaction) {
    const existing = this.#invoices.find((t) => t.hash === invoice.hash);
    if (existing) {
      return;
    }
    if (this.invoiceSub) {
      this.invoiceSub.unsubscribe();
    }
    this.#invoices$$.next([...this.#invoices$$.getValue(), invoice]);
    this.invoiceSub = this.#invoiceChecker$.subscribe({
      next: (invoices) => {
        invoices.forEach((i) => {
          this.invoicePaidNotifier$.next(i);
          this.#invoices$$.next(
            this.#invoices$$
              .getValue()
              .filter((ii) => ii.hash !== i.invoice.hash),
          );
        });
      },
      complete: () => {
        this.invoiceSub?.unsubscribe();
        this.invoiceSub = undefined;
      },
    });
  }

  #createInvoiceChecker() {
    return interval(this.checkInterval).pipe(
      map(() => this.#invoices$$.getValue()),
      filter((invoices) => invoices.length > 0),
      switchMap((invoices) =>
        combineLatest(
          invoices.map((i) =>
            this.#wallet
              .requestTokens(i.amount, i.hash)
              .then((t) => ({ invoice: i, proofs: t.proofs })),
          ),
        ),
      ),
      retry(this.attempts),
      filter((invoices) => invoices.length > 0),
    );
  }

  #createProofChecker() {
    return interval(this.checkInterval).pipe(
      map(() => this.#proofs),
      filter((proofs) => proofs.length > 0),
      switchMap(async (proofs) => {
        const proofsToCheck = proofs.flatMap(getProofsFromTransaction);
        const spentProofs = await this.#wallet.checkProofsSpent(proofsToCheck);
        const proofSecrets = spentProofs.map((p) => p.secret);
        return proofs.filter((p) =>
          getProofsFromTransaction(p).some((pp) =>
            proofSecrets.includes(pp.secret),
          ),
        );
      }),
      take(this.attempts),
      filter((p) => p.length > 0),
    );
  }
}
