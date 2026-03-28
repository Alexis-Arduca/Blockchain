import { useState } from "react";
import { useWallet } from "./hooks/useWallet";
import { WalletConnect } from "./components/WalletConnect";
import { OwnerPanel } from "./components/OwnerPanel";
import { SessionKeyPanel } from "./components/SessionKeyPanel";
import { CounterDisplay } from "./components/CounterDisplay";
import "./App.css";

export default function App() {
  const { provider, signer, address, chainId, error, connect, disconnect } = useWallet();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCounterUpdate = () => setRefreshKey(k => k + 1);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo">⬡</span>
          <div>
            <h1 className="site-title">ERC-4337 Dashboard</h1>
            <p className="site-sub">Smart Account · Session Keys · Sepolia</p>
          </div>
        </div>
        <div className="header-right">
          {address ? (
            <div className="wallet-info">
              <span className="wallet-dot" />
              <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
              <span className="network-tag">
                {chainId === 11155111 ? "Sepolia ✓" : `⚠ Chain ${chainId}`}
              </span>
              <button className="btn-ghost" onClick={disconnect}>Disconnect</button>
            </div>
          ) : (
            <button className="btn-primary" onClick={connect}>Connect MetaMask</button>
          )}
        </div>
      </header>

      {error && <div className="global-error">{error}</div>}

      <main className="main">
        <CounterDisplay provider={provider} key={refreshKey} />

        {!address ? (
          <div className="connect-prompt">
            <p>Connecte MetaMask pour interagir avec le Smart Account.</p>
            <button className="btn-primary btn-large" onClick={connect}>
              Connect MetaMask
            </button>
          </div>
        ) : (
          <div className="panels">
            <OwnerPanel
              signer={signer}
              provider={provider}
              onCounterUpdate={handleCounterUpdate}
            />
            <SessionKeyPanel
              signer={signer}
              provider={provider}
              onCounterUpdate={handleCounterUpdate}
            />
          </div>
        )}
      </main>

      <footer className="footer">
        <a href={`https://sepolia.etherscan.io/address/0x7E15c3d54f6b9de598F877Bc12A65B66d3A0aE02`} target="_blank" rel="noreferrer">Counter</a>
        <a href={`https://sepolia.etherscan.io/address/0x74b3574ABF4dFBb5d723D55537DDF91c39D18a13`} target="_blank" rel="noreferrer">Factory</a>
        <a href={`https://sepolia.etherscan.io/address/0x7a4cae10782780ab4D326458C01194A26D93f404`} target="_blank" rel="noreferrer">SmartAccount</a>
      </footer>
    </div>
  );
}
