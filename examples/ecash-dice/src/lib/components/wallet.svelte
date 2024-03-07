<script lang="ts">
  import {
    isEcashTransaction,
    isLightningTransaction,
  } from "@cashu-wallet/core";
  import type { WalletStore } from "@cashu-wallet/svelte";
  export let wallet: WalletStore;
  let state = wallet.state;

  let receiveAmount: number | undefined;
  let receiveToken: string | undefined;
  let sendAmount: number | undefined;
  let sendInvoice: string | undefined;

  $: pendingInvoices = Object.values($state.transactions)
    .filter(isLightningTransaction)
    .filter((ts) => ts.isPaid === false);

  $: pendingTokens = Object.values($state.transactions)
    .filter(isEcashTransaction)
    .filter((ts) => ts.isPaid === false);

  const handleReceive = async () => {
    if (receiveAmount) {
      await wallet.receive({ type: "lightning", amount: receiveAmount });
      receiveAmount = undefined;
      return;
    }
    if (receiveToken) {
      await wallet.receive({ type: "ecash", token: receiveToken });
      receiveToken = "";
    }
  };

  const handleSend = async () => {
    if (sendAmount) {
      await wallet.send({ type: "ecash", amount: sendAmount });
      sendAmount = undefined;
      return;
    }
    if (sendInvoice) {
      await wallet.send({ type: "lightning", pr: sendInvoice });
      sendInvoice = undefined;
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };
</script>

<div>
  <span>Balance: {$state.balance}</span>
  <div>
    <p>Receive</p>
    <form on:submit|preventDefault={handleReceive}>
      <input type="number" placeholder="sats" bind:value={receiveAmount} />
      <input type="text" placeholder="ecash token" bind:value={receiveToken} />
      <button>Receive</button>
    </form>
  </div>
  <div>
    <p>Send</p>
    <form on:submit|preventDefault={handleSend}>
      <input type="number" placeholder="sats" bind:value={sendAmount} />
      <input
        type="text"
        placeholder="lightning invoice"
        bind:value={sendInvoice}
      />
      <button>Send</button>
    </form>
  </div>
  {#if pendingInvoices.length > 0}
    <div>
      <h3>Pending invoices</h3>
      <ul>
        {#each pendingInvoices as invoice}
          <li>
            <span>{invoice.amount}</span>
            <span>{invoice.pr.slice(0, 10)}...</span>
            <button on:click={() => handleCopy(invoice.pr)}>Copy</button>
            <button>Scan</button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  {#if pendingTokens.length > 0}
    <div>
      <h3>Pending tokens</h3>
      <ul>
        {#each pendingTokens as token}
          <li>
            <span>{token.amount}</span>
            <span>{token.token.slice(0, 10)}...</span>
            <button on:click={() => handleCopy(token.token)}>Copy</button>
            <button>Scan</button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
</style>
