import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Validate required environment variables for deployment
function getEnvVar(name: string, required: boolean = false): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || "";
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // Note: Don't fork mainnet for tests to avoid rate limiting
      // Enable forking only when needed with FORK_MAINNET=true
      forking: process.env.FORK_MAINNET === "true" && process.env.POLYGON_RPC_URL
        ? {
            url: process.env.POLYGON_RPC_URL,
          }
        : undefined,
    },
    polygon: {
      url: getEnvVar("POLYGON_RPC_URL") || "https://polygon-rpc.com",
      chainId: 137,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [`0x${process.env.DEPLOYER_PRIVATE_KEY.replace("0x", "")}`]
        : [],
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      polygon: getEnvVar("POLYGONSCAN_API_KEY"),
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
