import type { WalletState } from "./state";

export interface StorageGetter {
  get(): WalletState | null;
}

export interface StorageSetter {
  set(value: WalletState): void;
}

export interface StorageProvider extends StorageGetter, StorageSetter {}

export interface AsyncStorageProvider {
  get(): Promise<WalletState | null>;
  set(value: WalletState): Promise<void>;
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
