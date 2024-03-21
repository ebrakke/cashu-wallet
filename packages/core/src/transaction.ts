import * as v from "valibot";
import { decode } from "@gandlaf21/bolt11-decode";

const EcashTransactionSchema = v.object({
  type: v.literal("ecash"),
  token: v.string([v.minLength(1)]),
  amount: v.number([v.minValue(1)]),
  date: v.optional(
    v.coerce(v.date(), (i) => new Date(i as string)),
    new Date(),
  ),
  isPaid: v.optional(v.boolean(), false),
});
export type EcashTransaction = v.Output<typeof EcashTransactionSchema>;

const LightningTransactionSchema = v.object({
  type: v.literal("lightning"),
  pr: v.string([v.minLength(1)]),
  amount: v.number([v.minValue(1)]),
  hash: v.string([v.minLength(1)]),
  date: v.optional(
    v.coerce(v.date(), (i) => new Date(i as string)),
    new Date(),
  ),
  isPaid: v.optional(v.boolean(), false),
});

export type LightningTransaction = v.Output<typeof LightningTransactionSchema>;
export const TransactionSchema = v.union([
  EcashTransactionSchema,
  LightningTransactionSchema,
]);
export type Transaction = v.Output<typeof TransactionSchema>;

export const parseTransaction = (t: unknown) => v.parse(TransactionSchema, t);

export const isLightningTransaction = (
  t: Transaction,
): t is LightningTransaction => t.type === "lightning";

export const isEcashTransaction = (t: Transaction): t is EcashTransaction =>
  t.type === "ecash";

const LightningTransactionPayloadSchema = v.omit(LightningTransactionSchema, [
  "type",
]);
type LightningTransactionPayload = v.Input<
  typeof LightningTransactionPayloadSchema
>;
export const createLightningTransaction = (
  payload: LightningTransactionPayload,
) => v.parse(LightningTransactionSchema, { type: "lightning", ...payload });

const EcashTransactionPayloadSchema = v.omit(EcashTransactionSchema, ["type"]);
type EcashTransactionPayload = v.Input<typeof EcashTransactionPayloadSchema>;
export const createEcashTransaction = (payload: EcashTransactionPayload) =>
  v.parse(EcashTransactionSchema, { type: "ecash", ...payload });

export function getLnInvoiceAmount(pr: string): number {
  const decoded = decode(pr);
  const value = decoded.sections.find((s) => s.name === "amount")?.value;
  return Math.floor(parseInt(value) / 1000);
}
