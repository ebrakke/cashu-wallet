import {
  Observable,
  interval,
  switchMap,
  map,
  take,
  BehaviorSubject,
  combineLatest,
  filter,
  retry,
} from "rxjs";
import _ from "lodash";
import {
  CashuMint,
  CashuWallet,
  type Proof,
  getEncodedToken,
  Token,
  getDecodedToken,
} from "@cashu/cashu-ts";
import { decode } from "@gandlaf21/bolt11-decode";
import type { StorageProvider } from "./storage";
import {
  createEcashTransaction,
  createLightningTransaction,
  isEcashTransaction,
  isLightningTransaction,
} from "./transaction";

export interface WalletState {
  balance: number;
  proofs: Proof[];
  transactions: Record<string, Transaction>;
}

type EcashToken = { type: "ecash"; token: string };
type Bolt11Invoice = { type: "lightning"; amount: number };
type ReceivePayload = EcashToken | Bolt11Invoice;

type SendToken = { type: "cashu"; amount: number };
type SendLightning = { type: "lightning"; amount: number; pr: string };
type SendPayload = SendToken | SendLightning;

type EcashTransaction = {
  type: "ecash";
  token: string;
  amount: number;
  date: Date;
  isPaid: boolean;
};
type LightningTransaction = {
  type: "lightning";
  pr: string;
  amount: number;
  hash: string;
  date: Date;
  isPaid: boolean;
};

type Transaction = EcashTransaction | LightningTransaction;

interface IWallet {
  state$: Observable<WalletState>;
  state: WalletState;
  receive(payload: ReceivePayload): Promise<void | string>;
  send(payload: SendPayload): Promise<string | void>;
}

/**
 * Single mint wallet
 */
export class Wallet implements IWallet {
  #mint: CashuMint;
  #wallet: CashuWallet;
  #proofs$$: BehaviorSubject<Proof[]> = new BehaviorSubject([] as Proof[]);
  #transactions$$: BehaviorSubject<Record<string, Transaction>> =
    new BehaviorSubject({});
  STORAGE_KEY: string;
  WORKER_INTERVAL = 5000;
  constructor(
    id: string,
    mintUrl: string,
    private readonly storage?: StorageProvider
  ) {
    this.STORAGE_KEY = `wallet-${mintUrl}-${id}`;
    this.#mint = new CashuMint(mintUrl);
    this.#wallet = new CashuWallet(this.#mint);
    if (this.storage) {
      this.#loadFromStorage();
      this.#setupPersistence();
      this.#initializeWorkers();
    }
  }

  get state() {
    return {
      balance: this.#balance,
      proofs: this.#proofs,
      transactions: this.#transactions,
    };
  }

  get state$() {
    return combineLatest([this.#proofs$$, this.#transactions$$]).pipe(
      map(([proofs, transactions]) => ({
        balance: _.sumBy(proofs, "amount"),
        proofs,
        transactions,
      }))
    );
  }

  async receive(payload: ReceivePayload) {
    if (payload.type === "ecash") {
      await this.#receiveEcash(payload.token);
    } else {
      return await this.#receiveLightning(payload.amount);
    }
  }

  async send(payload: SendPayload) {
    if (payload.type === "cashu") {
      return await this.#sendEcash(payload.amount);
    } else {
      return await this.#sendLightning(payload.pr);
    }
  }

  async #receiveEcash(token: string): Promise<void> {
    const response = await this.#wallet.receive(token);
    const proofs = response.token.token.map((t) => t.proofs).flat();
    this.#proofs$$.next([...this.#proofs, ...proofs]);
  }

  async #receiveLightning(amount: number): Promise<string> {
    const response = await this.#wallet.requestMint(amount);
    if (response.error) {
      console.error(`failed to fund wallet: ${response.error}`);
      throw new Error("Failed to fund wallet");
    }
    const transaction = createLightningTransaction({
      pr: response.pr,
      amount,
      hash: response.hash,
    });
    const invoiceChecker$ = this.#createLightningWorker$(transaction);
    this.#transactions$$.next({
      ...this.#transactions,
      [transaction.pr]: transaction,
    });
    invoiceChecker$.subscribe((proofs) =>
      this.#handleLightningTransactionPaid(transaction, proofs)
    );
    return response.pr;
  }

  async #sendEcash(amount: number): Promise<string> {
    const response = await this.#wallet.send(amount, this.#proofs);
    this.#proofs$$.next(response.returnChange);
    const token: Token = {
      token: [{ mint: this.#mint.mintUrl, proofs: response.send }],
    };
    const encodedToken = getEncodedToken(token);
    const transaction = createEcashTransaction({
      amount,
      token: encodedToken,
    });
    this.#transactions$$.next({
      ...this.#transactions,
      [encodedToken]: transaction,
    });
    const tokenChecker$ = this.#createEcashWorker$(transaction);
    tokenChecker$.subscribe(() => this.#handleTokenPaid(transaction));
    return encodedToken;
  }

  async #sendLightning(pr: string): Promise<void> {
    const fee = await this.#wallet.getFee(pr);
    const decoded = decode(pr);
    const amount = decoded.sections.find((s) => s.name === "amount")?.value;
    if (!amount) {
      throw new Error("Invalid invoice. No amount found");
    }
    const sats = Math.floor(parseInt(amount) / 1000);
    const { returnChange, send } = await this.#wallet.send(
      sats + fee,
      this.#proofs
    );
    await this.#wallet.payLnInvoice(pr, send);
    this.#proofs$$.next(returnChange);
  }

  getEncodedToken(token: Token): string {
    return getEncodedToken(token);
  }

  #createLightningWorker$({ amount, hash }: LightningTransaction) {
    return interval(this.WORKER_INTERVAL).pipe(
      switchMap(() => this.#wallet.requestTokens(amount, hash)),
      retry(),
      map((r) => r.proofs),
      take(1)
    );
  }

  #createEcashWorker$({ token }: EcashTransaction): Observable<boolean> {
    const parsedToken = getDecodedToken(token);
    const proofs = parsedToken.token.map((t) => t.proofs).flat();
    return interval(this.WORKER_INTERVAL).pipe(
      switchMap(() => this.#wallet.checkProofsSpent(proofs)),
      retry(),
      filter((s) => s.length === proofs.length),
      map(() => true),
      take(1)
    );
  }

  #handleLightningTransactionPaid(
    invoice: LightningTransaction,
    proofs: Proof[]
  ) {
    this.#proofs$$.next([...this.#proofs, ...proofs]);
    const transaction = this.#transactions[invoice.pr];
    if (!transaction) return;
    this.#transactions$$.next({
      ...this.#transactions,
      [invoice.pr]: { ...invoice, isPaid: true },
    });
  }

  #handleTokenPaid({ token }: EcashTransaction) {
    const transaction = this.#transactions[token];
    if (!transaction) return;
    this.#transactions$$.next({
      ...this.#transactions,
      [token]: { ...transaction, isPaid: true },
    });
  }

  #setupPersistence() {
    if (this.storage) {
      this.state$.subscribe((state) => {
        this.storage!.set(this.STORAGE_KEY, state);
      });
    }
  }

  #loadFromStorage() {
    if (this.storage) {
      const state = this.storage.get(this.STORAGE_KEY);
      if (state) {
        this.#proofs$$.next(state.proofs);
        this.#transactions$$.next(state.transactions);
      }
    }
  }

  #initializeWorkers() {
    const pendingLightningTransactions = Object.values(this.#transactions)
      .filter(isLightningTransaction)
      .filter((t) => !t.isPaid);
    const pendingEcashTransactions = Object.values(this.#transactions)
      .filter(isEcashTransaction)
      .filter((t) => !t.isPaid);

    pendingLightningTransactions.forEach((t) => {
      this.#createLightningWorker$(t).subscribe((proofs) =>
        this.#handleLightningTransactionPaid(t, proofs)
      );
    });

    pendingEcashTransactions.forEach((t) => {
      this.#createEcashWorker$(t).subscribe(() => this.#handleTokenPaid(t));
    });
  }

  get #proofs() {
    return this.#proofs$$.getValue();
  }

  get #balance() {
    return _.sumBy(this.#proofs, "amount");
  }

  get #transactions() {
    return this.#transactions$$.getValue();
  }
}
