<script lang="ts">
	import type { WalletStore } from '@cashu-wallet/svelte';

	export let wallet: WalletStore;
	export let onFinish: () => void;

	let received = false;

	const handleReceive = async () => {
		if (!token) {
			alert('Please enter a valid ecash token');
			return;
		}
		try {
			await $wallet.receiveEcash(token);
			received = true;
		} catch (e) {
			alert(e);
		}
	};
	let token: string | undefined;
</script>

{#if received}
	<div class="alert alert-success mt-4 flex justify-center gap-x-2">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-6 w-6"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
		</svg>
		<div>
			<p class="font-bold">Ecash received!</p>
		</div>
	</div>
{/if}
<form on:submit|preventDefault={handleReceive}>
	<label for="invoice" class="form-control w-full">
		<div class="label">
			<span class="label-text">Ecash Token</span>
		</div>
		<input bind:value={token} name="token" type="text" class="input input-bordered" />
	</label>
	<button class="btn btn-primary w-full mt-4">Receive</button>
</form>
