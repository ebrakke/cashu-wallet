export interface Wallet {
  receiveEcash(token: string): Promise<void>;
  sendEcash(amount: number): Promise<string>;
  receiveLightning(amount: number): Promise<string>;
  sendLightning(invoice: string): Promise<void>;
  swap(token: string): Promise<void>;
  getSwapFee(token: string): Promise<number>;
}
