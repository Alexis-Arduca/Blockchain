import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { ADDRESSES, COUNTER_ABI } from "../abis";

export function CounterDisplay({ provider }) {
  const [count, setCount]     = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const counter = new ethers.Contract(ADDRESSES.counter, COUNTER_ABI, provider);
      const value = await counter.getCount(ADDRESSES.smartAccount);
      setCount(value.toString());
    } catch (e) {
      console.error("Erreur lecture counter:", e);
    }
    setLoading(false);
  }, [provider]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  return (
    <div className="counter-display">
      <div className="counter-label">Counter Value</div>
      <div className="counter-value">
        {loading ? "..." : count ?? "—"}
      </div>
      <button className="btn-ghost" onClick={fetchCount} disabled={loading}>
        ↻ Refresh
      </button>
      <p className="muted">
        Smart Account: <code>{ADDRESSES.smartAccount.slice(0, 10)}...{ADDRESSES.smartAccount.slice(-6)}</code>
      </p>
    </div>
  );
}
