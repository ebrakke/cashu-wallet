import * as v from "valibot";
import { TransactionSchema } from "./transaction";
import { ProofSchema } from "./proof";

const WalletStateSchema = v.object({
  balance: v.number(),
  mintUrl: v.string([v.url()]),
  proofs: v.array(ProofSchema),
  transactions: v.record(v.string(), TransactionSchema),
});

export const parseWalletState = (s: unknown) => v.parse(WalletStateSchema, s);

export type WalletState = v.Output<typeof WalletStateSchema>;
