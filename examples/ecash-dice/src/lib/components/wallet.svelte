<script lang="ts">
  import {
    getDecodedToken,
    isEcashTransaction,
    isLightningTransaction,
  } from "@cashu-wallet/core";
  import type { WalletStore } from "@cashu-wallet/svelte";
  import * as QRCode from "qrcode";
  import { openModal } from "svelte-modals";
  import ScanModal from "./ScanModal.svelte";
  export let wallet: WalletStore;
  let state = wallet.state;

  let receiveAmount: number | undefined;
  let receiveToken: string | undefined;
  let sendAmount: number | undefined;
  let sendInvoice: string | undefined;
  let scan = false;

  $: pendingInvoices = Object.values($state.transactions)
    .filter(isLightningTransaction)
    .filter((ts) => ts.isPaid === false);

  $: pendingTokens = Object.values($state.transactions)
    .filter(isEcashTransaction)
    .filter((ts) => ts.isPaid === false);

  const handleScan = () => {
    openModal(ScanModal, { onScan: handleScanResult });
  };

  const handleScanResult = async (result: string) => {
    console.log(result);
    if (result.startsWith("cashu")) {
      getDecodedToken(result);
      await wallet.receiveEcash(result);
      return;
    }
    if (result.toLowerCase().startsWith("ln")) {
      await wallet.sendLightning(result);
      return;
    }
  };

  const handleReceive = async () => {
    if (receiveAmount) {
      await wallet.receiveLightning(receiveAmount);
      receiveAmount = undefined;
      return;
    }
    if (receiveToken) {
      await wallet.receiveEcash(receiveToken);
      receiveToken = "";
    }
  };

  const handleSend = async () => {
    if (sendAmount) {
      await wallet.sendEcash(sendAmount);
      sendAmount = undefined;
      return;
    }
    if (sendInvoice) {
      await wallet.sendLightning(sendInvoice);
      sendInvoice = undefined;
    }
  };

  const handleToQRCode = (text: string) => {
    scan = true;
    setTimeout(() => {
      QRCode.toCanvas(document.getElementById("qr"), text);
    }, 100);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };
</script>

<div>
  <p>Mint: {wallet.mintUrl}</p>
  <p>Balance: {$state.balance}</p>
  <div>
    <p>Receive</p>
    <button on:click={handleScan}>Scan</button>
    <form on:submit|preventDefault={handleReceive}>
      <input type="number" placeholder="sats" bind:value={receiveAmount} />
      <input type="text" placeholder="ecash" bind:value={receiveToken} />
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
            <button on:click={() => handleToQRCode(invoice.pr)}>Scan</button>
            <button on:click={() => wallet.revokeInvoice(invoice.pr)}
              >Delete</button
            >
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
            <button on:click={() => handleToQRCode(token.token)}>Scan</button>
            <button on:click={() => wallet.receiveEcash(token.token)}
              >Revoke</button
            >
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  {#if scan}
    <canvas id="qr"></canvas>
    <button on:click={() => (scan = false)}>Close</button>
  {/if}
</div>
