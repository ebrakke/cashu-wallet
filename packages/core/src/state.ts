import type { Proof } from "@cashu/cashu-ts";
import type { Transaction } from "./transaction";

export interface WalletState {
  balance: number;
  mintUrl: string;
  proofs: Proof[];
  transactions: Record<string, Transaction>;
}
