import { getDecodedToken, getEncodedToken } from "@cashu/cashu-ts";
import { BehaviorSubject } from "rxjs";
import { Wallet, type WalletConfig, getTokenAmount } from "./wallet";
import { type AsyncStorageProvider, type StorageProvider } from "./storage";

type MultiWalletSendEcashPayload = {
  type: "ecash";
  mintUrl: string;
  amount: number;
};
type MultiWalletSendLightningPayload = {
  type: "lightning";
  mintUrl: string;
  pr: string;
};
type MultiWalletSendPayload =
  | MultiWalletSendEcashPayload
  | MultiWalletSendLightningPayload;

type MultiWalletReceiveAndTrustEcashPayload = {
  type: "ecash_trust";
  token: string;
};
type MultiWalletReceiveAndSwapEcashPayload = {
  type: "ecash_swap";
  token: string;
  mint: string;
};
type MultiWalletReceiveLightningPayload = {
  type: "lightning";
  mint: string;
  amount: number;
};

type MultiWalletReceivePayload =
  | MultiWalletReceiveAndTrustEcashPayload
  | MultiWalletReceiveAndSwapEcashPayload
  | MultiWalletReceiveLightningPayload;

export class MultiMintWallet {
  #wallets$$: BehaviorSubject<Record<string, Wallet>> = new BehaviorSubject({});
  constructor(
    private readonly storageFactory?: (mintUrl: string) => StorageProvider
  ) {}

  addWalletWithSyncStorage(
    mintUrl: string,
    storage: StorageProvider,
    opts?: WalletConfig
  ) {
    const wallet = Wallet.loadFromSyncStorage(mintUrl, storage, opts);
    this.#wallets$$.next({ ...this.#wallets, [mintUrl]: wallet });
  }

  async addWalletWithAsyncStorage(
    mintUrl: string,
    storage: AsyncStorageProvider,
    opts?: WalletConfig
  ) {
    const wallet = await Wallet.loadFromAsyncStorage(mintUrl, storage, opts);
    this.#wallets$$.next({ ...this.#wallets, [mintUrl]: wallet });
  }

  getWallet(mintUrl: string) {
    return this.#wallets[mintUrl];
  }

  async send(payload: MultiWalletSendPayload) {
    const wallet = this.#wallets[payload.mintUrl];
    if (!wallet) {
      throw new Error("No wallet found for " + payload.mintUrl);
    }
    return wallet.send({ ...payload });
  }

  async receive(payload: MultiWalletReceivePayload) {
    if (payload.type === "ecash_swap") {
      return this.#receiveAndSwap(payload);
    }
    if (payload.type === "ecash_trust") {
      return this.#receiveAndTrust(payload);
    }
    if (payload.type === "lightning") {
      const wallet = this.#wallets[payload.mint];
      if (!wallet) {
        throw new Error("No wallet found for " + payload.mint);
      }
      return wallet.receive({ type: "lightning", amount: payload.amount });
    }
  }

  async #receiveAndSwap({
    mint,
    token: encodedToken,
  }: MultiWalletReceiveAndSwapEcashPayload) {
    const token = getDecodedToken(encodedToken);
    const tokenMint = token.token[0].mint;
    const untrustedWallet = new Wallet(tokenMint);
    const swapWallet = this.#wallets[mint];
    const amount = getTokenAmount(getEncodedToken(token));
    if (!this.#wallets[mint]) {
      throw new Error(`No wallet found for ${mint}`);
    }
    try {
      const invoice = await untrustedWallet.swap(amount, swapWallet);
      if (!invoice) {
        throw new Error(
          `Failed to generate invoice for ${mint} to ${mint} swap`
        );
      }
      await untrustedWallet.receive({
        type: "ecash",
        token: getEncodedToken(token),
      });
      await untrustedWallet.send({ type: "lightning", pr: invoice });
    } catch (e) {
      console.error(e);
      throw new Error(`Failed to receive token from ${mint}`);
    }
  }

  async #receiveAndTrust({ token }: MultiWalletReceiveAndTrustEcashPayload) {
    const decodedToken = getDecodedToken(token);
    const tokenMint = decodedToken.token[0].mint;
    if (this.#wallets[tokenMint]) {
      await this.#wallets[tokenMint].receive({ type: "ecash", token });
      return;
    }
    if (this.storageFactory) {
      const storage = this.storageFactory(tokenMint);
      this.addWalletWithSyncStorage(tokenMint, storage);
      const wallet = this.#wallets[tokenMint];
      await wallet.receive({ type: "ecash", token });
      return;
    }
    if (!this.storageFactory) {
      console.warn("no storage provided for wallet");
    }
  }

  // internal getters
  get #wallets() {
    return this.#wallets$$.getValue();
  }
}
