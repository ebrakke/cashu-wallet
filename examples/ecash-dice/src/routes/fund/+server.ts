import { getOrCreateServerWallet } from "$lib";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  const { token } = (await request.json()) as { token: string };
  const serverWallet = await getOrCreateServerWallet();
  if (!token) {
    throw error(400, "Invalid request");
  }

  try {
    await serverWallet.receive({ type: "ecash", token });
  } catch (e) {
    console.error(e);
    throw error(400, "Invalid token");
  }
  return json({ message: "Thank you!" });
};
