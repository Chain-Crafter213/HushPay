import { expect } from "chai";
import { ethers } from "hardhat";
import { 
  HushPayMilestones, 
  HushPayFeeManager,
  MockUSDC 
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("HushPayMilestones", function () {
  let milestones: HushPayMilestones;
  let feeManager: HushPayFeeManager;
  let usdc: MockUSDC;
  let admin: SignerWithAddress;
  let merchant: SignerWithAddress;
  let payer: SignerWithAddress;
  let feeRecipient: SignerWithAddress;

  const FEE_BPS = 50; // 0.5%
  const MILESTONE_1_AMOUNT = ethers.parseUnits("100", 6);
  const MILESTONE_2_AMOUNT = ethers.parseUnits("200", 6);
  const MILESTONE_3_AMOUNT = ethers.parseUnits("300", 6);
  const TOTAL_AMOUNT = MILESTONE_1_AMOUNT + MILESTONE_2_AMOUNT + MILESTONE_3_AMOUNT;

  beforeEach(async function () {
    [admin, merchant, payer, feeRecipient] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Deploy FeeManager
    const FeeManager = await ethers.getContractFactory("HushPayFeeManager");
    feeManager = await FeeManager.deploy(feeRecipient.address, FEE_BPS, admin.address);
    await feeManager.waitForDeployment();

    // Deploy Milestones
    const Milestones = await ethers.getContractFactory("HushPayMilestones");
    milestones = await Milestones.deploy(
      await usdc.getAddress(),
      await feeManager.getAddress(),
      ethers.ZeroAddress // No merchant registry for basic tests
    );
    await milestones.waitForDeployment();

    // Mint USDC to payer
    await usdc.mint(payer.address, ethers.parseUnits("10000", 6));
    await usdc.connect(payer).approve(await milestones.getAddress(), ethers.MaxUint256);
  });

  describe("Create Milestone Invoice", function () {
    it("Should create invoice with milestones", async function () {
      const amounts = [MILESTONE_1_AMOUNT, MILESTONE_2_AMOUNT, MILESTONE_3_AMOUNT];
      const descriptions = ["Design", "Development", "Testing"];
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Project Invoice"));

      await expect(
        milestones.connect(merchant).createInvoice(amounts, descriptions, memoHash, 0, "")
      ).to.emit(milestones, "MilestoneInvoiceCreated");

      const invoice = await milestones.getInvoice(1);
      expect(invoice.merchant).to.equal(merchant.address);
      expect(invoice.totalAmount).to.equal(TOTAL_AMOUNT);
      expect(invoice.milestoneCount).to.equal(3);
      expect(invoice.status).to.equal(0); // Active
    });

    it("Should emit MilestoneAdded events", async function () {
      const amounts = [MILESTONE_1_AMOUNT, MILESTONE_2_AMOUNT];
      const descriptions = ["Phase 1", "Phase 2"];
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Invoice"));

      await expect(
        milestones.connect(merchant).createInvoice(amounts, descriptions, memoHash, 0, "")
      ).to.emit(milestones, "MilestoneAdded");
    });

    it("Should revert with no milestones", async function () {
      await expect(
        milestones.connect(merchant).createInvoice([], [], ethers.ZeroHash, 0, "")
      ).to.be.revertedWithCustomError(milestones, "InvalidMilestoneCount");
    });

    it("Should revert with mismatched arrays", async function () {
      const amounts = [MILESTONE_1_AMOUNT];
      const descriptions = ["Desc 1", "Desc 2"];

      await expect(
        milestones.connect(merchant).createInvoice(amounts, descriptions, ethers.ZeroHash, 0, "")
      ).to.be.revertedWithCustomError(milestones, "InvalidMilestoneCount");
    });

    it("Should revert with zero amount milestone", async function () {
      const amounts = [MILESTONE_1_AMOUNT, 0n];
      const descriptions = ["Desc 1", "Desc 2"];

      await expect(
        milestones.connect(merchant).createInvoice(amounts, descriptions, ethers.ZeroHash, 0, "")
      ).to.be.revertedWithCustomError(milestones, "InvalidAmount");
    });
  });

  describe("Pay Milestones", function () {
    beforeEach(async function () {
      const amounts = [MILESTONE_1_AMOUNT, MILESTONE_2_AMOUNT, MILESTONE_3_AMOUNT];
      const descriptions = ["Phase 1", "Phase 2", "Phase 3"];
      await milestones.connect(merchant).createInvoice(amounts, descriptions, ethers.ZeroHash, 0, "");
    });

    it("Should pay first milestone", async function () {
      await expect(
        milestones.connect(payer).payMilestone(1, 0)
      ).to.emit(milestones, "MilestonePaid")
        .withArgs(1, 0, payer.address, MILESTONE_1_AMOUNT);

      const milestone = await milestones.getMilestone(1, 0);
      expect(milestone.status).to.equal(1); // Paid

      const invoice = await milestones.getInvoice(1);
      expect(invoice.paidAmount).to.equal(MILESTONE_1_AMOUNT);
      expect(invoice.payer).to.equal(payer.address);
    });

    it("Should pay milestones sequentially", async function () {
      await milestones.connect(payer).payMilestone(1, 0);
      await milestones.connect(payer).payMilestone(1, 1);

      const invoice = await milestones.getInvoice(1);
      expect(invoice.paidAmount).to.equal(MILESTONE_1_AMOUNT + MILESTONE_2_AMOUNT);
    });

    it("Should revert if paying out of order", async function () {
      await expect(
        milestones.connect(payer).payMilestone(1, 1)
      ).to.be.revertedWithCustomError(milestones, "PreviousMilestoneNotPaid");
    });

    it("Should pay all milestones at once", async function () {
      await expect(
        milestones.connect(payer).payAllMilestones(1)
      ).to.emit(milestones, "MilestonePaid");

      const invoice = await milestones.getInvoice(1);
      expect(invoice.paidAmount).to.equal(TOTAL_AMOUNT);
    });
  });

  describe("Release Milestones", function () {
    beforeEach(async function () {
      const amounts = [MILESTONE_1_AMOUNT, MILESTONE_2_AMOUNT];
      const descriptions = ["Phase 1", "Phase 2"];
      await milestones.connect(merchant).createInvoice(amounts, descriptions, ethers.ZeroHash, 0, "");
      await milestones.connect(payer).payMilestone(1, 0);
    });

    it("Should release paid milestone", async function () {
      const merchantBalanceBefore = await usdc.balanceOf(merchant.address);
      const feeRecipientBalanceBefore = await usdc.balanceOf(feeRecipient.address);

      const expectedFee = (MILESTONE_1_AMOUNT * BigInt(FEE_BPS)) / 10000n;
      const expectedMerchantAmount = MILESTONE_1_AMOUNT - expectedFee;

      await expect(
        milestones.connect(merchant).releaseMilestone(1, 0)
      ).to.emit(milestones, "MilestoneReleased");

      const merchantBalanceAfter = await usdc.balanceOf(merchant.address);
      const feeRecipientBalanceAfter = await usdc.balanceOf(feeRecipient.address);

      expect(merchantBalanceAfter - merchantBalanceBefore).to.equal(expectedMerchantAmount);
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(expectedFee);
    });

    it("Should revert if milestone not paid", async function () {
      await expect(
        milestones.connect(merchant).releaseMilestone(1, 1)
      ).to.be.revertedWithCustomError(milestones, "MilestoneNotPaid");
    });

    it("Should revert if not merchant", async function () {
      await expect(
        milestones.connect(payer).releaseMilestone(1, 0)
      ).to.be.revertedWithCustomError(milestones, "OnlyMerchant");
    });

    it("Should release all paid milestones", async function () {
      await milestones.connect(payer).payMilestone(1, 1);

      await expect(
        milestones.connect(merchant).releaseAllPaidMilestones(1)
      ).to.emit(milestones, "MilestoneReleased");

      const invoice = await milestones.getInvoice(1);
      expect(invoice.releasedAmount).to.equal(MILESTONE_1_AMOUNT + MILESTONE_2_AMOUNT);
    });

    it("Should mark invoice as completed when all milestones released", async function () {
      await milestones.connect(payer).payMilestone(1, 1);
      await milestones.connect(merchant).releaseAllPaidMilestones(1);

      const invoice = await milestones.getInvoice(1);
      expect(invoice.status).to.equal(1); // Completed
    });
  });

  describe("Refund Milestones", function () {
    beforeEach(async function () {
      const amounts = [MILESTONE_1_AMOUNT, MILESTONE_2_AMOUNT];
      const descriptions = ["Phase 1", "Phase 2"];
      await milestones.connect(merchant).createInvoice(amounts, descriptions, ethers.ZeroHash, 0, "");
      await milestones.connect(payer).payMilestone(1, 0);
    });

    it("Should refund paid milestone", async function () {
      const payerBalanceBefore = await usdc.balanceOf(payer.address);

      await expect(
        milestones.connect(merchant).refundMilestone(1, 0)
      ).to.emit(milestones, "MilestoneRefunded")
        .withArgs(1, 0, payer.address, MILESTONE_1_AMOUNT);

      const payerBalanceAfter = await usdc.balanceOf(payer.address);
      expect(payerBalanceAfter - payerBalanceBefore).to.equal(MILESTONE_1_AMOUNT);
    });
  });

  describe("Cancel Invoice", function () {
    it("Should cancel invoice with no paid milestones", async function () {
      const amounts = [MILESTONE_1_AMOUNT];
      const descriptions = ["Phase 1"];
      await milestones.connect(merchant).createInvoice(amounts, descriptions, ethers.ZeroHash, 0, "");

      await expect(
        milestones.connect(merchant).cancelInvoice(1)
      ).to.emit(milestones, "InvoiceCancelled");

      const invoice = await milestones.getInvoice(1);
      expect(invoice.status).to.equal(2); // Cancelled
    });

    it("Should revert if has paid milestones", async function () {
      const amounts = [MILESTONE_1_AMOUNT];
      const descriptions = ["Phase 1"];
      await milestones.connect(merchant).createInvoice(amounts, descriptions, ethers.ZeroHash, 0, "");
      await milestones.connect(payer).payMilestone(1, 0);

      await expect(
        milestones.connect(merchant).cancelInvoice(1)
      ).to.be.revertedWithCustomError(milestones, "HasPaidMilestones");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const amounts = [MILESTONE_1_AMOUNT, MILESTONE_2_AMOUNT, MILESTONE_3_AMOUNT];
      const descriptions = ["Phase 1", "Phase 2", "Phase 3"];
      await milestones.connect(merchant).createInvoice(amounts, descriptions, ethers.ZeroHash, 0, "");
    });

    it("Should get all milestones", async function () {
      const allMilestones = await milestones.getAllMilestones(1);
      expect(allMilestones.length).to.equal(3);
      expect(allMilestones[0].amount).to.equal(MILESTONE_1_AMOUNT);
      expect(allMilestones[1].amount).to.equal(MILESTONE_2_AMOUNT);
      expect(allMilestones[2].amount).to.equal(MILESTONE_3_AMOUNT);
    });

    it("Should get invoice progress", async function () {
      await milestones.connect(payer).payMilestone(1, 0);
      await milestones.connect(merchant).releaseMilestone(1, 0);

      const [paidCount, releasedCount, totalCount, paidPct, releasedPct] = 
        await milestones.getInvoiceProgress(1);

      expect(paidCount).to.equal(1);
      expect(releasedCount).to.equal(1);
      expect(totalCount).to.equal(3);
      expect(paidPct).to.be.greaterThan(0);
      expect(releasedPct).to.be.greaterThan(0);
    });
  });
});
