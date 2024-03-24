<script lang="ts">
  import { Wallet } from "@cashu-wallet/svelte-components";
  import { createWalletStore } from "@cashu-wallet/svelte";
  import { onMount } from "svelte";
  import { PUBLIC_MINT_ID, PUBLIC_MINT_URL } from "$env/static/public";
  const wallet = createWalletStore(PUBLIC_MINT_ID, PUBLIC_MINT_URL);
  type Result = {
    serverRoll: number;
    clientRoll: number;
    message?: string;
    amount?: number;
    win: boolean;
  };
  onMount(() => {
    wallet.init();
  });
  $: state = $wallet?.state$;
  $: balance = $state?.balance ?? 0;

  let bet = 1;
  let result: Result | undefined;
  let error: string | undefined;
  let fundServerToken: string | undefined;
  let showWallet = false;

  const handleSubmit = async () => {
    const token = await $wallet.sendEcash(bet);
    const response = await fetch("/bet", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    const r = await response.json();
    if (!response.ok) {
      error = r.message;
      result = undefined;
      await $wallet.receiveEcash(token);
      return;
    }
    error = undefined;
    if (r.token) {
      await $wallet.receiveEcash(r.token);
      result = {
        serverRoll: r.serverRoll,
        clientRoll: r.clientRoll,
        message: "You won!",
        amount: r.win,
        win: true,
      };
    } else {
      result = {
        serverRoll: r.serverRoll,
        clientRoll: r.clientRoll,
        message: "You lost!",
        win: false,
      };
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
      } else {
        const r = await res.json();
        error = r.message;
      }
    }
  };
</script>

<div class="p-8">
  <div class="flex flex-col gap-y-4 relative">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl">Ecash Dice</h1>
      <div>
        <button
          on:click={() => (showWallet = !showWallet)}
          class="btn btn-primary mb-4">Wallet ({balance})</button
        >
      </div>
    </div>
    {#if showWallet}
      <div
        class="lg:absolute lg:right-0 lg:top-12 bg-white p-4 border-2 rounded-md md:w-96"
      >
        <Wallet walletStore={wallet} />
      </div>
    {/if}
  </div>
  <p class="prose">
    Fund your wallet, roll the dice, win a prize! If you roll higher than the
    server, you win double what you bet! This wallet is setup to only work with
    one mint. Trying to fund with ecash from other mints will fail!
  </p>
  <hr />
  <div class="mt-8">
    <h3>Place your bet</h3>
    {#if error}
      <div class="alert alert-error my-2">{error}</div>
    {/if}
    {#if result}
      <div class="my-2">
        {#if result.win}
          <div class="alert alert-success flex flex-col gap-y-4">
            <p>You won {result.amount} sats!</p>
            <p>
              Server Roll: <span class="text-2xl">{result.serverRoll}</span>
            </p>
            <p>
              Your Roll: <span class="text-2xl">{result.clientRoll}</span>
            </p>
          </div>
        {:else}
          <div class="alert alert-warning flex flex-col gap-y-4">
            <p>You Lost!</p>
            <p>
              Server Roll: <span class="text-2xl">{result.serverRoll}</span>
            </p>
            <p>
              Your Roll: <span class="text-2xl">{result.clientRoll}</span>
            </p>
          </div>
        {/if}
      </div>
    {/if}
    <form on:submit|preventDefault={handleSubmit}>
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Bet Amount (sats)</span>
        </div>
        <input
          type="number"
          min={1}
          bind:value={bet}
          placeholder="Bet"
          class="input input-bordered w-full"
        />
        <div class="label">
          <span></span>
          <span class="label-text-alt">Max bet: 100 sats</span>
        </div>
      </label>
      <button class="btn btn-success btn-block">Bet</button>
    </form>
  </div>
  <div class="mt-8">
    <h3 class="text-lg">Fund this server!</h3>
    <p>Paste an ecash token here and help top up the server</p>
    <form on:submit|preventDefault={fundServer}>
      <input
        class="input input-bordered w-full form-control"
        type="text"
        placeholder="ecash token"
        bind:value={fundServerToken}
      />
      <button class="btn btn-accent mt-2 btn-block">Fund</button>
    </form>
  </div>
</div>
