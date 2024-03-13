import { createWalletStore } from "@cashu-wallet/svelte";

export const wallet = createWalletStore(
  import.meta.env.PUBLIC_MINT_ID,
  import.meta.env.PUBLIC_MINT_URL
);
