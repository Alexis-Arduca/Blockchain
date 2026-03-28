import { ethers } from "ethers";
import { ADDRESSES, ENTRY_POINT_ABI, FACTORY_ABI } from "../abis";

export async function buildUserOp({ sender, callData, provider }) {
  const entryPoint = new ethers.Contract(ADDRESSES.entryPoint, ENTRY_POINT_ABI, provider);
  const nonce = await entryPoint.getNonce(sender, 0);

  // Ici j'utilise getBlock plutôt que getFeeData pour éviter eth_maxPriorityFeePerGas
  const block = await provider.getBlock("latest");
  const baseFee = block.baseFeePerGas ?? ethers.parseUnits("1", "gwei");
  const maxPriorityFeePerGas = ethers.parseUnits("1.5", "gwei");
  const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas;

  return {
    sender,
    nonce,
    callData,
    callGasLimit:         150000n,
    verificationGasLimit: 250000n,
    preVerificationGas:    50000n,
    maxFeePerGas,
    maxPriorityFeePerGas,
    signature: "0x",
  };
}

export async function getUserOpHash(userOp, provider) {
  const entryPoint = new ethers.Contract(ADDRESSES.entryPoint, ENTRY_POINT_ABI, provider);
  const packed = {
    sender:            userOp.sender,
    nonce:             userOp.nonce,
    initCode:          "0x",
    callData:          userOp.callData,
    accountGasLimits:  ethers.solidityPacked(
      ["uint128", "uint128"],
      [userOp.verificationGasLimit, userOp.callGasLimit]
    ),
    preVerificationGas: userOp.preVerificationGas,
    gasFees: ethers.solidityPacked(
      ["uint128", "uint128"],
      [userOp.maxPriorityFeePerGas, userOp.maxFeePerGas]
    ),
    paymasterAndData: "0x",
    signature:        "0x",
  };

  const hash = await entryPoint.getUserOpHash(packed);
  console.log("Hash from EntryPoint:", hash);
  return hash;
}

export function encodeExecute(target, value, innerCallData) {
  const iface = new ethers.Interface([
    "function execute(address target, uint256 value, bytes calldata data)",
  ]);
  return iface.encodeFunctionData("execute", [target, value, innerCallData]);
}

export function encodeInitCode(ownerAddress, salt = 0) {
  const factoryIface = new ethers.Interface(FACTORY_ABI);
  const callData = factoryIface.encodeFunctionData("createAccount", [ownerAddress, salt]);
  return ethers.concat([ADDRESSES.factory, callData]);
}

export async function sendUserOp(userOp, bundlerUrl) {
  const serialized = {
    sender:               userOp.sender,
    nonce:                ethers.toBeHex(userOp.nonce),
    callData:             userOp.callData,
    callGasLimit:         ethers.toBeHex(userOp.callGasLimit),
    verificationGasLimit: ethers.toBeHex(userOp.verificationGasLimit),
    preVerificationGas:   ethers.toBeHex(userOp.preVerificationGas),
    maxFeePerGas:         ethers.toBeHex(userOp.maxFeePerGas),
    maxPriorityFeePerGas: ethers.toBeHex(userOp.maxPriorityFeePerGas),
    signature:            userOp.signature,
  };

  const res = await fetch(bundlerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_sendUserOperation",
      params: [serialized, ADDRESSES.entryPoint],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

export async function waitForUserOp(userOpHash, bundlerUrl, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(bundlerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getUserOperationReceipt",
        params: [userOpHash],
      }),
    });
    const data = await res.json();
    if (data.result) return data.result;
  }
  throw new Error("UserOp non minée après timeout");
}
