import { getOrCreateServerWallet } from "$lib";
import {
  getDecodedToken,
  getTokenAmount,
  getTokenMint,
} from "@cashu-wallet/core";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {
  const wallet = await getOrCreateServerWallet();
  if (wallet.state.balance === 0) {
    return error(500, "Server wallet is empty");
  }
  const { token } = (await request.json()) as {
    token: string;
  };

  if (!token) {
    throw error(400, "Token required");
  }
  const tokenMint = getTokenMint(getDecodedToken(token));
  if (tokenMint !== wallet.mintUrl) {
    throw error(
      400,
      `Invalid ecash token. This server only accepts ${wallet.mintUrl} tokens.`
    );
  }
  const betAmount = getTokenAmount(getDecodedToken(token));
  if (betAmount > wallet.state.balance * 2) {
    return error(500, "Insufficient Server funds");
  }
  if (betAmount > 100) {
    return error(400, "Maximum bet amount is 100");
  }
  // Claim token for server wallet
  try {
    const balance = wallet.state.balance;
    await wallet.receiveEcash(token);
    const amountLessFees = wallet.state.balance - balance;
    const serverRoll = Math.floor(Math.random() * 6) + 1;
    const clientRoll = Math.floor(Math.random() * 6) + 1;
    if (serverRoll < clientRoll) {
      const winAmount = amountLessFees * 2;
      const token = await wallet.sendEcash(winAmount);
      return json({ win: winAmount, token, serverRoll, clientRoll });
    }
    return json({ win: 0, serverRoll, clientRoll });
  } catch (e) {
    console.error(e);
    return error(500, "An unknown error has occurred. Please try again.");
  }
};
