const { ethers } = require("hardhat");
const fs = require("fs");

const ENTRY_POINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Deployer :", deployer.address);
  console.log("Balance :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network :", network.name);

  // Counter
  console.log("\n[1/3] Deploying Counter...");
  const Counter = await ethers.getContractFactory("Counter");
  const counter = await Counter.deploy();
  await counter.waitForDeployment();
  console.log("Counter:", await counter.getAddress());

  // SmartAccountFactory
  console.log("\n[2/3] Deploying SmartAccountFactory...");
  const Factory = await ethers.getContractFactory("SmartAccountFactory");
  const factory = await Factory.deploy(ENTRY_POINT_ADDRESS);
  await factory.waitForDeployment();
  console.log("Factory:", await factory.getAddress());

  // SmartAccount
  console.log("\n[3/3] Deploying SmartAccount...");
  const tx = await factory.createAccount(deployer.address, 0);
  await tx.wait();
  const accountAddress = await factory.getFunction("getAddress")(deployer.address, 0);
  console.log("SmartAccount:", accountAddress);

  // Saving
  const deployment = {
    network: network.name,
    chainId: network.chainId.toString(),
    entryPoint: ENTRY_POINT_ADDRESS,
    counter: await counter.getAddress(),
    factory: await factory.getAddress(),
    smartAccount: accountAddress,
    owner: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync("deployment.json", JSON.stringify(deployment, null, 2));

  console.log("\n=".repeat(50));
  console.log("Counter :", deployment.counter);
  console.log("Factory :", deployment.factory);
  console.log("SmartAccount :", deployment.smartAccount);
  console.log("=".repeat(50));
  console.log("Saved to deployment.json");
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });