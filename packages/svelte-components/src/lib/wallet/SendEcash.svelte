<script lang="ts">
	import type { WalletStore } from '@cashu-wallet/svelte';
	import BrUrEncoder from './br-ur-encoder.svelte';
	import QrCode from './qr-code.svelte';

	export let wallet: WalletStore;
	export let onFinish: () => void;

	let state: 'input' | 'waitForPayment' | 'tokenCreated' | 'paymentSucceeded' | 'tokenClaimed' =
		'input';
	let qrTypeAnimated = false;
	let walletState = $wallet.state$;
	let token: string | undefined;
	let amount = 0;
	let container: HTMLDivElement | null = null;
	$: inputWidth = Math.min(15, amount.toString().length + 1);

	const handleAmountChange = (e: Event) => {
		const input = e.currentTarget as HTMLInputElement;
		if (!input.value || input.valueAsNumber < 0) {
			amount = 0;
			input.value = '0';
			return;
		}
		input.valueAsNumber = amount = parseInt(input.value.replace(/^0+/, ''));
	};

	$: {
		if (state === 'tokenCreated' && token) {
			const transaction = $walletState.transactions[token];
			if (transaction?.isPaid) {
				state = 'tokenClaimed';
			}
		}
	}

	const handleSend = async (e: Event) => {
		if (amount) {
			token = await $wallet.sendEcash(Number(amount));
			state = 'tokenCreated';
		}
	};

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
	};
</script>

<div bind:this={container}>
	{#if state === 'input'}
		<form on:submit|preventDefault={handleSend}>
			<div class="flex justify-center items-baseline font-mono gap-x-1">
				<input
					value={amount}
					on:input|preventDefault={handleAmountChange}
					type="number"
					style="width: {inputWidth}ch"
					class="text-4xl focus-within:border-0 focus-within:outline-none"
				/>
				<span>Sats</span>
			</div>
			<button class="btn btn-primary w-full mt-4">Send</button>
		</form>
	{/if}
	{#if state === 'tokenCreated' && token}
		<div class="flex flex-col items-center">
			<p>Share this token</p>
			<div class="flex items-center gap-x-2">
				<span>{token.slice(0, 20)}...</span>
				<button class="btn" on:click={() => handleCopy(token ?? '')}>Copy</button>
			</div>
			<div class="form-control">
				<label class="label cursor-pointer">
					<span class="label-text">Static</span>
					<input type="checkbox" class="toggle" bind:checked={qrTypeAnimated} />
					<span class="label-text">Animated</span>
				</label>
			</div>
			{#if qrTypeAnimated}
				<BrUrEncoder {token} />
			{:else}
				<QrCode value={token} />
			{/if}
			<button class="btn" on:click={onFinish}>Cancel</button>
		</div>
	{/if}
	{#if state === 'paymentSucceeded'}
		<p>Payment Sent!</p>
		<button class="btn" on:click={onFinish}>Close</button>
	{/if}
	{#if state === 'tokenClaimed'}
		<p>Token Claimed!</p>
		<button class="btn" on:click={onFinish}>Close</button>
	{/if}
</div>
