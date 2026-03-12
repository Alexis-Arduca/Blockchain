/**
 * SmartAccount.test.js (Generate by IA)
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

function mockUserOpHash() {
  return ethers.keccak256(ethers.toUtf8Bytes("mock-userop-" + Date.now()));
}

async function signHash(signer, hash) {
  return signer.signMessage(ethers.getBytes(hash));
}

function buildUserOp(sender, callData, signature) {
  return {
    sender,
    nonce: 0,
    initCode: "0x",
    callData,
    accountGasLimits: ethers.zeroPadBytes("0x", 32),
    preVerificationGas: 0,
    gasFees: ethers.zeroPadBytes("0x", 32),
    paymasterAndData: "0x",
    signature,
  };
}

function encodeExecute(target, value, innerCallData) {
  const iface = new ethers.Interface([
    "function execute(address target, uint256 value, bytes calldata data)",
  ]);
  return iface.encodeFunctionData("execute", [target, value, innerCallData]);
}

describe("SmartAccount + SmartAccountFactory", function () {
  let mockEntryPoint;
  let factory;
  let account;
  let owner;
  let sessionKeySigner;
  let attacker;
  let counter;

  const SALT = 0;
  const INCREMENT_SELECTOR = "0xd09de08a";
  const TRANSFER_SELECTOR  = "0xa9059cbb";

  before(async function () {
    [owner, sessionKeySigner, attacker] = await ethers.getSigners();

    const MockEP = await ethers.getContractFactory("MockEntryPoint");
    mockEntryPoint = await MockEP.deploy();
    const epAddress = await mockEntryPoint.getAddress();

    const Factory = await ethers.getContractFactory("SmartAccountFactory");
    factory = await Factory.deploy(epAddress);

    await factory.createAccount(owner.address, SALT);

    // Utilise getFunction pour éviter le conflit avec ethers.js getAddress()
    const accountAddress = await factory.getFunction("getAddress")(owner.address, SALT);
    account = await ethers.getContractAt("SmartAccount", accountAddress);

    await owner.sendTransaction({ to: accountAddress, value: ethers.parseEther("1") });

    const Counter = await ethers.getContractFactory("Counter");
    counter = await Counter.deploy();
  });

  // Helper : appelle validateUserOp depuis l'adresse du MockEntryPoint
  async function callValidate(userOp, hash, missingFunds = 0) {
    return await ethers.provider.call({
      from: await mockEntryPoint.getAddress(),
      to: await account.getAddress(),
      data: account.interface.encodeFunctionData("validateUserOp", [userOp, hash, missingFunds]),
    }).then(r => account.interface.decodeFunctionResult("validateUserOp", r)[0]);
  }

  // ===========================================================================
  // Factory
  // ===========================================================================

  describe("SmartAccountFactory", function () {
    it("should have correct entryPoint", async function () {
      expect(await factory.entryPoint()).to.equal(await mockEntryPoint.getAddress());
    });

    it("should deploy at the predicted address", async function () {
      const predicted = await factory.getFunction("getAddress")(owner.address, SALT);
      expect(await ethers.provider.getCode(predicted)).to.not.equal("0x");
      expect(predicted).to.equal(await account.getAddress());
    });

    it("should be idempotent on duplicate createAccount", async function () {
      await expect(factory.createAccount(owner.address, SALT)).to.not.be.reverted;
    });

    it("should produce different addresses for different salts", async function () {
      const addr0 = await factory.getFunction("getAddress")(owner.address, 0);
      const addr1 = await factory.getFunction("getAddress")(owner.address, 1);
      expect(addr0).to.not.equal(addr1);
    });
  });

  // ===========================================================================
  // Setup
  // ===========================================================================

  describe("SmartAccount setup", function () {
    it("should have correct owner", async function () {
      expect(await account.owner()).to.equal(owner.address);
    });

    it("should have correct entryPoint", async function () {
      expect(await account.entryPoint()).to.equal(await mockEntryPoint.getAddress());
    });
  });

  // ===========================================================================
  // validateUserOp — Owner ECDSA
  // ===========================================================================

  describe("validateUserOp — Owner ECDSA", function () {
    it("should return 0 for valid owner signature", async function () {
      const hash = mockUserOpHash();
      const sig = await signHash(owner, hash);
      const callData = encodeExecute(await counter.getAddress(), 0, "0x");
      const userOp = buildUserOp(await account.getAddress(), callData, sig);
      expect(await callValidate(userOp, hash)).to.equal(0n);
    });

    it("should return 1 for wrong signer", async function () {
      const hash = mockUserOpHash();
      const sig = await signHash(attacker, hash);
      const callData = encodeExecute(await counter.getAddress(), 0, "0x");
      const userOp = buildUserOp(await account.getAddress(), callData, sig);
      expect(await callValidate(userOp, hash)).to.equal(1n);
    });

    it("should revert if not called by entryPoint", async function () {
      const hash = mockUserOpHash();
      const sig = await signHash(owner, hash);
      const callData = encodeExecute(await counter.getAddress(), 0, "0x");
      const userOp = buildUserOp(await account.getAddress(), callData, sig);
      await expect(
        account.connect(attacker).validateUserOp(userOp, hash, 0)
      ).to.be.revertedWithCustomError(account, "NotEntryPoint");
    });
  });

  // ===========================================================================
  // Session Keys — Management
  // ===========================================================================

  describe("Session Keys — Management", function () {
    it("should allow owner to add a session key", async function () {
      const expiry = (await time.latest()) + 3600;
      await expect(
        account.connect(owner).addSessionKey(sessionKeySigner.address, expiry, [INCREMENT_SELECTOR])
      )
        .to.emit(account, "SessionKeyAdded")
        .withArgs(sessionKeySigner.address, expiry);
    });

    it("should report session key as valid", async function () {
      expect(await account.isSessionKeyValid(sessionKeySigner.address)).to.be.true;
    });

    it("should report correct selector authorization", async function () {
      expect(await account.isSessionKeyAllowed(sessionKeySigner.address, INCREMENT_SELECTOR)).to.be.true;
      expect(await account.isSessionKeyAllowed(sessionKeySigner.address, TRANSFER_SELECTOR)).to.be.false;
    });

    it("should revert if non-owner tries to add session key", async function () {
      await expect(
        account.connect(attacker).addSessionKey(attacker.address, 0, [INCREMENT_SELECTOR])
      ).to.be.revertedWithCustomError(account, "NotOwner");
    });

    it("should allow owner to revoke a session key", async function () {
      await expect(account.connect(owner).revokeSessionKey(sessionKeySigner.address))
        .to.emit(account, "SessionKeyRevoked")
        .withArgs(sessionKeySigner.address);
      expect(await account.isSessionKeyValid(sessionKeySigner.address)).to.be.false;
    });
  });

  // ===========================================================================
  // validateUserOp — Session Keys
  // ===========================================================================

  describe("validateUserOp — Session Keys", function () {
    beforeEach(async function () {
      try { await account.connect(owner).revokeSessionKey(sessionKeySigner.address); } catch {}
      const expiry = (await time.latest()) + 3600;
      await account.connect(owner).addSessionKey(sessionKeySigner.address, expiry, [INCREMENT_SELECTOR]);
    });

    it("should return 0 for valid session key with allowed selector", async function () {
      const hash = mockUserOpHash();
      const sig = await signHash(sessionKeySigner, hash);
      const innerCallData = counter.interface.encodeFunctionData("increment");
      const callData = encodeExecute(await counter.getAddress(), 0, innerCallData);
      const userOp = buildUserOp(await account.getAddress(), callData, sig);
      expect(await callValidate(userOp, hash)).to.equal(0n);
    });

    it("should return 1 for session key with forbidden selector", async function () {
      const hash = mockUserOpHash();
      const sig = await signHash(sessionKeySigner, hash);
      const fakeInner = TRANSFER_SELECTOR + "00".repeat(64);
      const callData = encodeExecute(await counter.getAddress(), 0, fakeInner);
      const userOp = buildUserOp(await account.getAddress(), callData, sig);
      expect(await callValidate(userOp, hash)).to.equal(1n);
    });

    it("should return 1 for expired session key", async function () {
      await account.connect(owner).revokeSessionKey(sessionKeySigner.address);
      const pastExpiry = (await time.latest()) - 1;
      await account.connect(owner).addSessionKey(sessionKeySigner.address, pastExpiry, [INCREMENT_SELECTOR]);

      const hash = mockUserOpHash();
      const sig = await signHash(sessionKeySigner, hash);
      const innerCallData = counter.interface.encodeFunctionData("increment");
      const callData = encodeExecute(await counter.getAddress(), 0, innerCallData);
      const userOp = buildUserOp(await account.getAddress(), callData, sig);
      expect(await callValidate(userOp, hash)).to.equal(1n);
    });

    it("should return 1 for revoked session key", async function () {
      await account.connect(owner).revokeSessionKey(sessionKeySigner.address);

      const hash = mockUserOpHash();
      const sig = await signHash(sessionKeySigner, hash);
      const innerCallData = counter.interface.encodeFunctionData("increment");
      const callData = encodeExecute(await counter.getAddress(), 0, innerCallData);
      const userOp = buildUserOp(await account.getAddress(), callData, sig);
      expect(await callValidate(userOp, hash)).to.equal(1n);
    });
  });

  // ===========================================================================
  // execute
  // ===========================================================================

  describe("execute", function () {
    it("should execute a call to Counter.increment via MockEntryPoint", async function () {
      const innerCallData = counter.interface.encodeFunctionData("increment");
      const accountAddress = await account.getAddress();

      await mockEntryPoint.callExecute(
        accountAddress,
        await counter.getAddress(),
        0,
        innerCallData
      );

      expect(await counter.getCount(accountAddress)).to.equal(1n);
    });

    it("should revert if caller is not entryPoint", async function () {
      const innerCallData = counter.interface.encodeFunctionData("increment");
      await expect(
        account.connect(attacker).execute(await counter.getAddress(), 0, innerCallData)
      ).to.be.revertedWithCustomError(account, "NotEntryPoint");
    });
  });
});