import { fromEvent } from "rxjs";
import * as QRCode from "qrcode";
import {
  Wallet,
  LocalStorageProvider,
  isEcashTransaction,
} from "@cashu-wallet/core";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <form id="receive">
      <input id="receive-amount" type="number" placeholder="amount"/>
      <input id="token" type="text" placeholder="token"/>
      <button>Receive</button>
    </form>
    <form id="send">
      <input id="send-amount" type="number" placeholder="amount"/>
      <input id="send-invoice" type="text" placeholder="bolt11 invoice"/>
      <button id="send">Send</button>
    </form>
    <div id="balance">Balance: 0</div>
    <div id="pending-tokens"></div>
    <canvas id="invoice"></canvas>
  </div>
`;

const wallet = new Wallet(
  "my-wallet",
  "http://localhost:3338",
  new LocalStorageProvider()
);
// actions
const receiveFormEl = document.querySelector<HTMLFormElement>("form#receive")!;
const sendFormEl = document.querySelector<HTMLFormElement>("form#send")!;

// state
const receiveAmountEl =
  document.querySelector<HTMLInputElement>("#receive-amount")!;
const receiveTokenEl = document.querySelector<HTMLInputElement>("#token")!;
const sendAmountEl = document.querySelector<HTMLInputElement>("#send-amount")!;
const sendInvoiceEl =
  document.querySelector<HTMLInputElement>("#send-invoice")!;
const balanceEl = document.querySelector<HTMLDivElement>("#balance")!;

wallet.state$.subscribe((state) => {
  balanceEl.innerHTML = `Balance: ${state.balance}`;
  const pendingTokens = Object.values(state.transactions)
    .filter(isEcashTransaction)
    .filter((t) => !t.isPaid);
  const pendingTokensEl =
    document.querySelector<HTMLDivElement>("#pending-tokens")!;
  pendingTokensEl.innerHTML = pendingTokens.map((t) => t.token).join(", ");
});

fromEvent(receiveFormEl, "submit").subscribe(async (e) => {
  e.preventDefault();
  const amount = receiveAmountEl.valueAsNumber;
  const token = receiveTokenEl.value;
  if (token) {
    await wallet.receive({ type: "ecash", token });
  } else {
    const invoice = await wallet.receive({ type: "lightning", amount });
    await QRCode.toCanvas(document.getElementById("invoice"), invoice!);
  }
  receiveAmountEl.value = "";
});

fromEvent(sendFormEl, "submit").subscribe(async (e) => {
  e.preventDefault();
  const amount = sendAmountEl.valueAsNumber;
  const invoice = sendInvoiceEl.value;
  if (invoice) {
    await wallet.send({ type: "lightning", amount, pr: invoice });
  } else {
    const token = await wallet.send({ type: "ecash", amount });
    await QRCode.toCanvas(document.getElementById("invoice"), token!);
  }
  receiveAmountEl.value = "";
  receiveTokenEl.value = "";
});
