<script lang="ts">
	import { createWalletStore } from '@cashu-wallet/svelte';
	import { BlossomClient, type BlobDescriptor } from 'blossom-client';
	import { onMount } from 'svelte';
	import { Wallet } from '@cashu-wallet/svelte-components';
	import ndk from '$lib/ndk';
	import { signer } from '$lib/blossom';

	const wallet = createWalletStore('localhost', 'http://localhost:3338', { workerInterval: 2000 });
	onMount(() => {
		wallet.init();
		getFee();
		listFiles();
	});

	let file: HTMLInputElement;
	let files: BlobDescriptor[] = [];
	let fee: number;
	let showWallet = false;

	const handleUpload = async () => {
		const f = file.files?.[0];
		if (!f || f.size === 0) {
			alert('No file selected');
			return;
		}
		const kb = f.size / 1024;
		const uploadFee = Math.floor(fee * kb);
		if (!confirm(`Fee to upload ${kb} KB: ${uploadFee} sats`)) {
			return;
		}
		const ecash = await wallet.sendEcash(uploadFee);
		const auth = await BlossomClient.getUploadAuth(f, signer);
		console.log('AUTH', auth);
		const res = await fetch('/upload', {
			headers: {
				Authorization: BlossomClient.encodeAuthorizationHeader(auth),
				'X-Cashu': ecash
			},
			method: 'PUT',
			body: f
		});
		const r = await res.json();
		if (!res.ok) {
			alert(r.message);
			await wallet.receiveEcash(ecash);
			return;
		}
	};

	const listFiles = async () => {
		const res = await fetch(`/list/${$ndk.activeUser?.pubkey}`, {});
		const r = await res.json();
		if (!res.ok) {
			alert(r.error);
			return;
		}
		files = r;
	};

	const getFee = async () => {
		const res = await fetch(`/fees`, {});
		const r = await res.json();
		if (!res.ok) {
			console.log(r.error);
			return;
		}
		fee = r.perKB;
	};
</script>

<div class="header">
	<h1>Upload a file</h1>
	<h3>Fee: {fee} sats / KB</h3>
</div>
<div>
	<button class="btn" on:click={() => (showWallet = !showWallet)}
		>{showWallet ? 'Hide' : 'Show'} Wallet</button
	>
	{#if showWallet}
		<Wallet {wallet} />
	{/if}
</div>
<div class="my-4">
	<form on:submit|preventDefault={handleUpload}>
		<input type="file" class="file-input" name="file" bind:this={file} />
		<button class="btn">Upload</button>
	</form>
</div>
<button on:click={listFiles}>List files</button>
{#if files.length > 0}
	<h2>Files</h2>
	<ul>
		{#each files as f}
			<li>{f.url}</li>
		{/each}
	</ul>
{/if}
