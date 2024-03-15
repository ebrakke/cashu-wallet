import { Readable, derived, get, writable } from "svelte/store";
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
  const wallet = writable<SingleMintWallet>();
  const init = () => {
    const storageProvider = new LocalStorageProvider<WalletState>(
      `${id}-${mintUrl}`
    );
    const _w = SingleMintWallet.loadFromSyncStorage(
      id,
      mintUrl,
      storageProvider,
      opts
    );
    wallet.set(_w);
  };

  const state: Readable<WalletState> = derived(wallet, ($w, set) => {
    if ($w) {
      const subscription = $w.state$.subscribe(set);
      return () => subscription.unsubscribe();
    }
  });
  return {
    state,
    mintUrl,
    init,
    sendEcash: (amount: number) => get(wallet).sendEcash(amount),
    sendLightning: (pr: string) => get(wallet).sendLightning(pr),
    receiveEcash: (token: string) => get(wallet).receiveEcash(token),
    receiveLightning: (amount: number) => get(wallet).receiveLightning(amount),
    swap: (token: string) => get(wallet).swap(token),
    revokeInvoice: (pr: string) => get(wallet).revokeInvoice(pr),
    checkPending: () => get(wallet).checkPendingTransactions(),
  };
}

export type WalletStore = ReturnType<typeof createWalletStore>;
