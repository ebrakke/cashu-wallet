<script lang="ts">
  import { wallet } from "../stores/wallet";
  let state = wallet.state;
  const handleFund = async () => {
    const r = await fetch("/tutorial.json");
    const res = await r.json();
  };
</script>

<button on:click={handleFund} class="underline"><slot /></button>
