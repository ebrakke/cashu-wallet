import type { WalletState } from "./state";

export interface StorageProvider {
  get(): WalletState | null;
  set(value: WalletState): void;
}

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly key: string) {}
  get() {
    const value = localStorage.getItem(this.key);
    if (!value) {
      return null;
    }
    return JSON.parse(value);
  }
  set(value: WalletState) {
    localStorage.setItem(this.key, JSON.stringify(value));
  }
}
