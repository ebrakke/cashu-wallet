<script lang="ts">
  import { wallet } from "../stores/wallet";
  import { Wallet } from "@cashu-wallet/svelte-components";
  import { onMount } from "svelte";

  let state = wallet.state;
  let opened = false;
  onMount(() => {
    wallet.init();
  });
</script>

<div class="flex flex-col gap-y-2 relative">
  <button on:click={() => (opened = !opened)}>Wallet ({$state.balance})</button>
  {#if opened}
    <div
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white p-8 rounded-lg shadow-lg mx-auto">
        <Wallet {wallet} />
        <div class="mt-4 flex justify-center">
          <button on:click={() => (opened = false)}>Close</button>
        </div>
      </div>
    </div>
  {/if}
</div>
