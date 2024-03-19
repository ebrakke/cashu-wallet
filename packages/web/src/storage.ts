import type { StorageProvider, WalletState } from "@cashu-wallet/core";

export class LocalStorageProvider implements StorageProvider<WalletState> {
  constructor(private readonly key: string) {}
  async get() {
    const value = localStorage.getItem(this.key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as WalletState;
  }
  async set(value: WalletState) {
    localStorage.setItem(this.key, JSON.stringify(value));
  }
}
