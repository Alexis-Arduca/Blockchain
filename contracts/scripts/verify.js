const { run } = require("hardhat");
const fs = require("fs");

const ENTRY_POINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

async function main() {
  if (!fs.existsSync("deployment.json")) {
    throw new Error("deployment.json not found. Run deploy.js first.");
  }

  const d = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  console.log("Verifying deployment from:", d.deployedAt);

  // Counter
  console.log("\n[1/2] Verifying Counter...");
  try {
    await run("verify:verify", { address: d.counter, constructorArguments: [] });
    console.log("✓ Counter verified");
  } catch (e) {
    console.log(e.message.includes("Already Verified") ? "  Already verified." : "  Error: " + e.message);
  }

  // Factory
  console.log("\n[2/2] Verifying SmartAccountFactory...");
  try {
    await run("verify:verify", { address: d.factory, constructorArguments: [ENTRY_POINT_ADDRESS] });
    console.log("✓ Factory verified");
  } catch (e) {
    console.log(e.message.includes("Already Verified") ? "  Already verified." : "  Error: " + e.message);
  }

  console.log("\nEtherscan links:");
  console.log("  Counter :", `https://sepolia.etherscan.io/address/${d.counter}`);
  console.log("  Factory :", `https://sepolia.etherscan.io/address/${d.factory}`);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });