<script lang="ts">
  import { onMount } from "svelte";
  import QRScanner from "qr-scanner";
  import { closeModal } from "svelte-modals";

  export let isOpen: boolean;
  export let onScan: (result: string) => void;

  let scanner: QRScanner | undefined;
  onMount(async () => {
    scanner = new QRScanner(
      document.querySelector("video")!,
      handleScanResult,
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        onDecodeError: () => {},
      }
    );
    await scanner.start();
  });

  const handleScanResult = (result: QRScanner.ScanResult) => {
    onScan(result.data);
    scanner?.stop();
    closeModal();
  };

  const handleClose = () => {
    scanner?.stop();
    closeModal();
  };
</script>

{#if isOpen}
  <div role="dialog" class="modal">
    <div class="contents">
      Scan a cashu token to receive ecash or a lightning invoice to send ecash
      <!-- svelte-ignore a11y-media-has-caption -->
      <video width="500" height="500"></video>
      <div class="actions">
        <button on:click={handleClose}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal {
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;

    /* allow click-through to backdrop */
    pointer-events: none;
  }

  .contents {
    min-width: 240px;
    border-radius: 6px;
    padding: 16px;
    background: white;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: auto;
  }

  .actions {
    margin-top: 32px;
    display: flex;
    justify-content: flex-end;
  }
</style>
