import type { WalletState } from "./state";

export interface StorageProvider {
  get(): Promise<WalletState | null>;
  set(value: WalletState): Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly key: string) {}
  async get() {
    const value = localStorage.getItem(this.key);
    if (!value) {
      return null;
    }
    return JSON.parse(value);
  }
  async set(value: WalletState) {
    localStorage.setItem(this.key, JSON.stringify(value));
  }
}
