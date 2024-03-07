import {
  Wallet,
  type StorageProvider,
  type WalletState,
} from "@cashu-wallet/core";
import * as fs from "fs/promises";

class FileStorageProvider implements StorageProvider {
  constructor(private readonly key: string) {}
  async get() {
    try {
      await fs.stat(this.key);
    } catch {
      return null;
    }
    if (!fs.stat(this.key)) {
      return null;
    }
    const value = await fs.readFile(this.key, "utf8");
    if (!value) {
      return null;
    }
    return JSON.parse(value) as WalletState;
  }
  async set(value: WalletState) {
    return fs.writeFile(this.key, JSON.stringify(value));
  }
}

export const serverWallet = new Wallet(
  "http://localhost:3338",
  new FileStorageProvider("server-wallet.txt")
);
