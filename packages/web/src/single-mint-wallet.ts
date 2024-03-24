import { BehaviorSubject, map } from "rxjs";
import {
  createEcashTransaction,
  createLightningTransaction,
  isEcashTransaction,
  isLightningTransaction,
  getDecodedToken,
  getEncodedToken,
  type WalletState,
  type Wallet,
  getTokenMint,
  Token,
  getLnInvoiceAmount,
  getTokenAmount,
  Proof,
  LightningTransaction,
  EcashTransaction,
  getProofsFromToken,
  type Poller,
  RxPoller,
  type SimpleStorageProvider,
} from "@cashu-wallet/core";
import { CashuMint, CashuWallet } from "@cashu/cashu-ts";

export interface WalletOptions {
  workerInterval?: number;
  retryAttempts?: number;
  initialState?: WalletState;
}

export class SingleMintWallet implements Wallet {
  public id: string;
  public mintUrl: string;
  #storage: SimpleStorageProvider;
  #state$$: BehaviorSubject<WalletState>;
  #wallet: CashuWallet;
  #poller: Poller;
  constructor(
    id: string,
    mintUrl: string,
    storage: SimpleStorageProvider,
    opts?: WalletOptions
  ) {
    const mint = new CashuMint(mintUrl);
    this.#wallet = new CashuWallet(mint);
    this.id = id;
    this.mintUrl = mintUrl;
    this.#storage = storage;
    this.#poller = new RxPoller(
      mintUrl,
      opts?.workerInterval,
      opts?.retryAttempts
    );
    if (opts?.initialState) {
      this.#state$$ = new BehaviorSubject(opts.initialState);
    } else {
      this.#state$$ = new BehaviorSubject({
        balance: 0,
        proofs: [],
        transactions: {},
        mintUrl: mintUrl,
      } as WalletState);
    }
    this.#poller.paidNotifier$.subscribe(([invoice, proofs]) =>
      this.#handleLightningInvoicePaid([invoice, proofs])
    );
    this.#poller.spentNotifier$.subscribe((txns) =>
      this.#handleProofsSpent(txns)
    );

    this.state$.subscribe((state) => this.#storage.set(state));
  }

  /**
   * Returns a snapshot of the current wallet state
   */
  get state() {
    const currentState = this.#state$$.getValue();
    return {
      ...currentState,
      balance: currentState.proofs
        .map((p) => p.amount)
        .reduce((a, b) => a + b, 0),
    };
  }

  /**
   * Returns an observable of the wallet state
   */
  get state$() {
    return this.#state$$.asObservable().pipe(
      map((s) => ({
        ...s,
        balance: s.proofs.map((p) => p.amount).reduce((a, b) => a + b, 0),
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
    const decodedToken = getDecodedToken(token);
    const mintUrl = getTokenMint(decodedToken);
    if (mintUrl !== this.mintUrl) {
      throw new Error(`invalid mint ${mintUrl} for wallet ${this.mintUrl}`);
    }
    const response = await this.#wallet.receive(token);
    if (response.tokensWithErrors) {
      console.error(
        `failed to receive token: ${response.tokensWithErrors.token.join(", ")}`
      );
      throw new Error("Failed to receive token");
    }
    const proofs = response.token.token.map((t) => t.proofs).flat();
    this.#state$$.next({
      ...this.state,
      proofs: [...this.state.proofs, ...proofs],
    });
  }

  /**
   * Attempts to mint tokens for the specified amount. This will return a lightning invoice
   * which can be paid to fund the wallet. Updates the wallet state with the new transaction.
   * Kicks off a worker to check if the transaction has been paid.
   * @param amount
   * @returns
   */
  async receiveLightning(amount: number): Promise<string> {
    const response = await this.#wallet.requestMint(amount);
    if (response.error) {
      console.error(`failed to fund wallet: ${response.error}`);
      throw new Error("Failed to fund wallet");
    }
    const transaction = createLightningTransaction({
      pr: response.pr,
      amount,
      hash: response.hash,
      date: new Date(),
    });
    this.#state$$.next({
      ...this.state,
      transactions: {
        ...this.state.transactions,
        [transaction.pr]: transaction,
      },
    });
    this.#poller.addLightning(transaction);
    return response.pr;
  }

  /**
   * Create an encoded token for the specified amount to send.
   * Kicks off a worker to check if the transaction has been spent.
   * @param amount
   * @returns
   */
  async sendEcash(amount: number): Promise<string> {
    const response = await this.#wallet.send(amount, this.state.proofs);
    this.#state$$.next({
      ...this.state,
      proofs: response.returnChange,
    });
    const token: Token = {
      token: [{ mint: this.mintUrl, proofs: response.send }],
    };
    const encodedToken = getEncodedToken(token);
    const transaction = createEcashTransaction({
      amount,
      token: encodedToken,
      date: new Date(),
    });
    this.#state$$.next({
      ...this.state,
      transactions: {
        ...this.state.transactions,
        [encodedToken]: transaction,
      },
    });
    this.#poller.addEcash(transaction);
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
      this.state.proofs
    );
    await this.#wallet.payLnInvoice(pr, send);
    this.#state$$.next({
      ...this.state,
      proofs: returnChange,
    });
  }

  async swap(token: string) {
    const decodedToken = getDecodedToken(token);
    const mint = getTokenMint(decodedToken);
    const amount = getTokenAmount(decodedToken);
    const fee = await this.getSwapFee(token);
    if (amount - fee <= 0) {
      throw new Error("Amount to swap is less than or equal to the fee");
    }
    const untrustedWallet = new CashuWallet(new CashuMint(mint));

    const invoice = await this.receiveLightning(amount - fee);
    if (!invoice) throw new Error("Failed to swap");
    const r = await untrustedWallet.receive(token);
    const untrustedProofs = getProofsFromToken(r.token);
    await untrustedWallet.payLnInvoice(invoice, untrustedProofs);
  }

  async getSwapFee(token: string) {
    const decodedToken = getDecodedToken(token);
    const mint = getTokenMint(decodedToken);
    const amount = getTokenAmount(decodedToken);
    const untrustedWallet = new CashuWallet(new CashuMint(mint));
    const pr = await this.receiveLightning(amount);
    if (!pr) throw new Error("Failed to get swap fee");
    const fee = await untrustedWallet.getFee(pr);
    return fee;
  }

  async checkPendingTransactions() {
    const pendingLightning = Object.values(this.state.transactions)
      .filter(isLightningTransaction)
      .filter((t) => !t.isPaid);
    const pendingEcash = Object.values(this.state.transactions)
      .filter(isEcashTransaction)
      .filter((t) => !t.isPaid);

    pendingEcash.forEach((t) => this.#poller.addEcash(t));
    pendingLightning.forEach((t) => this.#poller.addLightning(t));
    this.#poller.check();
  }

  #handleLightningInvoicePaid([transaction, proofs]: [
    LightningTransaction,
    Proof[],
  ]) {
    if (!isLightningTransaction(transaction)) {
      throw new Error("Invalid transaction type");
    }
    this.#state$$.next({
      ...this.state,
      proofs: [...this.state.proofs, ...proofs],
      transactions: {
        ...this.state.transactions,
        [transaction.pr]: { ...transaction, isPaid: true },
      },
    });
  }

  #handleProofsSpent(txns: EcashTransaction[]) {
    txns.forEach((t) => {
      const transaction = this.state.transactions[t.token];
      if (!transaction) return;
      this.#state$$.next({
        ...this.state,
        transactions: {
          ...this.state.transactions,
          [t.token]: { ...transaction, isPaid: true },
        },
      });
    });
  }

  // Static functions

  static async loadFromStorage(
    id: string,
    mintUrl: string,
    storageProvider: SimpleStorageProvider,
    opts: WalletOptions = {}
  ) {
    const state = await storageProvider.get();
    if (!state) {
      console.warn("No saved state found");
      return new SingleMintWallet(id, mintUrl, storageProvider, opts);
    }
    const wallet = new SingleMintWallet(id, mintUrl, storageProvider, {
      ...opts,
      initialState: state,
    });
    return wallet;
  }
}
