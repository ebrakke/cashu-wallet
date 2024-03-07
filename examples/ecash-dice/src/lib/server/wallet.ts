import { Wallet } from "@cashu-wallet/core";

export const serverWallet = new Wallet(
  "server-wallet",
  "http://localhost:3338"
);
