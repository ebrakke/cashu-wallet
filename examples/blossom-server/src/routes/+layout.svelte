<script>
	import '@cashu-wallet/svelte-components/styles.css';
	import '../app.css';
	import { NDKNip07Signer, NDKNip46Signer } from '@nostr-dev-kit/ndk';
	import ndk from '$lib/ndk';

	async function nip07() {
		document.body.appendChild(document.createElement('script')).src =
			'https://unpkg.com/window.nostr.js/dist/window.nostr.js';

		try {
			const signer = new NDKNip07Signer();
			const user = await signer.blockUntilReady();

			if (user) {
				$ndk.signer = signer;
				$ndk.activeUser = user;
				$ndk = $ndk;
				localStorage.setItem('signed-in', 'true');
			}
		} catch (e) {
			alert(e);
		}
	}
</script>

{#if !$ndk.activeUser}
	<button class="btn" on:click={nip07}>Login</button>
{:else}
	<div class="container mx-auto prose">
		<slot />
	</div>
{/if}
