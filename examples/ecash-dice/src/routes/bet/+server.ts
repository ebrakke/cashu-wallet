import { getOrCreateServerWallet } from "$lib";
import { getDecodedToken, getTokenAmount } from "@cashu-wallet/core";
import { json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {
  const serverWallet = await getOrCreateServerWallet();
  const wallet = serverWallet.getWallet("https://localhost:3338");
  if (wallet.state.balance === 0) {
    return json({ error: "Server wallet is empty" });
  }
  const { token } = (await request.json()) as {
    token: string;
  };

  if (!token) {
    throw json({ error: "Invalid request" }, { status: 400 });
  }
  const betAmount = getTokenAmount(getDecodedToken(token));
  if (betAmount > wallet.state.balance * 2) {
    return json({ error: "Insufficient server funds" }, { status: 400 });
  }
  if (betAmount > 100) {
    return json({ error: "Maximum bet is 100" }, { status: 400 });
  }
  // Claim token for server wallet
  try {
    const balance = wallet.state.balance;
    await serverWallet.receive({
      type: "ecash",
      strategy: "swap",
      token,
      mint: wallet.state.mintUrl,
    });
    const amountLessFees = wallet.state.balance - balance;
    const serverRoll = Math.floor(Math.random() * 6) + 1;
    const clientRoll = Math.floor(Math.random() * 6) + 1;
    if (serverRoll < clientRoll) {
      const winAmount = amountLessFees * 2;
      const token = await wallet.send({
        type: "ecash",
        amount: winAmount,
      });
      return json({ win: winAmount, token, serverRoll, clientRoll });
    }
    return json({ win: 0, serverRoll, clientRoll });
  } catch (e) {
    return json({ error: "Invalid token" }, { status: 400 });
  }
};
