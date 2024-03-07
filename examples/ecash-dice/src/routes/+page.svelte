<script lang="ts">
  import Wallet from "$lib/components/wallet.svelte";
  import { createWalletStore } from "@cashu-wallet/svelte";
  const wallet = createWalletStore("my-wallet", "http://localhost:3338");

  let bet = 10;
  let roll = 0;
  let result = "";

  const handleSubmit = async () => {
    const token = await wallet.send({ type: "ecash", amount: bet });
    const response = await fetch("/", {
      method: "POST",
      body: JSON.stringify({ token, roll }),
    });
    const r = await response.json();
    if (r.token) {
      await wallet.receive({ type: "ecash", token: r.token });
      result = "You won! " + r.win;
    } else {
      result = `You lost, server rolled ${r.roll} and you rolled ${roll}`;
    }
  };
</script>

<div>
  <Wallet {wallet} />
  <h3>{result}</h3>
  <div>
    <h3>Place your bet</h3>
    <form on:submit|preventDefault={handleSubmit}>
      <div>
        <label>Bet</label>
        <input
          type="number"
          name="bet"
          min="10"
          max="100"
          step="1"
          placeholder="sats"
          bind:value={bet}
        />
      </div>
      <div>
        <input
          type="number"
          name="roll"
          min="1"
          max="6"
          disabled
          bind:value={roll}
        />
        <button
          type="button"
          on:click={() => (roll = Math.floor(Math.random() * 6) + 1)}
        >
          Roll
        </button>
      </div>
      <button>Bet!</button>
    </form>
  </div>
</div>
