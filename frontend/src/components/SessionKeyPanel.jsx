import { useState } from "react";
import { ethers } from "ethers";
import {
  buildUserOp, getUserOpHash, encodeExecute,
  sendUserOp, waitForUserOp
} from "../utils/userOp";
import {
  ADDRESSES, COUNTER_ABI, SMART_ACCOUNT_ABI, INCREMENT_SELECTOR
} from "../abis";

export function SessionKeyPanel({ signer, provider, onCounterUpdate }) {
  const [status, setStatus]   = useState("");
  const [loading, setLoading] = useState(false);
  const [bundlerKey, setBundlerKey] = useState("");

  const [sessionWallet, setSessionWallet] = useState(null);
  const [sessionKeyAddr, setSessionKeyAddr] = useState("");
  const [expiryHours, setExpiryHours] = useState(24);
  const [isRegistered, setIsRegistered] = useState(false);

  const bundlerUrl = `https://api.pimlico.io/v2/11155111/rpc?apikey=${bundlerKey}`;

  function generateSessionKey() {
    const wallet = ethers.Wallet.createRandom();
    setSessionWallet(wallet);
    setSessionKeyAddr(wallet.address);
    setStatus(`Session key générée: ${wallet.address}`);
  }

  async function addSessionKey() {
    if (!bundlerKey) return setStatus("Entre ta clé Pimlico d'abord.");
    if (!sessionKeyAddr) return setStatus("Génère une session key d'abord.");
    setLoading(true);
    setStatus("Enregistrement de la session key...");

    try {
      const accountIface = new ethers.Interface(SMART_ACCOUNT_ABI);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + expiryHours * 3600);

      const innerCallData = accountIface.encodeFunctionData("addSessionKey", [
        sessionKeyAddr,
        expiry,
        [INCREMENT_SELECTOR],
      ]);

      const callData = encodeExecute(ADDRESSES.smartAccount, 0n, innerCallData);

      const userOp = await buildUserOp({
        sender: ADDRESSES.smartAccount,
        callData,
        provider,
      });

      const hash = await getUserOpHash(userOp, provider);
      setStatus("Signature owner requise...");
      userOp.signature = await signer.signMessage(ethers.getBytes(hash));

      setStatus("Envoi au bundler...");
      const userOpHash = await sendUserOp(userOp, bundlerUrl);
      setStatus(`UserOp envoyée: ${userOpHash}. Attente...`);

      const receipt = await waitForUserOp(userOpHash, bundlerUrl);
      setStatus(`UserOp envoyée: ${userOpHash}. Attente...`);

      await waitForUserOp(userOpHash, bundlerUrl);
      setStatus(`✓ Session key enregistrée ! Expiry: ${new Date(Number(expiry) * 1000).toLocaleString()}`);
      setIsRegistered(true);
    } catch (e) {
      setStatus("Erreur: " + e.message);
    }
    setLoading(false);
  }

  async function revokeSessionKey() {
    if (!bundlerKey) return setStatus("Entre ta clé Pimlico d'abord.");
    if (!sessionKeyAddr) return setStatus("Aucune session key à révoquer.");
    setLoading(true);
    setStatus("Révocation de la session key...");

    try {
      const accountIface = new ethers.Interface(SMART_ACCOUNT_ABI);
      const innerCallData = accountIface.encodeFunctionData("revokeSessionKey", [sessionKeyAddr]);
      const callData = encodeExecute(ADDRESSES.smartAccount, 0n, innerCallData);

      const userOp = await buildUserOp({
        sender: ADDRESSES.smartAccount,
        callData,
        provider,
      });

      const hash = await getUserOpHash(userOp, provider);
      userOp.signature = await signer.signMessage(ethers.getBytes(hash));

      const userOpHash = await sendUserOp(userOp, bundlerUrl);
      await waitForUserOp(userOpHash, bundlerUrl);
      setStatus("✓ Session key révoquée.");
      setIsRegistered(false);
    } catch (e) {
      setStatus("Erreur: " + e.message);
    }
    setLoading(false);
  }

  async function incrementAsSessionKey() {
    if (!bundlerKey) return setStatus("Entre ta clé Pimlico d'abord.");
    if (!sessionWallet) return setStatus("Génère et enregistre une session key d'abord.");
    if (!isRegistered) return setStatus("La session key n'est pas encore enregistrée.");
    setLoading(true);
    setStatus("Construction de la UserOp (session key)...");

    try {
      const counterIface = new ethers.Interface(COUNTER_ABI);
      const innerCallData = counterIface.encodeFunctionData("increment");
      const callData = encodeExecute(ADDRESSES.counter, 0n, innerCallData);

      const userOp = await buildUserOp({
        sender: ADDRESSES.smartAccount,
        callData,
        provider,
      });

      const hash = await getUserOpHash(userOp, provider);

      setStatus("Signature session key (in-browser)...");
      userOp.signature = await sessionWallet.signMessage(ethers.getBytes(hash));

      const recovered = ethers.verifyMessage(ethers.getBytes(hash), userOp.signature);

      setStatus("Envoi au bundler...");
      const userOpHash = await sendUserOp(userOp, bundlerUrl);
      setStatus(`UserOp envoyée: ${userOpHash}. Attente...`);

      await waitForUserOp(userOpHash, bundlerUrl);
      setStatus("✓ increment() signé par la session key !");
      onCounterUpdate?.();
    } catch (e) {
      setStatus("Erreur: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div className="panel">
      <h2 className="panel-title">
        <span className="badge badge-session">SESSION</span>
        Session Key Flow
      </h2>

      <div className="field">
        <label>Clé API Pimlico (bundler)</label>
        <input
          type="text"
          placeholder="Clé Pimlico..."
          value={bundlerKey}
          onChange={e => setBundlerKey(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Session Key générée in-browser</label>
        {sessionKeyAddr ? (
          <code className="addr">{sessionKeyAddr}</code>
        ) : (
          <p className="muted">Aucune session key générée</p>
        )}
        {isRegistered && <span className="tag tag-green">Enregistrée ✓</span>}
      </div>

      <div className="field">
        <label>Durée de validité</label>
        <select value={expiryHours} onChange={e => setExpiryHours(Number(e.target.value))}>
          <option value={1}>1 heure</option>
          <option value={24}>24 heures</option>
          <option value={168}>7 jours</option>
        </select>
        <p className="muted">Autorisée uniquement sur : <code>increment()</code></p>
      </div>

      <div className="btn-group">
        <button className="btn-secondary" onClick={generateSessionKey} disabled={loading}>
          Générer session key
        </button>
        <button className="btn-primary" onClick={addSessionKey} disabled={loading || !sessionKeyAddr || isRegistered}>
          Enregistrer (owner signe)
        </button>
        <button className="btn-primary" onClick={incrementAsSessionKey} disabled={loading || !isRegistered}>
          increment() (session key signe)
        </button>
        <button className="btn-danger" onClick={revokeSessionKey} disabled={loading || !isRegistered}>
          Révoquer
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