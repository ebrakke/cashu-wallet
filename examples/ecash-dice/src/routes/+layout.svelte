<script lang="ts">
  import { Modals, closeModal } from "svelte-modals";
</script>

<div class="container">
  <slot />
</div>
<Modals>
  <div slot="backdrop" class="backdrop" on:click={closeModal} />
</Modals>

<style>
  .container {
    display: flex;
    justify-content: center;
    height: 100vh;
  }
  .backdrop {
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    background: rgba(0, 0, 0, 0.5);
  }
</style>
