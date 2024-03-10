<script lang="ts">
	import { getDecodedToken, getTokenMint } from '@cashu-wallet/core';
	import type { WalletStore } from '@cashu-wallet/svelte';
	import * as QRCode from 'qrcode';

	export let wallet: WalletStore;
	export let onFinish: () => void;

	let state: 'input' | 'waitForPayment' | 'tokenReceived' | 'paymentReceived' = 'input';
	let walletState = wallet.state;

	let invoice: string | undefined;
	$: {
		if (state === 'waitForPayment' && invoice) {
			const transaction = $walletState.transactions[invoice];
			if (transaction?.isPaid) {
				state = 'paymentReceived';
			}
		}
	}

	const handleReceive = async (e: Event) => {
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const token = formData.get('token') as string;
		const amount = formData.get('amount') as string;
		if (token) {
			const tokenMint = getTokenMint(getDecodedToken(token));
			if (tokenMint !== wallet.mintUrl) {
				alert(`Token mint ${tokenMint} does not match wallet mint ${wallet.mintUrl}`);
				return;
			}
			await wallet.receiveEcash(token);
			state = 'tokenReceived';
		} else if (amount) {
			invoice = await wallet.receiveLightning(Number(amount));
			state = 'waitForPayment';
			handleInvoice();
		}
	};

	const handleInvoice = async () => {
		if (invoice) {
			setTimeout(async () => {
				const qr = document.getElementById('qr') as HTMLCanvasElement;
				QRCode.toCanvas(qr, invoice!);
			}, 100);
		}
	};

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
	};
</script>

{#if state === 'input'}
	<form on:submit|preventDefault={handleReceive}>
		<div class="mt-2 flex flex-col gap-y-2">
			<div class="flex flex-col">
				<label for="token">E-cash Token</label>
				<input name="token" type="text" />
			</div>
			<p class="self-center">Or</p>
			<div class="flex flex-col">
				<label for="amount">Amount</label>
				<input name="amount" type="number" />
			</div>
			<button>Receive</button>
			<button type="button" on:click={onFinish}>Cancel</button>
		</div>
	</form>
{/if}
<div class="flex flex-col items-center gap-y-1">
	{#if state === 'waitForPayment' && invoice}
		<p>Waiting for payment. Scan this lightning invoice to fund your wallet</p>
		<div class="flex items-center gap-x-2">
			<span>{invoice.slice(0, 20)}...</span>
			<button on:click={() => handleCopy(invoice ?? '')}>Copy</button>
		</div>
		<canvas id="qr"></canvas>
		<button on:click={onFinish}>Cancel</button>
	{/if}
	{#if state === 'paymentReceived'}
		<p>Payment received</p>
		<button on:click={onFinish}>Close</button>
	{/if}
	{#if state === 'tokenReceived'}
		<p>Token received</p>
		<button on:click={onFinish}>Close</button>
	{/if}
</div>
