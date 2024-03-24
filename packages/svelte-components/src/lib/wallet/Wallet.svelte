<script lang="ts">
	import ReceiveLightning from './ReceiveLightning.svelte';
	import Bolt from '$lib/icons/Bolt.svelte';
	import Cash from '$lib/icons/Cash.svelte';
	import ReceiveEcash from './ReceiveEcash.svelte';
	import { createAppState } from './state.js';
	import { setContext } from 'svelte';
	import Home from './Home.svelte';
	import SendLightning from './SendLightning.svelte';
	import SendEcash from './SendEcash.svelte';
	import History from './History.svelte';
	import Mints from './Mints.svelte';
	import ScanCode from './ScanCode.svelte';

	export let mintUrl: string;
	export let id: string;

	const appState = createAppState(id, mintUrl);
	const { wallet, mode, page } = appState;
	$: state = $wallet?.state$;

	$: pending = $state ? Object.values($state.transactions).filter((tx) => !tx.isPaid).length : 0;
	setContext('appState', appState);
</script>

{#if $state}
	<div class="flex flex-col items-center gap-y-8">
		<div class="flex w-full justify-between">
			<button class="btn btn-sm" on:click={() => ($page = 'mints')}>Mints</button>
			<button class="btn btn-sm" on:click={() => ($page = 'home')}>Home</button>
			<button class="btn btn-sm" on:click={() => ($page = 'history')}
				>History
				{#if pending > 0}
					<span class="badge badge-primary">{pending}</span>
				{/if}
			</button>
		</div>
		{#if $page === 'mints'}
			<Mints />
		{:else}
			<div role="tablist" class="tabs tabs-lifted w-full">
				<button
					role="tab"
					class="tab flex items-center gap-x-2"
					class:tab-active={$mode === 'lightning'}
					on:click={() => ($mode = 'lightning')}
				>
					<Bolt size="sm" class="fill-yellow-400" />
					<span>Lightning</span>
				</button>
				<button
					role="tab"
					class="tab flex items-center gap-x-2"
					class:tab-active={$mode === 'ecash'}
					on:click={() => ($mode = 'ecash')}><Cash size="sm" class="fill-green-400" />Ecash</button
				>
			</div>
			<div class="{$mode} flex flex-col gap-y-3 w-full">
				{#if $page === 'home'}
					<Home />
				{/if}
				{#if $page === 'receive'}
					<h1 class="text-xl text-center">Receive {$mode}</h1>
					{#if $mode === 'lightning'}
						<ReceiveLightning {wallet} onFinish={() => ($page = 'home')} />
					{:else}
						<ReceiveEcash {wallet} onFinish={() => ($page = 'home')} />
					{/if}
				{/if}
				{#if $page === 'send'}
					<h1 class="text-xl text-center">Send {$mode}</h1>
					{#if $mode === 'lightning'}
						<SendLightning {wallet} onFinish={() => ($page = 'home')} />
					{:else}
						<SendEcash {wallet} onFinish={() => ($page = 'home')} />
					{/if}
				{/if}
				{#if $page === 'history'}
					<History />
				{/if}
				{#if $page === 'scan'}
					<ScanCode onCancel={() => ($page = 'home')} />
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	:global(input[type='number']) {
		appearance: textfield;
		-moz-appearance: textfield;
	}
	:global(input[type='number']::-webkit-inner-spin-button),
	:global(input[type='number']::-webkit-outer-spin-button) {
		-webkit-appearance: none;
		margin: 0;
	}

	:global(.lightning .btn-primary) {
		@apply bg-yellow-400 text-black border-none;
	}
	:global(.ecash .btn-primary) {
		@apply bg-green-400 text-black border-none;
	}
</style>
