<script lang="ts">
	import '@cashu-wallet/svelte-components/styles.css';
	import '../app.css';
	import { wallet } from '$lib';
	import Nav from '$lib/components/Nav.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		wallet.init();
	});
</script>

<Nav />
<div class="container max-w-2xl mx-auto">
	<slot />
</div>
