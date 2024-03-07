<script lang="ts">
  import { createWalletStore } from "@cashu-wallet/svelte";
  import { onMount } from "svelte";
  const { state, receive, send } = createWalletStore(
    "my-wallet",
    "http://localhost:3338"
  );
  export let data;
  onMount(async () => {
    if (data.token) {
      await receive({ type: "ecash", token: data.token });
    }
  });

  $: {
    console.log("STATE", $state);
  }
</script>

<div>
  <h1>Balance: {$state.balance}</h1>
</div>
