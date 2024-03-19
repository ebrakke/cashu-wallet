import * as v from "valibot";

export const ProofSchema = v.object({
  id: v.string(),
  amount: v.number(),
  secret: v.string(),
  C: v.string(),
});

export type Proof = v.Output<typeof ProofSchema>;
export const parseProof = (p: unknown) => v.parse(ProofSchema, p);
