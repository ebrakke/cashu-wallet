import { readable } from "svelte/store";
import {
  LocalStorageProvider,
  Wallet,
  type WalletConfig,
  type ReceivePayload,
  type SendPayload,
} from "@cashu-wallet/core";

export function createWalletStore(
  id: string,
  mintUrl: string,
  config?: WalletConfig
) {
  const storageProvider = new LocalStorageProvider(`${id}-${mintUrl}`);
  const wallet = Wallet.loadFromSyncStorage(mintUrl, storageProvider, config);
  const state = readable(wallet.state, (set) => {
    const subscription = wallet.state$.subscribe(set);
    return () => subscription.unsubscribe();
  });

  return {
    state,
    send: (payload: SendPayload) => wallet.send(payload),
    receive: (payload: ReceivePayload) => wallet.receive(payload),
  };
}

export type WalletStore = ReturnType<typeof createWalletStore>;
