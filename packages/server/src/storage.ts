import type { StorageProvider, WalletState } from "@cashu-wallet/core";

export class MemoryStorageProvider implements StorageProvider<WalletState> {
  state: WalletState;
  constructor(mintUrl: string) {
    this.state = {
      balance: 0,
      proofs: [],
      transactions: {},
      mintUrl,
    };
  }

  async get() {
    return this.state;
  }

  async set(value: WalletState) {
    this.state = value;
  }
}
