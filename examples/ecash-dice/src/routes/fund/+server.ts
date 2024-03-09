import { getOrCreateServerWallet } from "$lib";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDecodedToken, getTokenMint } from "@cashu-wallet/core";

export const POST: RequestHandler = async ({ request }) => {
  const { token } = (await request.json()) as { token: string };
  const serverWallet = await getOrCreateServerWallet();
  if (!token) {
    throw error(400, "Invalid request");
  }

  try {
    if (getTokenMint(getDecodedToken(token)) !== serverWallet.mintUrl) {
      await serverWallet.swap(token);
    } else {
      await serverWallet.receiveEcash(token);
    }
  } catch (e) {
    console.error(e);
    throw error(400, "Invalid token");
  }
  return json({ message: "Thank you!" });
};
