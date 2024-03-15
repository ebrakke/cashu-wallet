<div class="container">
  <slot />
</div>

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
