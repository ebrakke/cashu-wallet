<script lang="ts">
	import QRCode from 'qrcode';
	import { UR, UREncoder } from '@gandlaf21/bc-ur';
	import { Buffer } from 'buffer/';
	import { onMount } from 'svelte';
	export let token: string;
	let done = false;

	let displayPart = '';

	$: if (displayPart) {
		const qr = document.getElementById('bc-ur') as HTMLCanvasElement;
		QRCode.toCanvas(qr, displayPart!);
	}

	onMount(async () => {
		const messageBuffer = Buffer.from(token);

		// First step is to create a UR object from a Buffer
		//@ts-ignore
		const ur = UR.fromBuffer(messageBuffer);

		// Then, create the UREncoder object

		// The maximum amount of fragments to be generated in total
		// For NGRAVE ZERO support please keep to a maximum fragment size of 200
		const maxFragmentLength = 200;

		// The index of the fragment that will be the first to be generated
		// If it's more than the "maxFragmentLength", then all the subsequent fragments will only be
		// fountain parts
		const firstSeqNum = 0;

		// Create the encoder object
		const encoder = new UREncoder(ur, maxFragmentLength, firstSeqNum);

		// Keep generating new parts, until a condition is met; for example the user exits the page, or clicks "DONE"
		while (!done) {
			// get the next part in the sequence
			let part = encoder.nextPart();

			// get the part as a string containing the cbor payload and display it with whatever way
			// the part looks like this:
			// ur:bytes/1-9/lpadascfadaxcywenbpljkhdcahkadaemejtswhhylkepmykhhtsytsnoyoyaxaedsuttydmmhhpktpmsrjtdkgslpgh
			await sleep(500);

			displayPart = part;
		}
	});
	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
</script>

<canvas id="bc-ur"></canvas>
