import { PUBLIC_MINT_ID, PUBLIC_MINT_URL } from "$env/static/public";
import { ServerWallet, FileStorageProvider } from "@cashu-wallet/server";

let serverWallet: ServerWallet | null = null;
async function getOrCreateServerWallet() {
  if (serverWallet) {
    return serverWallet;
  }
  serverWallet = await ServerWallet.loadFromStorage(
    PUBLIC_MINT_URL,
    new FileStorageProvider(`${PUBLIC_MINT_ID}-wallet.json`)
  );
  const state = await serverWallet.getState();
  console.log("Server wallet balance: ", state?.balance);
  return serverWallet;
}

export { getOrCreateServerWallet };
