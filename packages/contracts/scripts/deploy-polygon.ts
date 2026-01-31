import { ethers, run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Polygon PoS Mainnet USDC address
const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

async function main() {
  // Validate network
  if (network.name !== "polygon" && network.name !== "hardhat") {
    throw new Error(`Invalid network: ${network.name}. Use 'polygon' for mainnet deployment.`);
  }

  // Validate environment variables
  const requiredEnvVars = ["DEPLOYER_PRIVATE_KEY"];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying HushPayInvoices with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "MATIC");

  if (balance === 0n) {
    throw new Error("Deployer has no MATIC for gas fees");
  }

  // Get fee recipient (defaults to deployer if not set)
  const feeRecipient = process.env.FEE_RECIPIENT_ADDRESS || deployer.address;
  const feeBps = parseInt(process.env.FEE_BPS || "50", 10);

  console.log("\nDeployment parameters:");
  console.log("- USDC Token:", USDC_ADDRESS);
  console.log("- Fee Recipient:", feeRecipient);
  console.log("- Fee BPS:", feeBps, `(${feeBps / 100}%)`);

  // Deploy contract
  console.log("\nDeploying HushPayInvoices...");
  const HushPayInvoices = await ethers.getContractFactory("HushPayInvoices");
  const hushPay = await HushPayInvoices.deploy(
    USDC_ADDRESS,
    feeRecipient,
    feeBps
  );

  await hushPay.waitForDeployment();
  const contractAddress = await hushPay.getAddress();

  console.log("\n✅ HushPayInvoices deployed to:", contractAddress);

  // Get deployment transaction
  const deployTx = hushPay.deploymentTransaction();
  const txHash = deployTx?.hash || "";

  console.log("Transaction hash:", txHash);
  console.log("Block explorer:", `https://polygonscan.com/address/${contractAddress}`);

  // Update deployment config
  const deploymentPath = path.resolve(__dirname, "../../../config/deployments/polygon.json");
  const deployment = {
    chainId: 137,
    network: "polygon",
    contracts: {
      HushPayInvoices: {
        address: contractAddress,
        deployedAt: new Date().toISOString(),
        deployTxHash: txHash,
        constructorArgs: {
          usdcToken: USDC_ADDRESS,
          feeRecipient: feeRecipient,
          feeBps: feeBps
        }
      }
    }
  };

  // Ensure directory exists
  const deploymentDir = path.dirname(deploymentPath);
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\n📝 Deployment config saved to:", deploymentPath);

  // Export ABI for frontend
  const abiPath = path.resolve(__dirname, "../../../apps/web/src/abi/HushPayInvoices.json");
  const abiDir = path.dirname(abiPath);
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  const artifact = await ethers.getContractFactory("HushPayInvoices");
  const abi = artifact.interface.formatJson();
  fs.writeFileSync(abiPath, abi);
  console.log("📝 ABI exported to:", abiPath);

  // Verify on PolygonScan if API key is provided
  if (process.env.POLYGONSCAN_API_KEY && network.name === "polygon") {
    console.log("\n🔍 Verifying contract on PolygonScan...");
    
    // Wait for a few block confirmations
    console.log("Waiting for block confirmations...");
    await deployTx?.wait(5);

    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [USDC_ADDRESS, feeRecipient, feeBps],
      });
      console.log("✅ Contract verified on PolygonScan");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract already verified");
      } else {
        console.error("Verification failed:", error.message);
      }
    }
  }

  console.log("\n🎉 Deployment complete!");
  console.log("\nNext steps:");
  console.log(`1. Set VITE_INVOICE_CONTRACT_ADDRESS=${contractAddress} in apps/web/.env`);
  console.log("2. Run 'npm run build:web' to build the frontend");
  console.log("3. Deploy to Vercel");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });
