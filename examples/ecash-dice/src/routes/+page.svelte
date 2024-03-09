<script lang="ts">
  import Wallet from "$lib/components/wallet.svelte";
  import { createWalletStore } from "@cashu-wallet/svelte";
  const wallet = createWalletStore("my-wallet", "http://localhost:3338", {
    workerInterval: 3000,
  });

  let bet = 1;
  let result = "";
  let fundServerToken: string | undefined;

  const handleSubmit = async () => {
    const token = await wallet.sendEcash(bet);
    const response = await fetch("/bet", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    const r = await response.json();
    if (r.error) {
      result = `Error: ${r.error}`;
      return;
    }
    if (r.token) {
      await wallet.receiveEcash(r.token);
      result = `You won, server rolled ${r.serverRoll} and you rolled ${r.clientRoll}`;
    } else {
      result = `You lost, server rolled ${r.serverRoll} and you rolled ${r.clientRoll}`;
    }
  };

  const fundServer = async () => {
    if (fundServerToken) {
      const res = await fetch("/fund", {
        method: "POST",
        body: JSON.stringify({ token: fundServerToken }),
      });
      if (res.ok) {
        fundServerToken = undefined;
      }
    }
  };
</script>

<div>
  <p>
    Fund your wallet, roll the dice, win a prize! If you roll higher than the
    server, you win double what you bet!
  </p>
  <p>
    This wallet is setup to only work with one mint. Trying to fund with ecash
    from other mints will fail!
  </p>
  <hr />
  <Wallet {wallet} />
  <h3>{result}</h3>
  <div>
    <h3>Place your bet</h3>
    <form on:submit|preventDefault={handleSubmit}>
      <label for="bet">Bet</label>
      <input
        type="number"
        name="bet"
        min="1"
        max="100"
        step="1"
        placeholder="sats"
        bind:value={bet}
      />
      <button>Bet!</button>
    </form>
  </div>
  <div>
    <h3>Fund this server! Paste an ecash token here</h3>
    <form on:submit|preventDefault={fundServer}>
      <input
        type="text"
        placeholder="ecash token"
        bind:value={fundServerToken}
      />
      <button>Fund</button>
    </form>
  </div>
</div>
