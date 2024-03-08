import { readable } from "svelte/store";
import {
  LocalStorageProvider,
  Wallet,
  type WalletConfig,
} from "@cashu-wallet/core";

type Send = InstanceType<typeof Wallet>["send"];
type Receive = InstanceType<typeof Wallet>["receive"];

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

  const send: Send = (payload) => wallet.send(payload);
  const receive: Receive = (payload) => wallet.receive(payload);

  return {
    state,
    send,
    receive,
  };
}

export type WalletStore = ReturnType<typeof createWalletStore>;
