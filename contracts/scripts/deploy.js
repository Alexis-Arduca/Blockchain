const { ethers } = require("hardhat");

// EntryPoint v0.7 - Adresse identique et utilisé sur tout les réseaux
const ENTRY_POINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("EntryPoint v0.7:", ENTRY_POINT_ADDRESS);
  console.log("=".repeat(60));

  // Déploiement de la Factory
  console.log("\n[1/3] Deploying SmartAccountFactory...");

  const Factory = await ethers.getContractFactory("SmartAccountFactory");
  const factory = await Factory.deploy(ENTRY_POINT_ADDRESS);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("SmartAccountFactory deployed at:", factoryAddress);

  // Calcul de l'adresse contrefactuelle
  console.log("\n[2/3] Computing counterfactual address for deployer...");

  const ownerAddress = deployer.address;
  const salt = 0; // premier compte de l'owner

  const predictedAddress = await factory.getAddress(ownerAddress, salt);
  console.log("Counterfactual address:", predictedAddress);
  console.log("Already deployed?", (await ethers.provider.getCode(predictedAddress)) !== "0x");

  // Déploiement du SmartAccount via la Factory
  console.log("\n[3/3] Deploying SmartAccount via factory...");

  const tx = await factory.createAccount(ownerAddress, salt);
  const receipt = await tx.wait();

  console.log("SmartAccount deployed at:", predictedAddress);
  console.log("Transaction hash:", receipt.hash);
  console.log("Gas used:", receipt.gasUsed.toString());

  // Résumé final
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("SmartAccountFactory :", factoryAddress);
  console.log("SmartAccount :", predictedAddress);
  console.log("Owner :", ownerAddress);
  console.log("EntryPoint :", ENTRY_POINT_ADDRESS);
  console.log("=".repeat(60));

  // Sauvegarde des adresses pour les scripts suivants
  const fs = require("fs");
  const deploymentData = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    entryPoint: ENTRY_POINT_ADDRESS,
    factory: factoryAddress,
    smartAccount: predictedAddress,
    owner: ownerAddress,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("\n✓ Addresses saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
