import { useWallet } from "@cashu-wallet/react";
import { useState } from "react";

function App() {
  const [receiveAmount, setReceiveAmount] = useState<number | undefined>();
  const [receiveToken, setReceiveToken] = useState<string | undefined>();
  const { state, send, receive } = useWallet(
    "react-wallt",
    "http://localhost:3338"
  );

  const handleReceive = () => {
    if (receiveAmount) {
      receive({ type: "lightning", amount: receiveAmount });
      return;
    }
    receive({ type: "ecash", token: receiveToken! });
  };
  return (
    <div>
      <p>Balance {state.balance}</p>
      <form onSubmit={(e) => e.preventDefault()}>
        <input
          type="number"
          placeholder="amount"
          onChange={(e) => setReceiveAmount(e.target.valueAsNumber)}
        />
        <input
          type="text"
          placeholder="token"
          onChange={(e) => setReceiveToken(e.target.value)}
        />
        <button onClick={handleReceive}>Receive</button>
      </form>
    </div>
  );
}

export default App;
