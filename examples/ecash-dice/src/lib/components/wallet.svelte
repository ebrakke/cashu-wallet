<script lang="ts">
  import type { WalletStore } from "@cashu-wallet/svelte";
  export let wallet: WalletStore;
  let state = wallet.state;

  let receiveAmount: number;
  let receiveToken: string;
  let sendAmount: number;
  let sendInvoice: string;

  const handleReceive = async () => {
    if (receiveAmount) {
      await wallet.receive({ type: "lightning", amount: receiveAmount });
      receiveAmount = 0;
      return;
    }
    if (receiveToken) {
      await wallet.receive({ type: "ecash", token: receiveToken });
      receiveToken = "";
    }
  };

  const handleSend = async () => {};
</script>

<div>
  <span>Balance: {$state.balance}</span>
  <div>
    <p>Receive</p>
    <input type="number" placeholder="sats" bind:value={receiveAmount} />
    <input type="text" placeholder="ecash token" bind:value={receiveToken} />
    <button on:click={handleReceive}>Receive</button>
  </div>
  <div>
    <p>Send</p>
    <input type="number" placeholder="sats" bind:value={sendAmount} />
    <input
      type="text"
      placeholder="lightning invoice"
      bind:value={sendInvoice}
    />
    <button on:click={handleSend}>Send</button>
  </div>
</div>

<style>
</style>
