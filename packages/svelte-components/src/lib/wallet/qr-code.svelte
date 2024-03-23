<script lang="ts">
	import QRCode from 'qrcode';
	import { onMount } from 'svelte';
	export let value: string;

	onMount(() => {
		const qr = document.getElementById('qr') as HTMLCanvasElement;
		QRCode.toCanvas(qr, value);
	});
</script>

<canvas id="qr"></canvas>
