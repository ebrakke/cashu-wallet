import { ServerWallet, FileStorageProvider } from "@cashu-wallet/server";

let serverWallet: ServerWallet | null = null;
async function getOrCreateServerWallet() {
  if (serverWallet) {
    return serverWallet;
  }
  serverWallet = await ServerWallet.loadFromStorage(
    "http://localhost:3338",
    new FileStorageProvider("local-mint.json")
  );
  const state = await serverWallet.getState();
  console.log("Server wallet balance: ", state?.balance);
  return serverWallet;
}

export { getOrCreateServerWallet };
