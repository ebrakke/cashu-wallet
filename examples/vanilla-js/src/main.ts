import Alpine from "alpinejs";
import { SingleMintWallet, LocalStorageProvider } from "@cashu-wallet/web";

const init = async () => {
  const wallet = await SingleMintWallet.loadFromStorage(
    "local",
    "http://localhost:33338",
    new LocalStorageProvider("local-1"),
    { workerInterval: 5000, retryAttempts: 20 }
  );
  Alpine.data("wallet", () => ({
    init() {
      wallet.state$.subscribe((state) => {
        this.state = state;
        if (this.token && state.transactions[this.token]?.isPaid) {
          this.token = "";
        }
        if (this.invoice && state.transactions[this.invoice]?.isPaid) {
          this.invoice = "";
        }
      });
    },
    state: wallet.state,
    token: "",
    invoice: "",
    async receive(amount?: number, ecash?: string) {
      if (amount) {
        this.invoice = await wallet.receiveLightning(amount);
        return;
      }
      if (ecash) {
        await wallet.receiveEcash(ecash);
      }
    },
    async send(amount: number) {
      this.token = await wallet.sendEcash(amount);
    },
  }));
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div x-data="wallet">
    <h1 x-text="state.mintUrl"></h1>
    <h3 x-text="state.balance"></h3>
    <form @submit.prevent="receive($event.target.amount.valueAsNumber, $event.target.ecash.value)">
      <input type="number" name="amount" placeholder="amount"/>
      <input type="text" name="ecash" placeholder="ecash" />
      <button>Receive</button>
    </form>
    <form @submit.prevent="send($event.target.amount.valueAsNumber)">
      <input type="number" name="amount" placeholder="amount" />
      <button>Send</button>
    </form>
    <p x-text="token"></p>
    <p x-text="invoice" ></p>
    <canvas id="code"></canvas>
  </div>
`;
};
Alpine.start();
init();
