import type { PageServerLoad } from "./$types";
import { serverWallet } from "$lib";

export const load: PageServerLoad = async () => {
  //   await serverWallet.receive({ type: "lightning", amount: 100000 });
  const token = undefined; //await serverWallet.send({ type: "ecash", amount: 100 });
  return { token: token };
};
