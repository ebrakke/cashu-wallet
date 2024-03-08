import { fromEvent } from "rxjs";
import * as QRCode from "qrcode";
import {
  Wallet,
  MultiMintWallet,
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

    <div id="wallet-2">
      <h1>Wallet 2</h1>
      <p id="wallet2-balance"></p>
      <form id="receive2">
        <input id="receive-amount2" type="number" placeholder="amount"/>
        <input id="token2" type="text" placeholder="token"/>
        <button>Receive</button>
      </form>
    </div>
    <canvas id="invoice"></canvas>
  </div>
`;

const wallet = Wallet.loadFromSyncStorage(
  // "http://localhost:3338",
  "https://mint.minibits.cash/Bitcoin",
  new LocalStorageProvider(`minibits`)
);

const mmWallet = new MultiMintWallet();
mmWallet.addWalletWithSyncStorage(
  // "http://localhost:3339",
  "https://mint.brakke.cc",
  new LocalStorageProvider(`brakke.cc`)
);

const wallet2 = mmWallet.getWallet("https://mint.brakke.cc");

// actions
const receiveFormEl = document.querySelector<HTMLFormElement>("form#receive")!;
const sendFormEl = document.querySelector<HTMLFormElement>("form#send")!;
const receive2FormEl =
  document.querySelector<HTMLFormElement>("form#receive2")!;

// state
const receiveAmountEl =
  document.querySelector<HTMLInputElement>("#receive-amount")!;
const receiveTokenEl = document.querySelector<HTMLInputElement>("#token")!;
const sendAmountEl = document.querySelector<HTMLInputElement>("#send-amount")!;
const sendInvoiceEl =
  document.querySelector<HTMLInputElement>("#send-invoice")!;
const balanceEl = document.querySelector<HTMLDivElement>("#balance")!;
const balance2El = document.querySelector<HTMLDivElement>("#wallet2-balance")!;

const receieve2TokenEl = document.querySelector<HTMLInputElement>("#token2")!;

wallet.state$.subscribe((state) => {
  balanceEl.innerHTML = `Balance: ${state.balance}`;
  const pendingTokens = Object.values(state.transactions)
    .filter(isEcashTransaction)
    .filter((t) => !t.isPaid);
  const pendingTokensEl =
    document.querySelector<HTMLDivElement>("#pending-tokens")!;
  pendingTokensEl.innerHTML = pendingTokens.map((t) => t.token).join(", ");
});

wallet2.state$.subscribe((state) => {
  console.log("STATE2", state);
  balance2El.innerHTML = `Balance: ${state.balance}`;
});

fromEvent(receive2FormEl, "submit").subscribe(async (e) => {
  e.preventDefault();
  const token = receieve2TokenEl.value;
  if (token) {
    await mmWallet.receive({
      type: "ecash_swap",
      token,
      mint: "https://mint.brakke.cc",
    });
    const wallet = mmWallet.getWallet("https://mint.brakke.cc");
    console.log("wallet", wallet.state);
  }
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
    await wallet.send({ type: "lightning", pr: invoice });
  } else {
    const token = await wallet.send({ type: "ecash", amount });
    await QRCode.toCanvas(document.getElementById("invoice"), token!);
  }
  receiveAmountEl.value = "";
  receiveTokenEl.value = "";
});
