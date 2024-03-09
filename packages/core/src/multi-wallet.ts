import { getDecodedToken } from "@cashu/cashu-ts";
import { BehaviorSubject } from "rxjs";
import { Wallet, type WalletConfig } from "./wallet";
import { type AsyncStorageProvider, type StorageProvider } from "./storage";
import { getTokenAmount, getTokenMint } from "./utils";

type SendEcashPayload = {
  type: "ecash";
  mintUrl: string;
  amount: number;
};
type SendLightningPayload = {
  type: "lightning";
  mintUrl: string;
  pr: string;
};
type SendPayload = SendEcashPayload | SendLightningPayload;

type ReceiveTrustPayload = {
  type: "ecash";
  strategy: "trust";
  token: string;
};

type ReceiveSwapPayload = {
  type: "ecash";
  strategy: "swap";
  token: string;
  mint: string;
};
type ReceiveLightning = {
  type: "lightning";
  mint: string;
  amount: number;
};

type ReceivePayload =
  | ReceiveTrustPayload
  | ReceiveSwapPayload
  | ReceiveLightning;

export class MultiMintWallet {
  #wallets$$: BehaviorSubject<Record<string, Wallet>> = new BehaviorSubject({});
  wallets$ = this.#wallets$$.asObservable();
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

  isTrustedMint(mint: string) {
    return !!this.#wallets[mint];
  }

  async send(payload: SendPayload) {
    const wallet = this.#wallets[payload.mintUrl];
    if (!wallet) {
      throw new Error("No wallet found for " + payload.mintUrl);
    }
    return wallet.send({ ...payload });
  }

  async receive(payload: ReceivePayload) {
    if (payload.type === "ecash") {
      if (payload.strategy === "swap") {
        return this.#receiveAndSwap(payload);
      }
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

  async #receiveAndSwap({ mint, token: encodedToken }: ReceiveSwapPayload) {
    const tokenMint = getTokenMint(getDecodedToken(encodedToken));
    if (this.isTrustedMint(tokenMint)) {
      return this.#receiveAndTrust({
        type: "ecash",
        strategy: "trust",
        token: encodedToken,
      });
    }
    const wallet = this.#wallets[mint];
    if (wallet) {
      throw new Error(`No wallet found for ${mint}`);
    }
    try {
      await MultiMintWallet.swap(encodedToken, wallet);
    } catch (e) {
      console.error(e);
      throw new Error(`Failed to receive token from ${mint}`);
    }
  }

  async #receiveAndTrust({ token }: ReceiveTrustPayload) {
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

  static async getSwapFee(token: string, to: Wallet) {
    const decodedToken = getDecodedToken(token);
    const mint = getTokenMint(decodedToken);
    const amount = getTokenAmount(decodedToken);
    const untrustedWallet = new Wallet(mint);
    const pr = await to.receive({ type: "lightning", amount });
    if (!pr) throw new Error("Failed to get swap fee");
    const fee = await untrustedWallet.getFee(pr);
    return fee;
  }

  static async swap(token: string, to: Wallet) {
    const decodedToken = getDecodedToken(token);
    const mint = getTokenMint(decodedToken);
    const amount = getTokenAmount(decodedToken);
    const fee = await MultiMintWallet.getSwapFee(token, to);
    if (amount - fee <= 0) {
      throw new Error("Amount to swap is less than or equal to the fee");
    }
    const untrustedWallet = new Wallet(mint);
    const invoice = await to.receive({
      type: "lightning",
      amount: amount - fee,
    });
    if (!invoice) throw new Error("Failed to swap");
    await untrustedWallet.receive({ type: "ecash", token });
    await untrustedWallet.send({ type: "lightning", pr: invoice });
  }

  // internal getters
  get #wallets() {
    return this.#wallets$$.getValue();
  }
}
