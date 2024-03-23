<script lang="ts">
	import type { WalletStore } from '@cashu-wallet/svelte';

	export let wallet: WalletStore;
	export let onFinish: () => void;

	const handleWithdraw = async () => {
		if (!invoice) {
			alert('Please enter a valid lightning invoice');
			return;
		}
		await $wallet.sendLightning(invoice);
	};
	let invoice: string | undefined;
</script>

<form on:submit|preventDefault={handleWithdraw}>
	<label for="invoice" class="form-control w-full">
		<div class="label">
			<span class="label-text">Lightning Invoice</span>
		</div>
		<input bind:value={invoice} name="invoice" type="text" class="input input-bordered" />
	</label>
	<button class="btn btn-primary w-full mt-4">Send</button>
</form>
