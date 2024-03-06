import type { Proof } from "@cashu/cashu-ts";
import type { Transaction } from "./transaction";

export interface WalletState {
  balance: number;
  proofs: Proof[];
  transactions: Record<string, Transaction>;
}
