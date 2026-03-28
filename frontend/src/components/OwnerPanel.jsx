import { useState } from "react";
import { ethers } from "ethers";
import {
  buildUserOp, getUserOpHash, encodeExecute,
  encodeInitCode, sendUserOp, waitForUserOp
} from "../utils/userOp";
import { ADDRESSES, COUNTER_ABI, FACTORY_ABI, INCREMENT_SELECTOR } from "../abis";

export function OwnerPanel({ signer, provider, onCounterUpdate }) {
  const [status, setStatus]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [accountAddr, setAccountAddr] = useState(ADDRESSES.smartAccount);
  const [isDeployed, setIsDeployed]   = useState(null);
  const [bundlerKey, setBundlerKey]   = useState("");

  const bundlerUrl = `https://api.pimlico.io/v2/11155111/rpc?apikey=${bundlerKey}`;

  async function checkDeployment() {
    try {
      const factory = new ethers.Contract(ADDRESSES.factory, FACTORY_ABI, provider);
      const ownerAddr = await signer.getAddress();
      const predicted = await factory.getFunction("getAddress")(ownerAddr, 0);
      const code = await provider.getCode(predicted);
      setAccountAddr(predicted);
      setIsDeployed(code !== "0x");
      setStatus(`Adresse: ${predicted} | Déployé: ${code !== "0x"}`);
    } catch (e) {
      setStatus("Erreur: " + e.message);
    }
  }

  async function deployAccount() {
    if (!bundlerKey) return setStatus("Entre ta clé Pimlico d'abord.");
    setLoading(true);
    setStatus("Construction de la UserOp de déploiement...");
    try {
      const ownerAddr = await signer.getAddress();
      const initCode  = encodeInitCode(ownerAddr, 0);

      const userOp = await buildUserOp({
        sender: accountAddr,
        callData: "0x",
        initCode,
        provider,
      });

      const hash = await getUserOpHash(userOp, provider);
      setStatus("Signature en cours...");
      userOp.signature = await signer.signMessage(ethers.getBytes(hash));

      setStatus("Envoi au bundler...");
      const userOpHash = await sendUserOp(userOp, bundlerUrl);
      setStatus(`UserOp envoyée: ${userOpHash}. Attente de la mine...`);

      await waitForUserOp(userOpHash, bundlerUrl);
      setStatus("✓ Compte déployé !");
      setIsDeployed(true);
    } catch (e) {
      setStatus("Erreur: " + e.message);
    }
    setLoading(false);
  }

  async function incrementAsOwner() {
    if (!bundlerKey) return setStatus("Entre ta clé Pimlico d'abord.");
    setLoading(true);
    setStatus("Construction de la UserOp increment()...");
    try {
      const counterIface = new ethers.Interface(COUNTER_ABI);
      const innerCallData = counterIface.encodeFunctionData("increment");
      const callData = encodeExecute(ADDRESSES.counter, 0n, innerCallData);

      const userOp = await buildUserOp({ sender: accountAddr, callData, provider });
      const hash = await getUserOpHash(userOp, provider);

      setStatus("Signature en cours...");
      userOp.signature = await signer.signMessage(ethers.getBytes(hash));

      setStatus("Envoi au bundler...");
      const userOpHash = await sendUserOp(userOp, bundlerUrl);
      setStatus(`UserOp envoyée: ${userOpHash}. Attente de la mine...`);

      await waitForUserOp(userOpHash, bundlerUrl);
      setStatus("✓ increment() exécuté !");
      onCounterUpdate?.();
    } catch (e) {
      setStatus("Erreur: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div className="panel">
      <h2 className="panel-title">
        <span className="badge badge-owner">OWNER</span>
        Owner Flow
      </h2>

      <div className="field">
        <label>Clé API Pimlico (bundler)</label>
        <input
          type="text"
          placeholder="Clé Pimlico..."
          value={bundlerKey}
          onChange={e => setBundlerKey(e.target.value)}
        />
        <a href="https://dashboard.pimlico.io" target="_blank" rel="noreferrer" className="link">
          → Obtenir une clé Pimlico gratuite
        </a>
      </div>

      <div className="field">
        <label>Smart Account</label>
        <code className="addr">{accountAddr}</code>
        {isDeployed !== null && (
          <span className={`tag ${isDeployed ? "tag-green" : "tag-red"}`}>
            {isDeployed ? "Déployé ✓" : "Non déployé"}
          </span>
        )}
      </div>

      <div className="btn-group">
        <button className="btn-secondary" onClick={checkDeployment} disabled={loading}>
          Vérifier déploiement
        </button>
        <button className="btn-primary" onClick={deployAccount} disabled={loading || isDeployed}>
          Déployer le compte
        </button>
        <button className="btn-primary" onClick={incrementAsOwner} disabled={loading || !isDeployed}>
          increment() en owner
        </button>
      </div>

      {status && (
        <div className="status-box">
          {loading && <span className="spinner" />}
          <p>{status}</p>
        </div>
      )}
    </div>
  );
}
