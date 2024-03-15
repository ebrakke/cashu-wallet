import { Token, getDecodedToken } from "@cashu/cashu-ts";
import { decode } from "@gandlaf21/bolt11-decode";
import { EcashTransaction } from "./transaction";

export function getTokenMint(token: Token) {
  if (token.token.length === 0) {
    throw new Error("Token not found");
  }
  return token.token[0].mint;
}

export function getTokenAmount(token: Token) {
  if (token.token.length === 0) {
    throw new Error("Token not found");
  }
  return token.token.reduce(
    (acc, t) => acc + t.proofs.reduce((acc, p) => acc + p.amount, 0),
    0,
  );
}

export function getLnInvoiceAmount(pr: string): number {
  const decoded = decode(pr);
  const value = decoded.sections.find((s) => s.name === "amount")?.value;
  return Math.floor(parseInt(value) / 1000);
}

export function getProofsFromTransaction(token: EcashTransaction) {
  return getDecodedToken(token.token)
    .token.map((t) => t.proofs)
    .flat();
}
