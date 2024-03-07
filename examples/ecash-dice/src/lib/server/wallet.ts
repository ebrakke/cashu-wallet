import {
  Wallet,
  type StorageProvider,
  type WalletState,
} from "@cashu-wallet/core";
import * as fs from "fs";

class FileStorageProvider implements StorageProvider {
  constructor(private readonly key: string) {}
  get() {
    if (!fs.existsSync(this.key)) {
      return null;
    }
    const value = fs.readFileSync(this.key, "utf8");
    if (!value) {
      return null;
    }
    return JSON.parse(value) as WalletState;
  }
  set(value: WalletState) {
    fs.writeFileSync(this.key, JSON.stringify(value));
  }
}

export const serverWallet = new Wallet(
  "http://localhost:3338",
  new FileStorageProvider("server-wallet.txt")
);
