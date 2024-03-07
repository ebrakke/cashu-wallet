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
import { decode } from "@gandlaf21/bolt11-decode";
import type { StorageProvider } from "./storage";
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

type ReceiveEcash = { type: "ecash"; token: string };
type ReceiveLightning = { type: "lightning"; amount: number };
export type ReceivePayload = ReceiveEcash | ReceiveLightning;

type SendEcash = { type: "ecash"; amount: number };
type SendLightning = { type: "lightning"; amount: number; pr: string };
export type SendPayload = SendEcash | SendLightning;

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
  WORKER_INTERVAL = 5000;
  constructor(mintUrl: string, private readonly storage?: StorageProvider) {
    this.#mint = new CashuMint(mintUrl);
    this.#wallet = new CashuWallet(this.#mint);
    if (this.storage) {
      this.#loadFromStorage();
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
  async receive(payload: ReceivePayload) {
    if (payload.type === "ecash") {
      await this.#receiveEcash(payload.token);
    } else {
      return await this.#receiveLightning(payload.amount);
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

  getEncodedToken(token: Token): string {
    return getEncodedToken(token);
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
    tokenChecker$.subscribe(() => this.#handleTokenPaid(transaction));
    return encodedToken;
  }

  /**
   * Attempts to pay a lightning invoice with the existing wallet proofs. Updates the wallet state with the new transaction.
   * @param pr
   */
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
   * If a storage provider is provided, everytime the wallet state changes, it will be written to storage
   */
  #setupPersistence() {
    if (this.storage) {
      this.state$.subscribe((state) => {
        this.storage!.set(state);
      });
    }
  }

  /**
   * If a storage provider is provided, the wallet state will be initialized from storage
   */
  #loadFromStorage() {
    if (this.storage) {
      const state = this.storage.get();
      if (state) {
        this.#proofs$$.next(state.proofs);
        this.#transactions$$.next(state.transactions);
      }
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
      this.#createLightningWorker$(t).subscribe((proofs) =>
        this.#handleLightningTransactionPaid(t, proofs)
      );
    });

    pendingEcashTransactions.forEach((t) => {
      this.#createEcashWorker$(t).subscribe(() => this.#handleTokenPaid(t));
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
}

export function getTokenAmount(token: string): number {
  const decoded = getDecodedToken(token);
  return decoded.token.reduce(
    (acc, t) => acc + _.sumBy(t.proofs, (p) => p.amount),
    0
  );
}
