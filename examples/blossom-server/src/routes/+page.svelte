<script lang="ts">
	import { createWalletStore } from '@cashu-wallet/svelte';
	import { BlossomClient, type BlobDescriptor } from 'blossom-client';
	import {
		generateSecretKey,
		type EventTemplate,
		finalizeEvent,
		getPublicKey,
		nip19
	} from 'nostr-tools';
	import { onMount } from 'svelte';
	import Wallet from './Wallet.svelte';

	let sk: Uint8Array;
	const wallet = createWalletStore('localhost', 'http://localhost:3338');

	onMount(() => {
		const stored = localStorage.getItem('sk');
		if (stored) {
			sk = nip19.decode(stored).data as Uint8Array;
		} else {
			sk = generateSecretKey();
			localStorage.setItem('sk', nip19.nsecEncode(sk));
		}
		wallet.init();
		listFiles();
		getFee();
	});

	async function signer(event: EventTemplate) {
		return finalizeEvent(event, sk);
	}

	let file: HTMLInputElement;
	let files: BlobDescriptor[] = [];
	let fee: number;

	const handleUpload = async () => {
		const f = file.files?.[0];
		if (!f) return;
		const kb = f.size / 1024;
		const uploadFee = Math.floor(fee * kb);
		if (!confirm(`Fee to upload ${kb} KB: ${uploadFee} sats`)) {
			return;
		}
		const ecash = await wallet.sendEcash(uploadFee);
		const auth = await BlossomClient.getUploadAuth(f, signer);
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
			console.log(r.error);
			return;
		}
		console.log(r);
	};

	const listFiles = async () => {
		const res = await fetch(`/list/${getPublicKey(sk)}`, {});
		const r = await res.json();
		if (!res.ok) {
			console.log(r.error);
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

<h1>Upload a file</h1>
<h3>Fee: {fee} sats / KB</h3>
<Wallet {wallet} />
{#if sk}
	<h3>Pubkey: {getPublicKey(sk)}</h3>
{/if}
<form on:submit|preventDefault={handleUpload}>
	<input type="file" name="file" bind:this={file} />
	<button>Upload</button>
</form>
<button on:click={listFiles}>List files</button>
{#if files.length > 0}
	<h2>Files</h2>
	<ul>
		{#each files as f}
			<li>{f.url}</li>
		{/each}
	</ul>
{/if}
