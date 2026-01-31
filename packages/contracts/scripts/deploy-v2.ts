import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy HushPay V2 Contracts
 * Order: FeeManager -> MerchantRegistry -> InvoicesV2 -> Disputes -> Milestones
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying HushPay V2 contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", network.name);
  console.log("");

  // Configuration
  const USDC_ADDRESS = process.env.VITE_USDC_ADDRESS || "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
  const FEE_BPS = parseInt(process.env.FEE_BPS || "50"); // 0.5% default
  const FEE_RECIPIENT = process.env.FEE_RECIPIENT_ADDRESS || deployer.address;

  console.log("Configuration:");
  console.log("  USDC Address:", USDC_ADDRESS);
  console.log("  Fee BPS:", FEE_BPS, `(${FEE_BPS / 100}%)`);
  console.log("  Fee Recipient:", FEE_RECIPIENT);
  console.log("");

  const deployments: Record<string, string> = {};

  // 1. Deploy FeeManager
  console.log("1. Deploying HushPayFeeManager...");
  const FeeManager = await ethers.getContractFactory("HushPayFeeManager");
  const feeManager = await FeeManager.deploy(FEE_RECIPIENT, FEE_BPS, deployer.address);
  await feeManager.waitForDeployment();
  const feeManagerAddress = await feeManager.getAddress();
  deployments.feeManager = feeManagerAddress;
  console.log("   HushPayFeeManager deployed to:", feeManagerAddress);

  // 2. Deploy MerchantRegistry
  console.log("2. Deploying HushPayMerchantRegistry...");
  const MerchantRegistry = await ethers.getContractFactory("HushPayMerchantRegistry");
  const merchantRegistry = await MerchantRegistry.deploy(deployer.address);
  await merchantRegistry.waitForDeployment();
  const registryAddress = await merchantRegistry.getAddress();
  deployments.merchantRegistry = registryAddress;
  console.log("   HushPayMerchantRegistry deployed to:", registryAddress);

  // 3. Deploy InvoicesV2 (without disputes for now)
  console.log("3. Deploying HushPayInvoicesV2...");
  const InvoicesV2 = await ethers.getContractFactory("HushPayInvoicesV2");
  const invoicesV2 = await InvoicesV2.deploy(
    USDC_ADDRESS,
    feeManagerAddress,
    registryAddress,
    ethers.ZeroAddress // Disputes contract will be set later
  );
  await invoicesV2.waitForDeployment();
  const invoicesV2Address = await invoicesV2.getAddress();
  deployments.invoicesV2 = invoicesV2Address;
  console.log("   HushPayInvoicesV2 deployed to:", invoicesV2Address);

  // 4. Deploy Disputes
  console.log("4. Deploying HushPayDisputes...");
  const Disputes = await ethers.getContractFactory("HushPayDisputes");
  const disputes = await Disputes.deploy(invoicesV2Address, deployer.address);
  await disputes.waitForDeployment();
  const disputesAddress = await disputes.getAddress();
  deployments.disputes = disputesAddress;
  console.log("   HushPayDisputes deployed to:", disputesAddress);

  // 5. Update InvoicesV2 with Disputes contract
  console.log("5. Setting disputes contract on InvoicesV2...");
  await invoicesV2.setDisputesContract(disputesAddress);
  console.log("   Disputes contract linked to InvoicesV2");

  // 6. Deploy Milestones
  console.log("6. Deploying HushPayMilestones...");
  const Milestones = await ethers.getContractFactory("HushPayMilestones");
  const milestones = await Milestones.deploy(
    USDC_ADDRESS,
    feeManagerAddress,
    registryAddress
  );
  await milestones.waitForDeployment();
  const milestonesAddress = await milestones.getAddress();
  deployments.milestones = milestonesAddress;
  console.log("   HushPayMilestones deployed to:", milestonesAddress);

  // Add V1 invoice contract address if exists
  if (process.env.VITE_INVOICE_CONTRACT_ADDRESS) {
    deployments.invoicesV1 = process.env.VITE_INVOICE_CONTRACT_ADDRESS;
  }

  // Save deployments to file
  const deploymentsDir = path.join(__dirname, "..", "config", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
  const deploymentData = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    usdc: USDC_ADDRESS,
    contracts: deployments
  };

  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  console.log("");
  console.log("Deployment saved to:", deploymentFile);

  // Summary
  console.log("");
  console.log("========================================");
  console.log("HushPay V2 Deployment Complete!");
  console.log("========================================");
  console.log("");
  console.log("Contract Addresses:");
  console.log("  FeeManager:       ", feeManagerAddress);
  console.log("  MerchantRegistry: ", registryAddress);
  console.log("  InvoicesV2:       ", invoicesV2Address);
  console.log("  Disputes:         ", disputesAddress);
  console.log("  Milestones:       ", milestonesAddress);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Verify contracts on PolygonScan");
  console.log("  2. Update frontend .env with new contract addresses");
  console.log("  3. Generate new ABIs: npx hardhat export-abi");
  console.log("");

  return deployments;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
