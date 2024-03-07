import {
  Wallet,
  type WalletState,
  type AsyncStorageProvider,
} from "@cashu-wallet/core";
import * as fs from "fs/promises";

class FileStorageProvider implements AsyncStorageProvider {
  constructor(private readonly key: string) {}
  async get() {
    try {
      await fs.stat(this.key);
    } catch (e) {
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

let serverWallet: Wallet | null = null;
async function getOrCreateServerWallet() {
  if (serverWallet) {
    return serverWallet;
  }
  const storageProvider = new FileStorageProvider("server-wallet-real.txt");
  serverWallet = await Wallet.loadFromAsyncStorage(
    "https://mint.brakke.cc",
    storageProvider
  );
  console.log("Server wallet balance: ", serverWallet.state.balance);
  return serverWallet;
}

export { getOrCreateServerWallet };
