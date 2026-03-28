import { useState, useCallback } from "react";
import { ethers } from "ethers";

export function useWallet() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner]     = useState(null);
  const [address, setAddress]   = useState(null);
  const [chainId, setChainId]   = useState(null);
  const [error, setError]       = useState(null);

  const connect = useCallback(async () => {
    setError(null);
    if (!window.ethereum) {
      setError("MetaMask non détecté. Installe l'extension.");
      return;
    }
    try {
      const _provider = new ethers.BrowserProvider(window.ethereum);
      await _provider.send("eth_requestAccounts", []);
      const _signer  = await _provider.getSigner();
      const _address = await _signer.getAddress();
      const network  = await _provider.getNetwork();

      setProvider(_provider);
      setSigner(_signer);
      setAddress(_address);
      setChainId(Number(network.chainId));

      // Vérifie qu'on est sur Sepolia
      if (Number(network.chainId) !== 11155111) {
        setError("Mauvais réseau. Passe sur Sepolia dans MetaMask.");
      }
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
  }, []);

  return { provider, signer, address, chainId, error, connect, disconnect };
}
