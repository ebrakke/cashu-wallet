import { CashuWallet, CashuMint } from "@cashu/cashu-ts";
import {
  StorageProvider,
  WalletState,
  type Wallet,
  getTokenMint,
  Token,
  getEncodedToken,
  getDecodedToken,
  createEcashTransaction,
  getLnInvoiceAmount,
  getTokenAmount,
  getProofsFromToken,
  createLightningTransaction,
} from "@cashu-wallet/core";

export class ServerWallet implements Wallet {
  #wallet: CashuWallet;
  #mint: CashuMint;
  constructor(
    public mintUrl: string,
    public storage: StorageProvider<WalletState>
  ) {
    this.#mint = new CashuMint(mintUrl);
    this.#wallet = new CashuWallet(this.#mint);
  }

  async receiveEcash(token: string) {
    const currentState = await this.storage.get();
    const decodedToken = getDecodedToken(token);
    const mintUrl = getTokenMint(decodedToken);
    if (mintUrl !== this.mintUrl) {
      throw new Error(`invalid mint ${mintUrl} for wallet ${this.mintUrl}`);
    }
    const response = await this.#wallet.receive(token);
    const proofs = response.token.token.map((t) => t.proofs).flat();
    this.storage.set({
      ...currentState!,
      proofs: [...currentState!.proofs, ...proofs],
    });
  }

  async sendEcash(amount: number) {
    const currentState = await this.storage.get();
    if (!currentState) throw new Error("No wallet state found");
    const proofs = currentState!.proofs;
    const response = await this.#wallet.send(amount, proofs);
    await this.storage.set({
      ...currentState,
      proofs: response.returnChange,
    });
    const token: Token = {
      token: [{ mint: this.mintUrl, proofs: response.send }],
    };
    const encodedToken = getEncodedToken(token);
    const transaction = createEcashTransaction({
      amount,
      token: encodedToken,
    });
    await this.storage.set({
      ...currentState,
      transactions: {
        ...currentState.transactions,
        [encodedToken]: transaction,
      },
    });
    return getEncodedToken(token);
  }

  async receiveLightning(amount: number) {
    const currentState = await this.storage.get();
    if (!currentState) throw new Error("No wallet state found");
    const invoice = await this.#wallet.requestMint(amount);
    const transaction = createLightningTransaction({
      pr: invoice.pr,
      amount,
      hash: invoice.hash,
    });
    await this.storage.set({
      ...currentState,
      transactions: {
        ...currentState.transactions,
        [invoice.pr]: transaction,
      },
    });
    return invoice.pr;
  }

  async sendLightning(pr: string) {
    const currentState = await this.storage.get();
    if (!currentState) throw new Error("No wallet state found");
    const fee = await this.#wallet.getFee(pr);
    const amount = getLnInvoiceAmount(pr);
    if (!amount) {
      throw new Error("Invalid invoice. No amount found");
    }
    const { returnChange, send } = await this.#wallet.send(
      amount + fee,
      currentState.proofs
    );
    await this.#wallet.payLnInvoice(pr, send);
    this.storage.set({
      ...currentState,
      proofs: returnChange,
    });
  }

  async swap(token: string): Promise<void> {
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

  async getSwapFee(token: string): Promise<number> {
    const currentState = await this.storage.get();
    if (!currentState) throw new Error("No wallet state found");
    const decodedToken = getDecodedToken(token);
    const mint = getTokenMint(decodedToken);
    const amount = getTokenAmount(decodedToken);
    const untrustedWallet = new CashuWallet(new CashuMint(mint));
    const invoice = await this.receiveLightning(amount);
    if (!invoice) throw new Error("Failed to get swap fee");
    const fee = await untrustedWallet.getFee(invoice);
    return fee;
  }

  getState(): Promise<WalletState | null> {
    return this.storage.get();
  }
}
