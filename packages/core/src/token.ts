import * as v from "valibot";
import { ProofSchema } from "./proof";

const TokenEntrySchema = v.object({
  proofs: v.array(ProofSchema),
  mint: v.string([v.url()]),
});

const TokenSchema = v.object({
  token: v.array(TokenEntrySchema),
  memo: v.optional(v.string()),
});

export type Token = v.Output<typeof TokenSchema>;

export const parseToken = (t: unknown) => v.parse(TokenSchema, t);

export const getProofsFromToken = (token: Token) => {
  return token.token.map((t) => t.proofs).flat();
};

export const getTokenAmount = (token: Token) => {
  if (token.token.length === 0) {
    throw new Error("No tokens found");
  }
  return token.token.reduce(
    (acc, t) => acc + t.proofs.reduce((acc, p) => acc + p.amount, 0),
    0,
  );
};

export const getTokenMint = (token: Token) => {
  if (token.token.length === 0) {
    throw new Error("Token not found");
  }
  const mints = new Set(...token.token.map((t) => t.mint));
  if (mints.size > 1) {
    throw new Error("Multiple mints found in this token");
  }
  if (mints.size === 0) {
    throw new Error("No mints found in this token");
  }
  return Array.from(mints.values())[0];
};

export { getEncodedToken, getDecodedToken } from "@cashu/cashu-ts";
