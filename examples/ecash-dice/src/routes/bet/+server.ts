import { serverWallet } from "$lib";
import { getTokenAmount } from "@cashu-wallet/core";
import { json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {
  if (serverWallet.state.balance === 0) {
    return json({ error: "Server wallet is empty" });
  }
  const { token } = (await request.json()) as {
    token: string;
  };

  if (!token) {
    throw json({ error: "Invalid request" }, { status: 400 });
  }
  const betAmount = getTokenAmount(token);
  if (betAmount < 10) {
    return json({ error: "Minimum bet is 10" }, { status: 400 });
  }
  // Claim token for server wallet
  try {
    await serverWallet.receive({ type: "ecash", token });
  } catch (e) {
    return json({ error: "Invalid token" }, { status: 400 });
  }

  const serverRoll = Math.floor(Math.random() * 6) + 1;
  const clientRoll = Math.floor(Math.random() * 6) + 1;
  if (serverRoll < clientRoll) {
    const winAmount = betAmount * 2;
    const token = await serverWallet.send({ type: "ecash", amount: winAmount });
    return json({ win: winAmount, token, serverRoll, clientRoll });
  }
  return json({ win: 0, serverRoll, clientRoll });
};
