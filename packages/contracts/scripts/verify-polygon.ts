import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Polygon PoS Mainnet USDC address
const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

async function main() {
  // Read deployment config
  const deploymentPath = path.resolve(__dirname, "../../../config/deployments/polygon.json");
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment config not found. Run deploy:polygon first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contractAddress = deployment.contracts.HushPayInvoices.address;
  const constructorArgs = deployment.contracts.HushPayInvoices.constructorArgs;

  if (!contractAddress) {
    throw new Error("Contract address not found in deployment config.");
  }

  console.log("Verifying HushPayInvoices at:", contractAddress);
  console.log("Constructor args:", constructorArgs);

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [
        constructorArgs.usdcToken,
        constructorArgs.feeRecipient,
        constructorArgs.feeBps,
      ],
    });
    console.log("✅ Contract verified on PolygonScan");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("Contract already verified");
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });
