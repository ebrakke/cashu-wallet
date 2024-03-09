import {
  type Observable,
  interval,
  switchMap,
  map,
  take,
  BehaviorSubject,
  combineLatest,
  filter,
  retry,
  Subscription,
} from "rxjs";
import _ from "lodash";
import {
  CashuMint,
  CashuWallet,
  type Proof,
  type Token,
  getEncodedToken,
  getDecodedToken,
} from "@cashu/cashu-ts";
import type {
  AsyncStorageProvider,
  StorageProvider,
  StorageSetter,
} from "./storage";
import type { WalletState } from "./state";
import {
  type EcashTransaction,
  type LightningTransaction,
  type Transaction,
  createEcashTransaction,
  createLightningTransaction,
  isEcashTransaction,
  isLightningTransaction,
} from "./transaction";
import { getLnInvoiceAmount } from "./utils";

type ReceiveEcash = { type: "ecash"; token: string };
type ReceiveLightning = { type: "lightning"; amount: number };
export type ReceivePayload = ReceiveEcash | ReceiveLightning;

type SendEcash = { type: "ecash"; amount: number };
type SendLightning = { type: "lightning"; pr: string };
export type SendPayload = SendEcash | SendLightning;

interface IWallet {
  state$: Observable<WalletState>;
  state: WalletState;
  receive(payload: ReceivePayload): Promise<void | string>;
  send(payload: SendPayload): Promise<string | void>;
}

export type WalletConfig = {
  workerInterval?: number;
};

/**
 * Single mint wallet
 */
export class Wallet implements IWallet {
  #mint: CashuMint;
  #wallet: CashuWallet;
  #proofs$$: BehaviorSubject<Proof[]> = new BehaviorSubject([] as Proof[]);
  #transactions$$: BehaviorSubject<Record<string, Transaction>> =
    new BehaviorSubject({});
  #subscriptions: Map<string, Subscription> = new Map();
  WORKER_INTERVAL: number;
  constructor(
    mintUrl: string,
    private readonly storage?: StorageSetter,
    opts?: WalletConfig,
    initialState?: WalletState
  ) {
    this.#mint = new CashuMint(mintUrl);
    this.#wallet = new CashuWallet(this.#mint);
    this.WORKER_INTERVAL = opts?.workerInterval || 5000;

    if (initialState) {
      this.#proofs$$ = new BehaviorSubject(initialState.proofs);
      this.#transactions$$ = new BehaviorSubject(initialState.transactions);
    }
    if (this.storage) {
      this.#setupPersistence();
      this.#initializeWorkers();
    }
  }

  /**
   * Returns a snapshot of the current wallet state
   */
  get state() {
    return {
      balance: this.#balance,
      proofs: this.#proofs,
      transactions: this.#transactions,
      mintUrl: this.#mint.mintUrl,
    };
  }

  /**
   * Returns an observable of the wallet state
   */
  get state$() {
    return combineLatest([this.#proofs$$, this.#transactions$$]).pipe(
      map(([proofs, transactions]) => ({
        balance: _.sumBy(proofs, "amount"),
        proofs,
        mintUrl: this.#mint.mintUrl,
        transactions,
      }))
    );
  }

  /**
   * Function that will add funds to the wallet. Receive can either be in the form of an ecash token
   * or requesting a lightning invoice. The latter is done by "minting" the tokens.
   * @param payload
   * @returns void if receiving ecash, or a string if receiving lightning
   */
  async receive(payload: ReceivePayload, track = true) {
    if (payload.type === "ecash") {
      await this.#receiveEcash(payload.token);
    } else {
      return await this.#receiveLightning(payload.amount, track);
    }
  }

  /**
   * Function that will send funds from the wallet. Sending can either be in the form of an ecash token
   * or paying a lightning invoice.
   * @param payload
   * @returns void if sending lightning, or the encoded token if sending ecash
   */
  async send(payload: SendPayload) {
    if (payload.type === "ecash") {
      return await this.#sendEcash(payload.amount);
    } else {
      return await this.#sendLightning(payload.pr);
    }
  }

  async getFee(pr: string) {
    return this.#wallet.getFee(pr);
  }

  prune({
    paid = true,
    pending = false,
  }: {
    paid?: boolean;
    pending?: boolean;
  }) {
    const paidT = Object.values(this.#transactions).filter((t) => t.isPaid);
    const pendingT = Object.values(this.#transactions).filter((t) => !t.isPaid);
    const newTransactions = { ...this.#transactions };
    if (paid) {
      paidT.forEach((t) => {
        if (isLightningTransaction(t)) {
          delete newTransactions[t.pr];
        }
        if (isEcashTransaction(t)) {
          delete newTransactions[t.token];
        }
      });
    }
    if (pending) {
      pendingT.forEach((t) => {
        if (isLightningTransaction(t)) {
          const sub = this.#subscriptions.get(t.pr);
          sub?.unsubscribe();
          delete newTransactions[t.pr];
        }
        if (isEcashTransaction(t)) {
          const sub = this.#subscriptions.get(t.token);
          sub?.unsubscribe();
          delete newTransactions[t.token];
        }
      });
    }

    this.#transactions$$.next(newTransactions);
  }

  /**
   * Takes an encoded token and attempts to melt it with the mint. Updates the wallet state with new proofs
   * TODO: Handle tokens from other mints.
   * @param token
   */
  async #receiveEcash(token: string): Promise<void> {
    const response = await this.#wallet.receive(token);
    const proofs = response.token.token.map((t) => t.proofs).flat();
    this.#proofs$$.next([...this.#proofs, ...proofs]);
  }

  /**
   * Attempts to mint tokens for the specified amount. This will return a lightning invoice
   * which can be paid to fund the wallet. Updates the wallet state with the new transaction.
   * Kicks off a worker to check if the transaction has been paid.
   * @param amount
   * @returns
   */
  async #receiveLightning(amount: number, track = true): Promise<string> {
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
    if (track) {
      const invoiceChecker$ = this.#createLightningWorker$(transaction);
      this.#transactions$$.next({
        ...this.#transactions,
        [transaction.pr]: transaction,
      });
      const sub = invoiceChecker$.subscribe((proofs) =>
        this.#handleLightningTransactionPaid(transaction, proofs)
      );
      this.#subscriptions.set(transaction.pr, sub);
    }
    return response.pr;
  }

  /**
   * Create an encoded token for the specified amount to send.
   * Kicks off a worker to check if the transaction has been spent.
   * @param amount
   * @returns
   */
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
    const sub = tokenChecker$.subscribe(() =>
      this.#handleTokenPaid(transaction)
    );
    this.#subscriptions.set(encodedToken, sub);
    return encodedToken;
  }

  /**
   * Attempts to pay a lightning invoice with the existing wallet proofs. Updates the wallet state with the new transaction.
   * @param pr
   */
  async #sendLightning(pr: string): Promise<void> {
    const fee = await this.#wallet.getFee(pr);
    const amount = getLnInvoiceAmount(pr);
    if (!amount) {
      throw new Error("Invalid invoice. No amount found");
    }
    const { returnChange, send } = await this.#wallet.send(
      amount + fee,
      this.#proofs
    );
    await this.#wallet.payLnInvoice(pr, send);
    this.#proofs$$.next(returnChange);
  }

  /**
   * Checks with the mint to see if a lightning transaction has been paid (i.e. the tokens have been minted).
   * When the transaction is paid, the wallet state is updated with the new proofs and the transaction is marked as paid.
   * @param transaction
   * @returns new proofs to add to the wallet
   */
  #createLightningWorker$({ amount, hash }: LightningTransaction) {
    return interval(this.WORKER_INTERVAL).pipe(
      switchMap(() => this.#wallet.requestTokens(amount, hash)),
      retry(),
      map((r) => r.proofs),
      take(1)
    );
  }

  /**
   * When a token is sent, a worker is created to check if the token has been spent.
   * @param param0
   * @returns
   */
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

  /**
   * Updates the wallet state with the new proofs and marks the transaction as paid.
   * @param invoice
   * @param proofs
   */
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

  /**
   * Updates the wallet state with paid transaction
   * @param param0
   * @returns
   */
  #handleTokenPaid({ token }: EcashTransaction) {
    const transaction = this.#transactions[token];
    if (!transaction) return;
    this.#transactions$$.next({
      ...this.#transactions,
      [token]: { ...transaction, isPaid: true },
    });
  }

  /**
   * If a storage provider is provided, every time the wallet state changes, it will be written to storage
   */
  #setupPersistence() {
    if (this.storage) {
      this.state$.subscribe((state) => {
        this.storage!.set(state);
      });
    }
  }

  /**
   * When the wallet first loads, if there are pending transactions in storage, it will re-create the workers
   * to check if the transactions have been paid.
   */
  #initializeWorkers() {
    const pendingLightningTransactions = Object.values(this.#transactions)
      .filter(isLightningTransaction)
      .filter((t) => !t.isPaid);
    const pendingEcashTransactions = Object.values(this.#transactions)
      .filter(isEcashTransaction)
      .filter((t) => !t.isPaid);

    pendingLightningTransactions.forEach((t) => {
      const sub = this.#createLightningWorker$(t).subscribe((proofs) =>
        this.#handleLightningTransactionPaid(t, proofs)
      );
      this.#subscriptions.set(t.pr, sub);
    });

    pendingEcashTransactions.forEach((t) => {
      const sub = this.#createEcashWorker$(t).subscribe(() =>
        this.#handleTokenPaid(t)
      );
      this.#subscriptions.set(t.token, sub);
    });
  }

  // Internal getters

  get #proofs() {
    return this.#proofs$$.getValue();
  }

  get #balance() {
    return _.sumBy(this.#proofs, "amount");
  }

  get #transactions() {
    return this.#transactions$$.getValue();
  }

  // Static functions

  static async loadFromAsyncStorage(
    mintUrl: string,
    storageProvider: AsyncStorageProvider,
    opts?: WalletConfig
  ) {
    const state = await storageProvider.get();
    const setter = {
      set: (state: WalletState) => storageProvider.set(state),
    };
    if (!state) {
      console.warn("No saved state found");
      return new Wallet(mintUrl, setter, opts);
    }
    const wallet = new Wallet(mintUrl, setter, opts, state);
    return wallet;
  }

  static loadFromSyncStorage(
    mintUrl: string,
    storageProvider: StorageProvider,
    opts?: WalletConfig
  ) {
    const state = storageProvider.get();
    const setter = {
      set: (state: WalletState) => storageProvider.set(state),
    };
    if (!state) {
      console.warn("No saved state found");
      return new Wallet(mintUrl, setter, opts);
    }
    const wallet = new Wallet(mintUrl, setter, opts, state);
    return wallet;
  }
}
