<script>
	// @ts-nocheck
	import QrScanner from 'qr-scanner';
	import { onMount } from 'svelte';

	/**
	 * @type {() => void}
	 */
	export let onCancel;
	/**
	 * @type {(result: string) => void}
	 */
	export let onScan;

	/**
	 * @type {QrScanner.default | undefined}
	 */
	let scanner;
	/**
	 * @type {HTMLVideoElement}
	 */
	let videoElement;
	onMount(async () => {
		videoElement = document.querySelector('video');
		scanner = new QrScanner(videoElement, handleScanResult, {
			returnDetailedScanResult: true,
			highlightScanRegion: true,
			highlightCodeOutline: true,
			onDecodeError: () => {}
		});
		await scanner.start();
	});

	/**
	 *
	 * @param {import('qr-scanner').default.ScanResult} result
	 */
	const handleScanResult = (result) => {
		onScan(result.data);
		stop();
	};

	const stop = () => {
		scanner?.stop();
		const mediaStream = videoElement.srcObject;
		if (mediaStream instanceof MediaStream) {
			const tracks = mediaStream.getTracks();
			tracks.forEach((track) => {
				track.stop();
			});

			videoElement.srcObject = null;
		}
	};

	const handleCancel = () => {
		stop();
		onCancel();
	};
</script>

<div class="w-[300px] flex flex-col justify-center">
	<!-- svelte-ignore a11y-media-has-caption -->
	<video style="width: 100%"></video>
	<button on:click={handleCancel} class="mt-2">Cancel</button>
</div>
