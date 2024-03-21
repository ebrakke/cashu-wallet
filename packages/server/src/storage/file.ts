import { StorageProvider, WalletState } from "@cashu-wallet/core";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

export class FileStorageProvider implements StorageProvider<WalletState> {
  #client: Low<WalletState>;
  constructor(path: string, initialState?: WalletState) {
    this.#client = new Low<WalletState>(
      new JSONFile(path),
      initialState ?? { balance: 0, proofs: [], transactions: {}, mintUrl: "" }
    );
  }

  async get() {
    await this.#client.read();
    return this.#client.data;
  }

  async set(value: WalletState) {
    this.#client.data = value;
    await this.#client.write();
  }
}
