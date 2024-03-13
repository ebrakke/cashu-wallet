import type { APIRoute } from "astro";
import { getOrCreateServerWallet } from "server/wallet";

export const GET: APIRoute = async ({ params, request }) => {
  const wallet = await getOrCreateServerWallet();

  return new Response(JSON.stringify({ token: "foo" }));
};
