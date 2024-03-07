import { readable } from "svelte/store";
import { ReceivePayload, SendPayload, Wallet } from "@cashu-wallet/core";

export function createWalletStore(id: string, mintUrl: string) {
  const wallet = new Wallet(id, mintUrl);
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
