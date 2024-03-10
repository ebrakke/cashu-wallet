<script lang="ts">
  import type { WalletStore } from "@cashu-wallet/svelte";
  import * as QRCode from "qrcode";

  export let wallet: WalletStore;
  export let onFinish: () => void;

  let state:
    | "input"
    | "waitForPayment"
    | "tokenCreated"
    | "paymentSucceeded"
    | "tokenClaimed" = "input";
  let walletState = wallet.state;
  let token: string | undefined;
  $: {
    if (state === "tokenCreated" && token) {
      const transaction = $walletState.transactions[token];
      if (transaction?.isPaid) {
        state = "tokenClaimed";
      }
    }
  }

  const handleSend = async (e: Event) => {
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const amount = formData.get("amount") as string;
    const invoice = formData.get("invoice") as string;
    if (amount) {
      token = await wallet.sendEcash(Number(amount));
      state = "tokenCreated";
      handleToken();
    } else if (invoice) {
      await wallet.sendLightning(invoice);
      state = "paymentSucceeded";
    }
  };

  const handleToken = async () => {
    if (token) {
      setTimeout(async () => {
        const qr = document.getElementById("qr") as HTMLCanvasElement;
        QRCode.toCanvas(qr, token!);
      }, 100);
    }
  };
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };
</script>

{#if state === "input"}
  <form on:submit|preventDefault={handleSend}>
    <div class="mt-2 flex flex-col gap-y-2">
      <div class="flex flex-col">
        <label for="token">Lightning Invoice</label>
        <input name="invoice" type="text" />
      </div>
      <p class="self-center">Or</p>
      <div class="flex flex-col">
        <label for="amount">Amount</label>
        <input name="amount" type="number" />
      </div>
      <button>Send</button>
      <button type="button" on:click={onFinish}>Cancel</button>
    </div>
  </form>
{/if}
<div class="flex flex-col items-center gap-y-1">
  {#if state === "tokenCreated" && token}
    <p>Share this token</p>
    <div class="flex items-center gap-x-2">
      <span>{token.slice(0, 20)}...</span>
      <button on:click={() => handleCopy(token ?? "")}>Copy</button>
    </div>
    <canvas id="qr"></canvas>
    <button on:click={onFinish}>Cancel</button>
  {/if}
  {#if state === "paymentSucceeded"}
    <p>Payment Sent!</p>
    <button on:click={onFinish}>Close</button>
  {/if}
  {#if state === "tokenClaimed"}
    <p>Token Claimed!</p>
    <button on:click={onFinish}>Close</button>
  {/if}
</div>
