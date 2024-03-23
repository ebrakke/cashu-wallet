<script lang="ts">
	import { getDecodedToken, getTokenMint } from '@cashu-wallet/core';
	import type { WalletStore } from '@cashu-wallet/svelte';
	import * as QRCode from 'qrcode';

	export let wallet: WalletStore;
	export let onFinish: () => void;

	let state: 'input' | 'waitForPayment' | 'paymentReceived' = 'input';
	let walletState = $wallet.state$;

	let invoice: string | undefined;
	let value = 0;
	$: inputWidth = Math.min(15, value.toString().length + 1);

	const handleAmountChange = (e: Event) => {
		const input = e.currentTarget as HTMLInputElement;
		if (!input.value || input.valueAsNumber < 0) {
			value = 0;
			input.value = '0';
			return;
		}
		input.valueAsNumber = value = parseInt(input.value.replace(/^0+/, ''));
	};

	const handleReceive = async () => {
		if (value > 0) {
			invoice = await $wallet.receiveLightning(value);
			state = 'waitForPayment';
		}
	};
	$: if (invoice) {
		setTimeout(async () => {
			const qr = document.getElementById('qr') as HTMLCanvasElement;
			QRCode.toCanvas(qr, invoice!);
		}, 100);
	}

	$: paid = invoice ? $walletState.transactions[invoice]?.isPaid : false;
	$: if (paid) {
		state = 'paymentReceived';
	}
</script>

{#if state === 'input'}
	<form on:submit|preventDefault={handleReceive}>
		<div class="flex justify-center items-baseline font-mono gap-x-1">
			<input
				{value}
				on:input|preventDefault={handleAmountChange}
				type="number"
				style="width: {inputWidth}ch"
				class="text-4xl focus-within:border-0 focus-within:outline-none"
			/>
			<span>Sats</span>
		</div>
		<button class="btn btn-primary w-full mt-4">Receive</button>
	</form>
{/if}
{#if state === 'waitForPayment'}
	<div class="flex flex-col items-center gap-y-4">
		<p>Waiting for payment</p>
		<canvas id="qr" />
		<button class="btn btn-sm" on:click={() => (state = 'input')}>Back</button>
	</div>
{/if}
{#if state === 'paymentReceived'}
	<div class="flex flex-col items-center gap-y-4">
		<p>Payment received</p>
		<button class="btn btn-sm" on:click={onFinish}>Back</button>
	</div>
{/if}
