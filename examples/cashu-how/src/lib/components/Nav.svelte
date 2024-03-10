<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Wallet } from '@cashu-wallet/svelte-components';
	import { wallet } from '$lib/wallet';

	let showWallet = false;
	let state = wallet.state;
	$: balance = $state?.balance ?? 0;
</script>

<nav class="py-4 px-8 rounded-b-md border-b-2 mb-6 sticky w-full top-0 bg-slate-50">
	<div class="flex justify-between">
		<div class="flex gap-x-4">
			<a href="/">Home</a>
			<a href="/tutorial">Tutorial</a>
			<a href="/fund">Donate</a>
		</div>
		<div><button on:click={() => (showWallet = !showWallet)}>Wallet ({balance})</button></div>
	</div>
	{#if showWallet}
		<div transition:fade class="flex justify-center m-2">
			<div class="rounded-md shadow-md p-6 bg-white">
				<Wallet {wallet} />
			</div>
		</div>
	{/if}
</nav>
