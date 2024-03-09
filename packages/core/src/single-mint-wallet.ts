import {
  BehaviorSubject,
  Observable,
  Subscription,
  combineLatest,
  filter,
  interval,
  map,
  retry,
  switchMap,
  take,
} from "rxjs";
import {
  EcashTransaction,
  LightningTransaction,
  Transaction,
  createEcashTransaction,
  createLightningTransaction,
  isEcashTransaction,
  isLightningTransaction,
} from "./transaction";
import {
  AsyncStorageProvider,
  StorageProvider,
  StorageSetter,
} from "./storage";
import {
  CashuMint,
  CashuWallet,
  getDecodedToken,
  getEncodedToken,
  type Token,
  type Proof,
} from "@cashu/cashu-ts";
import { getLnInvoiceAmount, getTokenAmount, getTokenMint } from "./utils";

export interface WalletState {
  balance: number;
  proofs: Proof[];
  transactions: Record<string, Transaction>;
}

interface _SingleMintWallet {
  receiveLightning: (amount: number) => Promise<string>;
  sendLightning: (invoice: string) => Promise<void>;
  receiveEcash: (token: string) => Promise<void>;
  sendEcash: (amount: number) => Promise<string>;
  swap: (token: string) => Promise<void>;
  getSwapFee: (token: string) => Promise<number>;
  getFee: (pr: string) => Promise<number>;
  state: WalletState;
  state$: Observable<WalletState>;
}

export interface WalletOptions {
  workerInterval?: number;
  initialState?: WalletState;
}

export class SingleMintWallet implements _SingleMintWallet {
  public id: string;
  public mintUrl: string;
  #storage: StorageSetter<WalletState>;
  #proofs$$: BehaviorSubject<Proof[]> = new BehaviorSubject([] as Proof[]);
  #transactions$$: BehaviorSubject<Record<string, Transaction>> =
    new BehaviorSubject({});
  #subscriptions: Map<string, Subscription> = new Map();
  #wallet: CashuWallet;
  WORKER_INTERVAL: number;
  constructor(
    id: string,
    mintUrl: string,
    storage: StorageSetter<WalletState>,
    opts?: WalletOptions
  ) {
    const mint = new CashuMint(mintUrl);
    this.#wallet = new CashuWallet(mint);
    this.id = id;
    this.mintUrl = mintUrl;
    this.#storage = storage;
    this.WORKER_INTERVAL = opts?.workerInterval || 1000;
    if (opts?.initialState) {
      this.#proofs$$.next(opts.initialState.proofs);
      this.#transactions$$.next(opts.initialState.transactions);
    }
    this.#setupPersistence();
    this.#initializeWorkers();
  }

  /**
   * Returns a snapshot of the current wallet state
   */
  get state() {
    return {
      balance: this.#balance,
      proofs: this.#proofs,
      transactions: this.#transactions,
      mintUrl: this.mintUrl,
    };
  }

  /**
   * Returns an observable of the wallet state
   */
  get state$() {
    return combineLatest([this.#proofs$$, this.#transactions$$]).pipe(
      map(([proofs, transactions]) => ({
        balance: proofs.reduce((acc, p) => acc + p.amount, 0),
        proofs,
        mintUrl: this.mintUrl,
        transactions,
      }))
    );
  }
  /**
   *
   * Takes an encoded token and attempts to melt it with the mint. Updates the wallet state with new proofs
   * TODO: Handle tokens from other mints.
   * @param token
   */
  async receiveEcash(token: string): Promise<void> {
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
  async receiveLightning(amount: number, track = true): Promise<string> {
    const response = await this.#wallet.requestMint(amount);
    if (response.error) {
      console.error(`failed to fund wallet: ${response.error}`);
      throw new Error("Failed to fund wallet");
    }
    if (track) {
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
  async sendEcash(amount: number): Promise<string> {
    const response = await this.#wallet.send(amount, this.#proofs);
    this.#proofs$$.next(response.returnChange);
    const token: Token = {
      token: [{ mint: this.mintUrl, proofs: response.send }],
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
  async sendLightning(pr: string): Promise<void> {
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

  async getFee(pr: string) {
    return this.#wallet.getFee(pr);
  }

  async swap(token: string) {
    const decodedToken = getDecodedToken(token);
    const mint = getTokenMint(decodedToken);
    const amount = getTokenAmount(decodedToken);
    const fee = await this.getSwapFee(token);
    if (amount - fee <= 0) {
      throw new Error("Amount to swap is less than or equal to the fee");
    }
    const untrustedWallet = new SingleMintWallet("untrusted", mint, {
      set: () => {},
    });
    const invoice = await this.receiveLightning(amount - fee);
    if (!invoice) throw new Error("Failed to swap");
    await untrustedWallet.receiveEcash(token);
    await untrustedWallet.sendLightning(invoice);
  }

  async getSwapFee(token: string) {
    const decodedToken = getDecodedToken(token);
    const mint = getTokenMint(decodedToken);
    const amount = getTokenAmount(decodedToken);
    const untrustedWallet = new SingleMintWallet("untrusted", mint, {
      set: () => {},
    });
    const pr = await this.receiveLightning(amount);
    if (!pr) throw new Error("Failed to get swap fee");
    const fee = await untrustedWallet.getFee(pr);
    return fee;
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
    this.state$.subscribe((state) => {
      this.#storage!.set(state);
    });
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

  // Static functions

  static async loadFromAsyncStorage(
    id: string,
    mintUrl: string,
    storageProvider: AsyncStorageProvider<WalletState>,
    opts: { workerInterval?: number } = {}
  ) {
    const state = await storageProvider.get();
    const setter = {
      set: (state: WalletState) => storageProvider.set(state),
    };
    if (!state) {
      console.warn("No saved state found");
      return new SingleMintWallet(id, mintUrl, setter, opts);
    }
    const wallet = new SingleMintWallet(id, mintUrl, setter, {
      ...opts,
      initialState: state,
    });
    return wallet;
  }

  static loadFromSyncStorage(
    id: string,
    mintUrl: string,
    storageProvider: StorageProvider<WalletState>,
    opts: { workerInterval?: number } = {}
  ) {
    const state = storageProvider.get();
    const setter = {
      set: (state: WalletState) => storageProvider.set(state),
    };
    if (!state) {
      console.warn("No saved state found");
      return new SingleMintWallet(id, mintUrl, setter, opts);
    }
    const wallet = new SingleMintWallet(id, mintUrl, setter, {
      ...opts,
      initialState: state,
    });
    return wallet;
  }

  // Internal getters

  get #proofs() {
    return this.#proofs$$.getValue();
  }

  get #balance() {
    return this.#proofs.reduce((acc, p) => acc + p.amount, 0);
  }

  get #transactions() {
    return this.#transactions$$.getValue();
  }
}
