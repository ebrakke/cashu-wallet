import { writable } from "svelte/store";
import {
  LocalStorageProvider,
  SingleMintWallet,
  type WalletOptions,
} from "@cashu-wallet/web";

export function createWalletStore(
  id: string,
  mintUrl: string,
  opts?: WalletOptions
) {
  const wallet = writable<SingleMintWallet>();

  return {
    init: async () => {
      const w = await SingleMintWallet.loadFromStorage(
        id,
        mintUrl,
        new LocalStorageProvider(`cashu-wallet:${id}`),
        opts
      );
      wallet.set(w);
    },
    subscribe: wallet.subscribe,
  };
}

export type WalletStore = ReturnType<typeof createWalletStore>;
