import { WalletState } from "./wallet";

export interface StorageProvider {
  get(key: string): WalletState;
  set(key: string, value: WalletState): void;
}

export class LocalStorageProvider implements StorageProvider {
  get(key: string) {
    const value = localStorage.getItem(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value);
  }
  set(key: string, value: WalletState) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
