import { Wallet, type StorageProvider } from "@cashu-wallet/core";
import * as fs from "fs";

class FileStorageProvider implements StorageProvider {
  get(key: string) {
    if (!fs.existsSync(key)) {
      return null;
    }
    const value = fs.readFileSync(key, "utf8");
    if (!value) {
      return null;
    }
    return JSON.parse(value);
  }
  set(key: string, value: any) {
    fs.writeFileSync(key, JSON.stringify(value));
  }
}

export const serverWallet = new Wallet(
  "server-wallet",
  "http://localhost:3338",
  new FileStorageProvider(),
  "server-wallet.txt"
);
