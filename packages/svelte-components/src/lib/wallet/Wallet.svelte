<script lang="ts">
  import {
    getDecodedToken,
    isEcashTransaction,
    isLightningTransaction,
  } from "@cashu-wallet/core";
  import type { WalletStore } from "@cashu-wallet/svelte";
  import * as QRCode from "qrcode";
  import ScanCode from "./ScanCode.svelte";
  export let wallet: WalletStore;
  let state = wallet.state;
  let receive = false;
  let send = false;
  let scan = false;

  $: pendingInvoices = Object.values($state.transactions)
    .filter(isLightningTransaction)
    .filter((ts) => ts.isPaid === false);

  $: pendingTokens = Object.values($state.transactions)
    .filter(isEcashTransaction)
    .filter((ts) => ts.isPaid === false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };
</script>

<div class="flex flex-col items-center">
  <div class="flex flex-col gap-y-1 items-center">
    <p class="text-xs">{$state.mintUrl}</p>
    <p class="text-4xl">{$state.balance}</p>
    <p>Sats</p>
  </div>
  <div class="mt-4">
    {#if !receive && !send && !scan}
      <div class="flex gap-x-2">
        <button on:click={() => (receive = true)}>Receive</button>
        <button on:click={() => (scan = true)}>Scan</button>
        <button on:click={() => (send = true)}>Send</button>
      </div>
    {/if}
    {#if receive}
      <form on:submit|preventDefault>
        <div class="mt-2 flex flex-col gap-y-2">
          <div class="flex flex-col">
            <label for="token">E-cash Token</label>
            <input name="token" type="text" />
          </div>
          <p class="self-center">Or</p>
          <div class="flex flex-col">
            <label for="amount">Amount</label>
            <input name="amount" type="number" />
          </div>
          <button>Receive</button>
          <button type="button" on:click={() => (receive = false)}
            >Cancel</button
          >
        </div>
      </form>
    {/if}
    {#if send}
      <form on:submit|preventDefault>
        <div class="mt-2 flex flex-col gap-y-2">
          <div class="flex flex-col">
            <label for="amount">Amount</label>
            <input name="amount" type="number" />
          </div>
          <p class="self-center">Or</p>
          <div class="flex flex-col">
            <label for="invoice">Lightning Invoice</label>
            <input name="invoice" type="text" />
          </div>
          <button>Send</button>
          <button type="button" on:click={() => (send = false)}>Cancel</button>
        </div>
      </form>
    {/if}
    {#if scan}
      <div class="flex justify-center">
        <ScanCode onCancel={() => (scan = false)} />
      </div>
    {/if}
  </div>
</div>

<style>
  button {
    @apply border rounded-md px-2 py-1 bg-slate-100;
  }

  input {
    @apply border rounded-md p-1;
  }
</style>
