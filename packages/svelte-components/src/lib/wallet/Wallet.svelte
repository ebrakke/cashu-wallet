<script lang="ts">
	import { getDecodedToken, getTokenMint } from '@cashu-wallet/core';
	import type { WalletStore } from '@cashu-wallet/svelte';
	import ScanCode from './ScanCode.svelte';
	import Send from './Send.svelte';
	import Receive from './Receive.svelte';
	import History from './History.svelte';
	export let wallet: WalletStore;
	let page: 'home' | 'receive' | 'send' | 'scan' | 'history' = 'home';
	let state = $wallet.state$;
	$: pending = $state
		? Object.values($state.transactions).filter((ts) => ts.isPaid === false).length
		: 0;

	const handleScan = async (result: string) => {
		if (result.startsWith('cashu')) {
			const t = getDecodedToken(result);
			if (getTokenMint(t) !== $wallet.mintUrl) {
				alert(`Token mint ${getTokenMint(t)} does not match wallet mint ${$wallet.mintUrl}`);
				return;
			}
			await $wallet.receiveEcash(result);
		} else if (result.toLowerCase().startsWith('ln')) {
			await $wallet.sendLightning(result);
		}
		page = 'home';
	};
</script>

{#if $state}
	<div class="flex flex-col items-center">
		<div class="flex flex-col gap-y-1 items-center">
			<div class="flex flex-col items-center gap-y-1">
				<p class="text-xs">{$wallet.mintUrl}</p>
				{#if page === 'history'}
					<button class="btn" on:click={() => (page = 'home')}>Back</button>
				{:else}
					<button class="btn" on:click={() => (page = 'history')}
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
					<button class="btn" on:click={() => (page = 'receive')}>Receive</button>
					<button class="btn" on:click={() => (page = 'scan')}>Scan</button>
					<button class="btn" on:click={() => (page = 'send')}>Send</button>
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
