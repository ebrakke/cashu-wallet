import {
  MultiMintWallet,
  type WalletState,
  type AsyncStorageProvider,
} from "@cashu-wallet/core";
import * as fs from "fs/promises";
import { Redis } from "ioredis";
import { REDIS_CONNECTION_STRING } from "$env/static/private";

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

class RedisStorageProvider implements AsyncStorageProvider {
  redis: Redis;
  constructor(private readonly key: string, connectionString: string) {
    this.redis = new Redis(connectionString);
  }
  async get() {
    const value = await this.redis.get(this.key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as WalletState;
  }
  async set(value: WalletState) {
    await this.redis.set(this.key, JSON.stringify(value));
  }
}

let serverWallet: MultiMintWallet | null = null;
async function getOrCreateServerWallet() {
  if (serverWallet) {
    return serverWallet;
  }
  serverWallet = new MultiMintWallet();
  // const storageProvider = new RedisStorageProvider(
  //   "server-minibits-wallet",
  //   REDIS_CONNECTION_STRING
  // );
  const storageProvider = new FileStorageProvider("server-localhost-wallet");
  await serverWallet.addWalletWithAsyncStorage(
    // "https://mint.minibits.cash/Bitcoin",
    "https://localhost:3338",
    storageProvider
  );
  // const wallet = mmWallet.getWallet("https://mint.minibits.cash/Bitcoin");
  const wallet = serverWallet.getWallet("https://localhost:3338");
  console.log("Server wallet balance: ", wallet.state.balance);
  return serverWallet;
}

export { getOrCreateServerWallet };
