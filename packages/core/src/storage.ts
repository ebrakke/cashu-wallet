import { type Transaction } from "./transaction";
import { WalletState } from "./state";
import { Proof } from "./proof";

export interface SimpleStorageProvider {
  get: () => Promise<WalletState | null>;
  set: (value: WalletState) => Promise<void>;
}

export interface StorageProvider {
  loadState(): Promise<WalletState | null>;
  addTransaction(transaction: Transaction): Promise<void>;
  updateTransaction(transaction: Transaction): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  addProofs(proofs: Proof[]): Promise<void>;
  updateProofs(proofs: Proof[]): Promise<void>;
}
