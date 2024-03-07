import type { PageServerLoad } from "./$types";
import { serverWallet } from "$lib";

export const load: PageServerLoad = async () => {
  //   await serverWallet.receive({ type: "lightning", amount: 100000 });
  //   const token = await serverWallet.send({ type: "ecash", amount: 100 });
  //   console.log(serverWallet.state.balance);
  return { token: undefined };
};
