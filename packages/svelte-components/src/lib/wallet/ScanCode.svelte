<script lang="ts">
  import QrScanner from "qr-scanner";
  import { onMount } from "svelte";

  export let onCancel: () => void;

  let scanner: QrScanner | undefined;
  let videoElement: HTMLVideoElement;
  onMount(async () => {
    videoElement = document.querySelector("video")!;
    scanner = new QrScanner(videoElement, handleScanResult, {
      returnDetailedScanResult: true,
      highlightScanRegion: true,
      highlightCodeOutline: true,
      onDecodeError: () => {},
    });
    await scanner.start();
  });

  const handleScanResult = (result: QrScanner.ScanResult) => {
    console.log(result);
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
  <video style="width: 100%"></video>
  <button on:click={handleCancel} class="mt-2">Cancel</button>
</div>
