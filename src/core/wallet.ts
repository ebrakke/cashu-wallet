import {
  Observable,
  interval,
  switchMap,
  map,
  take,
  catchError,
  EMPTY,
  BehaviorSubject,
  combineLatest,
  filter,
  tap,
  retry,
} from "rxjs";
import _ from "lodash";
import {
  CashuMint,
  CashuWallet,
  type Proof,
  getEncodedToken,
  Token,
  getDecodedToken,
} from "@cashu/cashu-ts";
import { Invoice } from "./invoice";
import { decode } from "@gandlaf21/bolt11-decode";
import type { StorageProvider } from "./storage";

export interface WalletState {
  balance: number;
  proofs: Proof[];
}

type EcashToken = { type: "ecash"; token: string };
type Bolt11Invoice = { type: "lightning"; amount: number };
type ReceivePayload = EcashToken | Bolt11Invoice;

type SendToken = { type: "cashu"; amount: number };
type SendLightning = { type: "lightning"; amount: number; pr: string };
type SendPayload = SendToken | SendLightning;

interface IWallet {
  state$: Observable<WalletState>;
  state: WalletState;
  receive(payload: ReceivePayload): Promise<void | string>;
  send(payload: SendPayload): Promise<string | void>;
}

/**
 * Single mint wallet
 */
export class Wallet implements IWallet {
  #mint: CashuMint;
  #wallet: CashuWallet;
  #proofs$$: BehaviorSubject<Proof[]> = new BehaviorSubject([] as Proof[]);
  #pending$$: BehaviorSubject<Token[]> = new BehaviorSubject([] as Token[]);
  #paid$$: BehaviorSubject<Token[]> = new BehaviorSubject([] as Token[]);
  #invoices$$: BehaviorSubject<Record<string, Invoice>> = new BehaviorSubject(
    {}
  );
  STORAGE_KEY: string;
  constructor(
    id: string,
    mintUrl: string,
    private readonly storage?: StorageProvider
  ) {
    this.STORAGE_KEY = `wallet-${mintUrl}-${id}`;
    this.#mint = new CashuMint(mintUrl);
    this.#wallet = new CashuWallet(this.#mint);
    if (this.storage) {
      this.#loadFromStorage();
      this.#setupPersistence();
    }
  }

  get state() {
    return { balance: this.#balance, proofs: this.#proofs };
  }

  get state$() {
    return combineLatest([this.#proofs$$]).pipe(
      map(([proofs]) => ({ balance: _.sumBy(proofs, "amount"), proofs }))
    );
  }

  async receive(payload: ReceivePayload) {
    if (payload.type === "ecash") {
      await this.#receiveEcash(payload.token);
    } else {
      return await this.#receiveLightning(payload.amount);
    }
  }

  async send(payload: SendPayload) {
    console.log("PAYLOAD", payload);
    if (payload.type === "cashu") {
      return await this.#sendEcash(payload.amount);
    } else {
      return await this.#sendLightning(payload.pr);
    }
  }

  async #receiveEcash(token: string): Promise<void> {
    const response = await this.#wallet.receive(token);
    const proofs = response.token.token.map((t) => t.proofs).flat();
    this.#proofs$$.next([...this.#proofs, ...proofs]);
  }

  async #receiveLightning(amount: number): Promise<string> {
    const response = await this.#wallet.requestMint(amount);
    if (response.error) {
      console.error(`failed to fund wallet: ${response.error}`);
      throw new Error("Failed to fund wallet");
    }
    const invoice: Invoice = {
      amount,
      pr: response.pr,
      paid: false,
      hash: response.hash,
      date: new Date(),
    };
    const invoiceChecker$ = this.#createInvoiceChecker$(invoice);
    this.#invoices$$.next({
      ...this.#invoices,
      [response.pr]: invoice,
    });
    invoiceChecker$.subscribe((proofs) =>
      this.#handleInvoicePaid(invoice, proofs)
    );
    return response.pr;
  }

  async #sendEcash(amount: number): Promise<string> {
    const response = await this.#wallet.send(amount, this.#proofs);
    console.log(response);
    this.#proofs$$.next(response.returnChange);
    const token: Token = {
      token: [{ mint: this.#mint.mintUrl, proofs: response.send }],
    };
    this.#pending$$.next([...this.#pending, token]);
    const encodedToken = getEncodedToken(token);
    const tokenChecker$ = this.#createTokenChecker$({
      token: [{ mint: this.#mint.mintUrl, proofs: response.send }],
    });
    tokenChecker$.subscribe(() => this.#handleTokenPaid(token));
    return encodedToken;
  }

  async #sendLightning(pr: string): Promise<void> {
    const fee = await this.#wallet.getFee(pr);
    const decoded = decode(pr);
    const amount = decoded.sections.find((s) => s.name === "amount")?.value;
    if (!amount) {
      throw new Error("Invalid invoice. No amount found");
    }
    const sats = Math.floor(parseInt(amount) / 1000);
    const { returnChange, send } = await this.#wallet.send(
      sats + fee,
      this.#proofs
    );
    await this.#wallet.payLnInvoice(pr, send);
    this.#proofs$$.next(returnChange);
  }

  async checkTokenStatus(token: string) {
    const proofs = getDecodedToken(token)
      .token.map((t) => t.proofs)
      .flat();
    const response = await this.#wallet.checkProofsSpent(proofs);
    if (response.length === proofs.length) {
      this.#handleTokenPaid(getDecodedToken(token));
      return true;
    }
    return false;
  }

  getEncodedToken(token: Token): string {
    return getEncodedToken(token);
  }

  #createInvoiceChecker$(invoice: Invoice) {
    return interval(3000).pipe(
      switchMap(() => this.#wallet.requestTokens(invoice.amount, invoice.hash)),
      retry(),
      map((r) => r.proofs),
      take(1)
    );
  }

  #createTokenChecker$(token: Token): Observable<boolean> {
    const proofs = token.token.map((t) => t.proofs).flat();
    return interval(5000).pipe(
      switchMap(() => this.#wallet.checkProofsSpent(proofs)),
      retry(),
      filter((s) => s.length === proofs.length),
      map(() => true),
      take(1)
    );
  }

  #handleInvoicePaid(invoice: Invoice, proofs: Proof[]) {
    this.#proofs$$.next([...this.#proofs, ...proofs]);
    this.#invoices$$.next({
      ...this.#invoices,
      [invoice.pr]: { ...invoice, paid: true },
    });
  }

  #handleTokenPaid(token: Token) {
    this.#pending$$.next(
      this.#pending.filter((t) => getEncodedToken(t) !== getEncodedToken(token))
    );
    this.#paid$$.next([...this.#paid, token]);
  }

  #setupPersistence() {
    if (this.storage) {
      this.state$.subscribe((state) => {
        this.storage!.set(this.STORAGE_KEY, state);
      });
    }
  }

  #loadFromStorage() {
    if (this.storage) {
      const state = this.storage.get(this.STORAGE_KEY);
      if (state) {
        this.#proofs$$.next(state.proofs);
      }
    }
  }

  get #proofs() {
    return this.#proofs$$.getValue();
  }

  get #invoices() {
    return this.#invoices$$.getValue();
  }

  get #pending() {
    return this.#pending$$.getValue();
  }

  get #paid() {
    return this.#paid$$.getValue();
  }

  get #balance() {
    return _.sumBy(this.#proofs, "amount");
  }
}
