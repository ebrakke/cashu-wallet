import { readable } from "svelte/store";
import {
  LocalStorageProvider,
  SingleMintWallet,
  WalletState,
  type WalletOptions,
} from "@cashu-wallet/core";

export function createWalletStore(
  id: string,
  mintUrl: string,
  opts?: WalletOptions
) {
  const storageProvider = new LocalStorageProvider<WalletState>(
    `${id}-${mintUrl}`
  );
  const wallet = SingleMintWallet.loadFromSyncStorage(
    id,
    mintUrl,
    storageProvider,
    opts
  );
  const state = readable(wallet.state, (set) => {
    const subscription = wallet.state$.subscribe(set);
    return () => subscription.unsubscribe();
  });

  return {
    state,
    sendEcash: (amount: number) => wallet.sendEcash(amount),
    sendLightning: (pr: string) => wallet.sendLightning(pr),
    receiveEcash: (token: string) => wallet.receiveEcash(token),
    receiveLightning: (amount: number) => wallet.receiveLightning(amount),
    swap: (token: string) => wallet.swap(token),
    revokeInvoice: (pr: string) => wallet.revokeInvoice(pr),
  };
}

export type WalletStore = ReturnType<typeof createWalletStore>;
