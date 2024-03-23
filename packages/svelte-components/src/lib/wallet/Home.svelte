<script lang="ts">
	import { getAppState } from './state.js';

	const { wallet, page } = getAppState();

	$: state = $wallet?.state$;
</script>

<div class="w-full flex flex-col gap-y-8">
	<div class="flex flex-col gap-y-1 items-center">
		<p class="text-5xl">{$state.balance}</p>
		<p>Sats</p>
	</div>
	<div class="flex gap-x-2 justify-center w-full">
		<div class="w-full">
			<button on:click={() => ($page = 'send')} class="btn btn-primary btn-block">Send</button>
		</div>
		<div class="w-full">
			<button on:click={() => ($page = 'scan')} class="btn btn-primary btn-block">Scan</button>
		</div>
		<div class="w-full">
			<button class="btn btn-primary btn-block" on:click={() => ($page = 'receive')}>Receive</button
			>
		</div>
	</div>
</div>
