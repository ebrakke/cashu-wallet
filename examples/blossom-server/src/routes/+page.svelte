<script lang="ts">
	import { BlossomClient } from 'blossom-client';
	import { generateSecretKey, type EventTemplate, finalizeEvent } from 'nostr-tools';
	const sk = generateSecretKey();

	async function signer(event: EventTemplate) {
		return finalizeEvent(event, sk);
	}

	let file: HTMLInputElement;

	const handleUpload = async () => {
		const f = file.files?.[0];
		if (!f) return;
		const auth = await BlossomClient.getUploadAuth(f, signer);
		const res = await fetch('/upload', {
			headers: {
				Authorization: BlossomClient.encodeAuthorizationHeader(auth)
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
</script>

<h1>Welcome to SvelteKit</h1>
<form on:submit|preventDefault={handleUpload}>
	<input type="file" name="file" bind:this={file} />
	<button>Upload</button>
</form>
<p>
	Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation
</p>
