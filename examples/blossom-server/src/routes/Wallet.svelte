<script lang="ts">
	import { Wallet } from '@cashu-wallet/svelte-components';
	import '@cashu-wallet/svelte-components/styles.css';
	import type { WalletStore } from '@cashu-wallet/svelte';

	export let wallet: WalletStore;
</script>

{#if wallet.state}
	<Wallet {wallet} />
{/if}
