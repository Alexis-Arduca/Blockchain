import { useWallet } from "../hooks/useWallet";

export function WalletConnect() {
  const { address, chainId, error, connect, disconnect } = useWallet();

  return (
    <div className="wallet-bar">
      {address ? (
        <div className="wallet-info">
          <span className="wallet-dot" />
          <span className="wallet-addr">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <span className="wallet-network">
            {chainId === 11155111 ? "Sepolia" : `Chain ${chainId}`}
          </span>
          <button className="btn-ghost" onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button className="btn-primary" onClick={connect}>
          Connect MetaMask
        </button>
      )}
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}
