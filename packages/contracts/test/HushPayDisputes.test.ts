import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { 
  HushPayDisputes, 
  HushPayInvoices,
  MockUSDC 
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("HushPayDisputes", function () {
  let disputes: HushPayDisputes;
  let invoices: HushPayInvoices;
  let usdc: MockUSDC;
  let admin: SignerWithAddress;
  let arbiter: SignerWithAddress;
  let merchant: SignerWithAddress;
  let payer: SignerWithAddress;
  let feeRecipient: SignerWithAddress;

  const INVOICE_AMOUNT = ethers.parseUnits("100", 6); // 100 USDC
  const FEE_BPS = 50; // 0.5%
  const DISPUTE_WINDOW = 7 * 24 * 60 * 60; // 7 days

  beforeEach(async function () {
    [admin, arbiter, merchant, payer, feeRecipient] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Deploy Invoices contract
    const Invoices = await ethers.getContractFactory("HushPayInvoices");
    invoices = await Invoices.deploy(
      await usdc.getAddress(),
      feeRecipient.address,
      FEE_BPS
    );
    await invoices.waitForDeployment();

    // Deploy Disputes contract
    const Disputes = await ethers.getContractFactory("HushPayDisputes");
    disputes = await Disputes.deploy(
      await invoices.getAddress(),
      admin.address
    );
    await disputes.waitForDeployment();

    // Grant arbiter role
    const ARBITER_ROLE = await disputes.ARBITER_ROLE();
    await disputes.connect(admin).grantRole(ARBITER_ROLE, arbiter.address);

    // Mint USDC to payer
    await usdc.mint(payer.address, ethers.parseUnits("1000", 6));
    await usdc.connect(payer).approve(await invoices.getAddress(), ethers.MaxUint256);
  });

  async function createAndPayInvoice(): Promise<bigint> {
    // Create invoice - v1 signature: (usdcAmount, dueAt, memoHash, metadataCID)
    const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test Invoice"));
    await invoices.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
    const invoiceId = 1n;

    // Pay invoice
    await invoices.connect(payer).payInvoice(invoiceId);

    // Transfer funds to disputes contract for escrow simulation
    await usdc.mint(await disputes.getAddress(), INVOICE_AMOUNT);

    return invoiceId;
  }

  describe("Deployment", function () {
    it("Should set the correct invoices contract", async function () {
      expect(await disputes.invoicesContract()).to.equal(await invoices.getAddress());
    });

    it("Should set the correct USDC token", async function () {
      expect(await disputes.usdcToken()).to.equal(await usdc.getAddress());
    });

    it("Should set default dispute window", async function () {
      expect(await disputes.disputeWindow()).to.equal(DISPUTE_WINDOW);
    });
  });

  describe("Open Dispute", function () {
    it("Should open dispute for paid invoice", async function () {
      const invoiceId = await createAndPayInvoice();

      await expect(
        disputes.connect(payer).openDispute(invoiceId, "Quality issues")
      ).to.emit(disputes, "DisputeOpened");

      const dispute = await disputes.getDispute(1);
      expect(dispute.invoiceId).to.equal(invoiceId);
      expect(dispute.payer).to.equal(payer.address);
      expect(dispute.merchant).to.equal(merchant.address);
      expect(dispute.amount).to.equal(INVOICE_AMOUNT);
      expect(dispute.status).to.equal(1); // Open
    });

    it("Should revert if not payer", async function () {
      const invoiceId = await createAndPayInvoice();

      await expect(
        disputes.connect(merchant).openDispute(invoiceId, "Reason")
      ).to.be.revertedWithCustomError(disputes, "NotInvoicePayer");
    });

    it("Should revert if dispute window expired", async function () {
      const invoiceId = await createAndPayInvoice();

      // Fast forward past dispute window
      await time.increase(DISPUTE_WINDOW + 1);

      await expect(
        disputes.connect(payer).openDispute(invoiceId, "Reason")
      ).to.be.revertedWithCustomError(disputes, "DisputeWindowExpired");
    });

    it("Should revert if dispute already exists", async function () {
      const invoiceId = await createAndPayInvoice();

      await disputes.connect(payer).openDispute(invoiceId, "Reason");

      await expect(
        disputes.connect(payer).openDispute(invoiceId, "Another reason")
      ).to.be.revertedWithCustomError(disputes, "DisputeAlreadyExists");
    });
  });

  describe("Resolve Dispute - Release to Merchant", function () {
    it("Should resolve in favor of merchant", async function () {
      const invoiceId = await createAndPayInvoice();
      await disputes.connect(payer).openDispute(invoiceId, "Reason");

      const merchantBalanceBefore = await usdc.balanceOf(merchant.address);

      await expect(
        disputes.connect(arbiter).resolveRelease(1)
      ).to.emit(disputes, "DisputeResolved");

      const dispute = await disputes.getDispute(1);
      expect(dispute.status).to.equal(2); // Resolved
      expect(dispute.outcome).to.equal(1); // ReleasedToMerchant
      expect(dispute.resolvedBy).to.equal(arbiter.address);

      // Check merchant received funds
      const merchantBalanceAfter = await usdc.balanceOf(merchant.address);
      expect(merchantBalanceAfter - merchantBalanceBefore).to.equal(INVOICE_AMOUNT);
    });

    it("Should revert if not arbiter", async function () {
      const invoiceId = await createAndPayInvoice();
      await disputes.connect(payer).openDispute(invoiceId, "Reason");

      await expect(
        disputes.connect(merchant).resolveRelease(1)
      ).to.be.reverted;
    });
  });

  describe("Resolve Dispute - Refund to Payer", function () {
    it("Should resolve in favor of payer", async function () {
      const invoiceId = await createAndPayInvoice();
      await disputes.connect(payer).openDispute(invoiceId, "Reason");

      const payerBalanceBefore = await usdc.balanceOf(payer.address);

      await expect(
        disputes.connect(arbiter).resolveRefund(1)
      ).to.emit(disputes, "DisputeResolved");

      const dispute = await disputes.getDispute(1);
      expect(dispute.outcome).to.equal(2); // RefundedToPayer

      // Check payer received refund
      const payerBalanceAfter = await usdc.balanceOf(payer.address);
      expect(payerBalanceAfter - payerBalanceBefore).to.equal(INVOICE_AMOUNT);
    });
  });

  describe("Resolve Dispute - Split", function () {
    it("Should split funds between parties", async function () {
      const invoiceId = await createAndPayInvoice();
      await disputes.connect(payer).openDispute(invoiceId, "Reason");

      const merchantAmount = ethers.parseUnits("60", 6); // 60 USDC to merchant
      const payerAmount = ethers.parseUnits("40", 6); // 40 USDC to payer

      const merchantBalanceBefore = await usdc.balanceOf(merchant.address);
      const payerBalanceBefore = await usdc.balanceOf(payer.address);

      await expect(
        disputes.connect(arbiter).resolveSplit(1, merchantAmount)
      ).to.emit(disputes, "DisputeResolved");

      const dispute = await disputes.getDispute(1);
      expect(dispute.outcome).to.equal(3); // Split
      expect(dispute.merchantAmount).to.equal(merchantAmount);
      expect(dispute.payerAmount).to.equal(payerAmount);

      // Check balances
      const merchantBalanceAfter = await usdc.balanceOf(merchant.address);
      const payerBalanceAfter = await usdc.balanceOf(payer.address);
      expect(merchantBalanceAfter - merchantBalanceBefore).to.equal(merchantAmount);
      expect(payerBalanceAfter - payerBalanceBefore).to.equal(payerAmount);
    });

    it("Should revert if split amounts exceed total", async function () {
      const invoiceId = await createAndPayInvoice();
      await disputes.connect(payer).openDispute(invoiceId, "Reason");

      const invalidMerchantAmount = INVOICE_AMOUNT + 1n;

      await expect(
        disputes.connect(arbiter).resolveSplit(1, invalidMerchantAmount)
      ).to.be.revertedWithCustomError(disputes, "InvalidSplitAmounts");
    });
  });

  describe("View Functions", function () {
    it("Should check hasActiveDispute", async function () {
      const invoiceId = await createAndPayInvoice();

      expect(await disputes.hasActiveDispute(invoiceId)).to.be.false;

      await disputes.connect(payer).openDispute(invoiceId, "Reason");
      expect(await disputes.hasActiveDispute(invoiceId)).to.be.true;

      await disputes.connect(arbiter).resolveRelease(1);
      expect(await disputes.hasActiveDispute(invoiceId)).to.be.false;
    });

    it("Should check canOpenDispute", async function () {
      const invoiceId = await createAndPayInvoice();
      expect(await disputes.canOpenDispute(invoiceId)).to.be.true;

      await time.increase(DISPUTE_WINDOW + 1);
      expect(await disputes.canOpenDispute(invoiceId)).to.be.false;
    });

    it("Should return dispute window remaining", async function () {
      const invoiceId = await createAndPayInvoice();

      const remaining = await disputes.disputeWindowRemaining(invoiceId);
      expect(remaining).to.be.greaterThan(0);
      expect(remaining).to.be.lessThanOrEqual(DISPUTE_WINDOW);
    });
  });

  describe("Admin Functions", function () {
    it("Should update dispute window", async function () {
      const newWindow = 14 * 24 * 60 * 60; // 14 days

      await expect(
        disputes.connect(admin).setDisputeWindow(newWindow)
      ).to.emit(disputes, "DisputeWindowUpdated");

      expect(await disputes.disputeWindow()).to.equal(newWindow);
    });

    it("Should pause and unpause", async function () {
      await disputes.connect(admin).pause();

      const invoiceId = await createAndPayInvoice();

      await expect(
        disputes.connect(payer).openDispute(invoiceId, "Reason")
      ).to.be.reverted; // EnforcedPause

      await disputes.connect(admin).unpause();

      await expect(
        disputes.connect(payer).openDispute(invoiceId, "Reason")
      ).to.not.be.reverted;
    });
  });
});
