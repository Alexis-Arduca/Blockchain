# Blockchain - Partie 1 : Smart Contracts

> README mis à jour au fur et à mesure de la progression.

## Structure du projet

```
contracts/
├── contracts/
│   ├── SmartAccount.sol         # Compte ERC-4337 (ECDSA + session keys)
│   ├── SmartAccountFactory.sol  # Factory CREATE2
│   ├── Counter.sol              # Contrat cible pour la démo (partie 1.2)
│   └── mocks/
│       └── MockEntryPoint.sol   # Mock pour les tests
├── scripts/
│   ├── deploy.js                # Déploie Counter + Factory + SmartAccount
│   └── verify.js                # Vérifie sur Etherscan
├── test/
│   └── SmartAccount.test.js     # Suite de tests (20 tests)
├── hardhat.config.js
├── package.json
├── script.sh                    # Pour automatiser les tests
└── .env.example

frontend/
├── src/
│   ├── abis/                    # ABIs + adresses des contrats
│   ├── components/              # OwnerPanel, SessionKeyPanel, CounterDisplay
│   ├── hooks/                   # useWallet (connexion MetaMask)
│   └── utils/                   # Construction et envoi des UserOps
└── README.md                    # Walkthrough de la démo
```

---

## Adresses déployées (Sepolia)

| Contract            | Adresse |
|---------------------|---------|
| EntryPoint v0.7     | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| Counter             | `0x047a4E69D72A7f7a2456E4D1AC496A17853433c5` |
| SmartAccountFactory | `0x26C85BEf1CC11eDa697d45abeD338BA7a13e92a6` |
| SmartAccount        | `0x2468eC39505A4F624C109e994ac7eb9a24184313` |

---

## Installation

```bash
cd contracts
npm install
cp .env.example .env
# Il vous faudra remplir SEPOLIA_RPC_URL, PRIVATE_KEY et ETHERSCAN_API_KEY dans .env
```

---

## Compilation

```bash
npm run compile
```

---

## Tests

```bash
npm test
```

20 tests couvrant :
- Déploiement déterministe via CREATE2
- Validation ECDSA owner
- Validation session key (active, expiry, selector)
- Révocation de session key
- Appel execute via EntryPoint

---

## Déploiement

### Sepolia

```bash
npm run deploy:sepolia
```

Ceci va créer un fichier `deployment.json` avec toutes les adresses déployées.

### Local

```bash
# Terminal 1
npm run node

# Terminal 2
npm run deploy:local
```

---

## Vérification Etherscan

```bash
npm run verify:sepolia
```

Pour vérifier le SmartAccount manuellement :

```bash
npx hardhat verify --network sepolia <SMART_ACCOUNT_ADDRESS> "<OWNER_ADDRESS>" "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
```

---

## Architecture

### SmartAccount.sol

`validateUserOp` est appelée par l'EntryPoint avant toute exécution :

1. Remboursement des `missingAccountFunds` à l'EntryPoint
2. `ecrecover` sur `keccak256("\x19Ethereum Signed Message:\n32" + userOpHash)`
3. Si `recovered == owner` : succes (ECDSA standard)
4. Si `recovered` est une session key : verification `active + expiry + selector`

Session keys :
- Creées par l'owner via `addSessionKey(key, expiry, selectors[])`
- Scopées sur des selecteurs specifiques (ex: uniquement `increment()`)
- Révocables immédiatement via `revokeSessionKey(key)`
- Expirables automatiquement via timestamp UNIX

`execute` :
- Uniquement appelable par l'EntryPoint ou le compte lui-même
- Propage le revert du contrat cible via assembly

### SmartAccountFactory.sol

- `createAccount(owner, salt)` : déploie via CREATE2, idempotent
- `getAddress(owner, salt)` : calcule l'adresse contrefactuelle avant déploiement

Pourquoi CREATE2 ? L'adresse du compte est calculable AVANT déploiement. Le frontend peut construire une UserOp avec `initCode` pour un compte inexistant : l'EntryPoint déploie le compte ET exécute l'opération dans la même transaction.

---

## Demo

Le walkthrough complet de la démo frontend est disponible dans `frontend/README.md`.