# Frontend - ERC-4337 Smart Account Dashboard

Interface React (Vite) pour interagir avec le Smart Account ERC-4337 sur Sepolia.

## Stack

- React + Vite
- ethers.js v6
- Pimlico (bundler ERC-4337)

## Prérequis

- Node.js 20.19+ ou 22.12+
- MetaMask installé dans le navigateur
- Wallet configuré sur le réseau **Sepolia**
- Une clé API Pimlico (gratuite sur https://dashboard.pimlico.io)

## Installation

```bash
npm install
npm run dev
```

L'app tourne sur http://localhost:5173

## Adresses déployées (Sepolia)

| Contract            | Adresse |
|---------------------|---------|
| EntryPoint v0.7     | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| Counter             | `0x047a4E69D72A7f7a2456E4D1AC496A17853433c5` |
| SmartAccountFactory | `0x26C85BEf1CC11eDa697d45abeD338BA7a13e92a6` |
| SmartAccount        | `0x2468eC39505A4F624C109e994ac7eb9a24184313` |

---

## Walkthrough - Demo complète

### Étape 0 - Préparation

1. Lancer l'app : `npm run dev`
2. Ouvrir http://localhost:5173
3. Cliquer **Connect MetaMask** et connecter son wallet
4. Vérifier que le réseau affiché est **Sepolia** en haut à droite
5. Récuperer une clé API sur https://dashboard.pimlico.io et coller-la dans les deux champs "Clé API Pimlico" (Owner Flow et Session Key Flow)

---

### Étape 1 - Vérifier le déploiement du Smart Account

1. Dans le panel **Owner Flow**, cliquer sur **Vérifier déploiement**
2. Le tag **Déployé** apparaît en vert
3. Le counter affiche sa valeur actuelle en haut de la page

> Le Smart Account `0x2468eC39505A4F624C109e994ac7eb9a24184313` est déjà déployé sur Sepolia.
> Pour déployer un nouveau compte, utilise le bouton **Déployer le compte** qui envoie une UserOp avec `initCode`.

---

### Étape 2 - Interagir en tant qu'owner (ECDSA)

1. Dans le panel **Owner Flow**, cliquer sur **increment() en owner**
2. MetaMask ouvre une popup de signature: signer cette pop-up
3. La status box affiche l'avancement: construction -> signature -> envoi bundler -> attente mine
4. Une fois miné : **increment() exécuté !**
5. Cliquer **Refresh** sur le counter: la valeur s'incrémente

> La UserOp est signée avec la clé privée MetaMask (ECDSA owner).
> Elle passe par le bundler Pimlico qui la soumet à l'EntryPoint v0.7.

---

### Étape 3 - Ajouter une session key

1. Dans le panel **Session Key Flow**, cliquer sur **Générer session key**
2. Une adresse in-browser s'affiche (wallet éphémère généré dans le navigateur)
3. Sélectionner une durée de validité (ex: 24 heures)
4. Cliquer sur **Enregistrer (owner signe)**
5. MetaMask ouvre une popup de signature, il faut la signer
6. Attendre la confirmation : **Session key enregistrée !**
7. Le tag **Enregistrée** apparaît en vert

> L'owner envoie une UserOp qui appelle `addSessionKey(key, expiry, [increment.selector])`.
> La session key est scoped uniquement sur `increment()`. Elle ne peut pas appeler d'autres fonctions.

---

### Étape 4 - Interagir en tant que session key

1. Cliquer sur **increment() (session key signe)**
2. **Aucune popup MetaMask**: la signature se fait in-browser avec le wallet éphémère
3. La status box affiche l'avancement
4. Une fois miné : **increment() signé par la session key !**
5. Cliquer sur **Refresh**: le counter s'incrémente à nouveau

> La session key signe la UserOp directement dans le navigateur.
> Le contrat `validateUserOp` vérifie: active + non expirée + selector `increment()` autorisé.

---

### Étape 5 - Révoquer la session key

1. Cliquer sur **Révoquer**
2. MetaMask ouvre une popup de signature. Signer cette popup
3. Une fois miné : **Session key révoquée.**
4. Le tag **Enregistrée** disparaît

> Après révocation, toute tentative de signer avec cette session key retourne `AA24 signature error`.

---

## Vérification on-chain

Toutes les transactions sont visibles sur Etherscan :

- Counter : https://sepolia.etherscan.io/address/0x047a4E69D72A7f7a2456E4D1AC496A17853433c5
- SmartAccount : https://sepolia.etherscan.io/address/0x2468eC39505A4F624C109e994ac7eb9a24184313
- Factory : https://sepolia.etherscan.io/address/0x26C85BEf1CC11eDa697d45abeD338BA7a13e92a6