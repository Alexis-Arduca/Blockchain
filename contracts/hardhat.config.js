require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.25",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
      viaIR: false,
    },
  },
  networks: {
    // Réseau local (Uniquement utile pour mes tests)
    hardhat: {
      chainId: 31337,
    },
    // Testnet Sepolia
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  // Vérification Etherscan
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  // Source maps et artifacts
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
