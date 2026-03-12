# Blockchain - Partie 1 : Smart Contracts (Je vais update le README au fur et à mesure de ma progression)

## Structure

```
contracts/
├── SmartAccount.sol         # Compte ERC-4337 (IAccount, ECDSA + session keys)
├── SmartAccountFactory.sol  # Factory CREATE2 (createAccount, getAddress)
└── Counter.sol              # Contrat cible pour la démo (partie 1.2)

scripts/
├── deploy.js                # Déploie factory + compte
└── verify.js                # Vérifie sur Etherscan

test/
└── SmartAccount.test.js     # Suite de tests complète
```

---

## Installation

```bash
npm install
cp .env.example .env
# N'oubliez pas de remplir votre .env pour les valeurs SEPOLIA_RPC_URL, PRIVATE_KEY & ETHERSCAN_API_KEY
```

---

## Compilation

```bash
npm run compile
npx hardhat compile
```

---

## Tests

```bash
npm test
npx hardhat test
```

Couverture :
```bash
npm run test:coverage
```

---

## Déploiement

### Local (Hardhat node)
```bash
# Terminal 1 : lancer le noeud local
npm run node

# Terminal 2 : déployer
npm run deploy:local
```

### Sepolia
```bash
npm run deploy:sepolia
```

Cela crée un fichier `deployment.json` avec les adresses déployées.

---

## Vérification Etherscan (Sepolia)

```bash
npm run verify:sepolia
```

---

## Adresses importantes

| Contract              | Réseau  | Adresse |
|-----------------------|---------|---------|
| EntryPoint v0.7       | Tous    | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| SmartAccountFactory   | Sepolia | *(voir deployment.json après deploy)* |
| SmartAccount (demo)   | Sepolia | *(voir deployment.json après deploy)* |

---

## Architecture

### SmartAccount.sol

**validateUserOp** — appelée par l'EntryPoint avant toute exécution :

1. Remboursement des `missingAccountFunds` à l'EntryPoint
2. `ecrecover` sur `keccak256("\x19Ethereum Signed Message:\n32" + userOpHash)`
3. Si `recovered == owner` → succès (ECDSA standard)
4. Si `recovered` est une session key → vérification `active + expiry + selector`

**Session keys** :
- Créées par l'owner via `addSessionKey(key, expiry, selectors[])`
- Scoped sur des selecteurs spécifiques (ex: uniquement `increment()`)
- Révocables immédiatement via `revokeSessionKey(key)`
- Expirables automatiquement via timestamp UNIX

**execute** :
- Uniquement appelable par l'EntryPoint
- Propage le revert du contrat cible (assembly)

### SmartAccountFactory.sol

- `createAccount(owner, salt)` → déploie via `CREATE2`, idempotent
- `getAddress(owner, salt)` → adresse contrefactuelle (avant déploiement)

**Pourquoi CREATE2 ?**
L'adresse du compte est calculable AVANT déploiement. Le frontend peut
construire une UserOp avec `initCode` pour un compte inexistant : l'EntryPoint
déploie le compte ET exécute l'opération dans la même transaction.
