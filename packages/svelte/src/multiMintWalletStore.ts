import { writable, derived } from "svelte/store";
import { LocalStorageProvider, MultiMintWallet } from "@cashu-wallet/core";

type Receive = InstanceType<typeof MultiMintWallet>["receive"];
type Send = InstanceType<typeof MultiMintWallet>["send"];

export function createMultiMintWalletStore() {
  const multiMintWallet = new MultiMintWallet(
    (mintUrl) => new LocalStorageProvider(`wallet-${mintUrl}`)
  );
  const currentMint = writable<string>();
  const walletState = derived(currentMint, ($currentMint, set) => {
    const wallet = multiMintWallet.getWallet($currentMint);
    const sub = wallet.state$.subscribe(set);
    return () => sub.unsubscribe();
  });

  const receive: Receive = async (payload) => multiMintWallet.receive(payload);
  const send: Send = async (payload) => multiMintWallet.send(payload);

  return {
    addWallet: (mintUrl: string) => {
      multiMintWallet.addWalletWithSyncStorage(
        mintUrl,
        new LocalStorageProvider(`wallet-${mintUrl}`)
      );
    },
    receive,
    send,
    checkSwapFee: async (mintUrl: string, token: string) => {
      const wallet = multiMintWallet.getWallet(mintUrl);
      if (!wallet) {
        throw new Error("No wallet found for " + mintUrl);
      }
      const fee = await MultiMintWallet.getSwapFee(
        token,
        multiMintWallet.getWallet(mintUrl)
      );
      return fee;
    },
    setCurrentMint: (mintUrl: string) => currentMint.set(mintUrl),
    walletState,
  };
}
