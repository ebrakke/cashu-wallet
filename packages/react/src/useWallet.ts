import { useRef } from "react";
import { useObservableState } from "observable-hooks";
import {
  LocalStorageProvider,
  type ReceivePayload,
  type SendPayload,
  Wallet,
} from "@cashu-wallet/core";

type ResultBox<T> = { v: T };

function useConstant<T>(fn: () => T): T {
  const ref = useRef<ResultBox<T>>();

  if (!ref.current) {
    ref.current = { v: fn() };
  }
  return ref.current.v;
}

export function useWallet(id: string, mintUrl: string) {
  const wallet = useConstant(() => {
    return new Wallet(mintUrl, new LocalStorageProvider(`${id}-${mintUrl}`));
  });
  const [state] = useObservableState(() => wallet.state$);

  return {
    state: state ?? { balance: 0, transactions: {} },
    send: (p: SendPayload) => wallet.send(p),
    receive: (p: ReceivePayload) => wallet.receive(p),
  };
}
