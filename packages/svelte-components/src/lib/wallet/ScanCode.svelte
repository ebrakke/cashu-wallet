<script>
	//@ts-nocheck
	import QrScanner from 'qr-scanner';
	import { onDestroy, onMount } from 'svelte';
	import { getAppState } from './state';

	export let onCancel;
	const { wallet } = getAppState();

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

	const handlePayment = async (data) => {};

	/**
	 *
	 * @param {import('qr-scanner').default.ScanResult} result
	 */
	const handleScanResult = async (result) => {
		stop();
		if (result.data.startsWith('cashu')) {
			await $wallet.receiveEcahs(result.data);
		} else {
			await $wallet.sendLightning(result.data);
		}
		onCancel();
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

	onDestroy(() => {
		stop();
	});

	const handleCancel = () => {
		stop();
		onCancel();
	};
</script>

<div class="flex justify-center">
	<div class="w-[300px] flex flex-col justify-center">
		<!-- svelte-ignore a11y-media-has-caption -->
		<video style="width: 100%"></video>
		<button on:click={handleCancel} class="mt-2">Cancel</button>
	</div>
</div>
