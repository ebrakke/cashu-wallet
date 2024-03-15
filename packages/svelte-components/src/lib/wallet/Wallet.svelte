<script lang="ts">
	import { getDecodedToken, getTokenMint } from '@cashu-wallet/core';
	import type { WalletStore } from '@cashu-wallet/svelte';
	import ScanCode from './ScanCode.svelte';
	import Send from './Send.svelte';
	import Receive from './Receive.svelte';
	import History from './History.svelte';
	export let wallet: WalletStore;
	let state = wallet.state;
	let page: 'home' | 'receive' | 'send' | 'scan' | 'history' = 'home';

	$: pending = $state
		? Object.values($state.transactions).filter((ts) => ts.isPaid === false).length
		: 0;

	const handleScan = async (result: string) => {
		if (result.startsWith('cashu')) {
			const t = getDecodedToken(result);
			if (getTokenMint(t) !== wallet.mintUrl) {
				alert(`Token mint ${getTokenMint(t)} does not match wallet mint ${wallet.mintUrl}`);
				return;
			}
			await wallet.receiveEcash(result);
		} else if (result.toLowerCase().startsWith('ln')) {
			await wallet.sendLightning(result);
		}
		page = 'home';
	};
</script>

{#if $state}
	<div class="cashu-wallet">
		<div class="cashu-wallet-header">
			<div class="flex flex-col items-center gap-y-1">
				<p class="text-xs">{wallet.mintUrl}</p>
				{#if page === 'history'}
					<button on:click={() => (page = 'home')}>Back</button>
				{:else}
					<button on:click={() => (page = 'history')}
						>History {pending > 0 ? `(${pending})` : ''}</button
					>
				{/if}
			</div>
			<p class="text-4xl">{$state.balance}</p>
			<p>Sats</p>
		</div>
		<div class="mt-4">
			{#if page === 'home'}
				<div class="flex gap-x-2">
					<button on:click={() => (page = 'receive')}>Receive</button>
					<button on:click={() => (page = 'scan')}>Scan</button>
					<button on:click={() => (page = 'send')}>Send</button>
				</div>
			{/if}
			{#if page === 'receive'}
				<Receive {wallet} onFinish={() => (page = 'home')} />
			{/if}
			{#if page === 'send'}
				<Send {wallet} onFinish={() => (page = 'home')} />
			{/if}
			{#if page === 'scan'}
				<div class="flex justify-center">
					<ScanCode onCancel={() => (page = 'home')} onScan={handleScan} />
				</div>
			{/if}
			{#if page === 'history'}
				<div class="flex justify-center">
					<History {wallet} />
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.cashu-wallet {
		@apply flex flex-col items-center;
	}
	.cashu-wallet-header {
		@apply flex flex-col gap-y-1 items-center;
	}
	:global(.cashu-wallet button) {
		@apply border rounded-md px-2 py-1 bg-slate-100;
	}

	:global(.cashu-wallet input) {
		@apply border rounded-md p-1;
	}
</style>
