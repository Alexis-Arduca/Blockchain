/**
 * verify.js
 * ---------
 * Vérifie les contrats déployés sur Etherscan (Sepolia).
 * Lance APRÈS deploy.js — lit deployment.json pour récupérer les adresses.
 *
 * Usage :
 *   npx hardhat run scripts/verify.js --network sepolia
 */

const { run } = require("hardhat");
const fs = require("fs");

const ENTRY_POINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

async function main() {
  if (!fs.existsSync("deployment.json")) {
    throw new Error("deployment.json not found. Run deploy.js first.");
  }

  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  console.log("Verifying contracts from deployment:", deployment.deployedAt);

  // ── Vérification de la Factory ────────────────────────────────────────────
  console.log("\n[1/2] Verifying SmartAccountFactory...");
  try {
    await run("verify:verify", {
      address: deployment.factory,
      constructorArguments: [ENTRY_POINT_ADDRESS],
    });
    console.log("✓ SmartAccountFactory verified");
  } catch (e) {
    if (e.message.includes("Already Verified")) {
      console.log("  Already verified.");
    } else {
      console.error("  Error:", e.message);
    }
  }

  // ── Vérification du SmartAccount ──────────────────────────────────────────
  console.log("\n[2/2] Verifying SmartAccount...");
  try {
    await run("verify:verify", {
      address: deployment.smartAccount,
      constructorArguments: [deployment.owner, ENTRY_POINT_ADDRESS],
    });
    console.log("✓ SmartAccount verified");
  } catch (e) {
    if (e.message.includes("Already Verified")) {
      console.log("  Already verified.");
    } else {
      console.error("  Error:", e.message);
    }
  }

  console.log("\nEtherscan links:");
  console.log(`  Factory     : https://sepolia.etherscan.io/address/${deployment.factory}`);
  console.log(`  SmartAccount: https://sepolia.etherscan.io/address/${deployment.smartAccount}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
