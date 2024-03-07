import {
  Wallet,
  type WalletState,
  type AsyncStorageProvider,
} from "@cashu-wallet/core";
import * as fs from "fs/promises";
import { Redis, type RedisOptions } from "ioredis";

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
  constructor(private readonly key: string, redisOptions: RedisOptions) {
    this.redis = new Redis(redisOptions);
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

let serverWallet: Wallet | null = null;
async function getOrCreateServerWallet() {
  if (serverWallet) {
    return serverWallet;
  }
  const storageProvider = new RedisStorageProvider(
    "server-minibits-wallet",
    {}
  );
  serverWallet = await Wallet.loadFromAsyncStorage(
    "https://mint.minibits.cash/Bitcoin",
    storageProvider
  );
  console.log("Server wallet balance: ", serverWallet.state.balance);
  return serverWallet;
}

export { getOrCreateServerWallet };
