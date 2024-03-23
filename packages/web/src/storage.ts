import {
  parseWalletState,
  type SimpleStorageProvider,
  type WalletState,
} from "@cashu-wallet/core";

export class LocalStorageProvider implements SimpleStorageProvider {
  constructor(private readonly key: string) {}
  async get(): Promise<WalletState | null> {
    const state = localStorage.getItem(this.key);
    if (state) {
      return parseWalletState(JSON.parse(state));
    }
    return null;
  }

  async set(value: WalletState): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(value));
  }
}
