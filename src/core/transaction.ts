type EcashTransaction = {
  type: "ecash";
  token: string;
  amount: number;
  date: Date;
  isPaid: boolean;
};
type LightningTransaction = {
  type: "lightning";
  pr: string;
  amount: number;
  hash: string;
  date: Date;
  isPaid: boolean;
};

export type Transaction = EcashTransaction | LightningTransaction;

export const isLightningTransaction = (
  t: Transaction
): t is LightningTransaction => t.type === "lightning";

export const isEcashTransaction = (t: Transaction): t is EcashTransaction =>
  t.type === "ecash";

type LightningTransactionPayload = {
  pr: string;
  amount: number;
  hash: string;
  date?: Date;
  isPaid?: boolean;
};
export const createLightningTransaction = ({
  pr,
  amount,
  hash,
  date = new Date(),
  isPaid = false,
}: LightningTransactionPayload): LightningTransaction => ({
  type: "lightning",
  pr,
  amount,
  hash,
  date,
  isPaid,
});

type EcashTransactionPayload = {
  token: string;
  amount: number;
  date?: Date;
  isPaid?: boolean;
};

export const createEcashTransaction = ({
  token,
  amount,
  date = new Date(),
  isPaid = false,
}: EcashTransactionPayload): EcashTransaction => ({
  type: "ecash",
  token,
  amount,
  date,
  isPaid,
});
