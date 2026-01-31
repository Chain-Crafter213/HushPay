import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { HushPayInvoices } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("HushPayInvoices", function () {
  // Constants
  const USDC_DECIMALS = 6;
  const FEE_BPS = 50; // 0.5%
  const INVOICE_AMOUNT = ethers.parseUnits("100", USDC_DECIMALS); // 100 USDC

  // Mock USDC contract for testing
  async function deployMockUSDC() {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", USDC_DECIMALS);
    return usdc;
  }

  async function deployHushPayFixture() {
    const [owner, merchant, payer, feeRecipient, other] = await ethers.getSigners();

    // Deploy mock USDC
    const usdc = await deployMockUSDC();
    const usdcAddress = await usdc.getAddress();

    // Deploy HushPayInvoices
    const HushPayInvoices = await ethers.getContractFactory("HushPayInvoices");
    const hushPay = await HushPayInvoices.deploy(
      usdcAddress,
      feeRecipient.address,
      FEE_BPS
    );

    // Mint USDC to payer for testing
    await usdc.mint(payer.address, ethers.parseUnits("10000", USDC_DECIMALS));

    return { hushPay, usdc, owner, merchant, payer, feeRecipient, other };
  }

  describe("Deployment", function () {
    it("Should set the correct USDC token", async function () {
      const { hushPay, usdc } = await loadFixture(deployHushPayFixture);
      expect(await hushPay.usdcToken()).to.equal(await usdc.getAddress());
    });

    it("Should set the correct fee recipient", async function () {
      const { hushPay, feeRecipient } = await loadFixture(deployHushPayFixture);
      expect(await hushPay.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set the correct fee BPS", async function () {
      const { hushPay } = await loadFixture(deployHushPayFixture);
      expect(await hushPay.feeBps()).to.equal(FEE_BPS);
    });

    it("Should start invoice ID at 1", async function () {
      const { hushPay } = await loadFixture(deployHushPayFixture);
      expect(await hushPay.nextInvoiceId()).to.equal(1);
    });

    it("Should revert with zero USDC address", async function () {
      const [, , , feeRecipient] = await ethers.getSigners();
      const HushPayInvoices = await ethers.getContractFactory("HushPayInvoices");
      await expect(
        HushPayInvoices.deploy(ethers.ZeroAddress, feeRecipient.address, FEE_BPS)
      ).to.be.revertedWithCustomError(HushPayInvoices, "InvalidUsdcToken");
    });

    it("Should revert with zero fee recipient", async function () {
      const usdc = await deployMockUSDC();
      const HushPayInvoices = await ethers.getContractFactory("HushPayInvoices");
      await expect(
        HushPayInvoices.deploy(await usdc.getAddress(), ethers.ZeroAddress, FEE_BPS)
      ).to.be.revertedWithCustomError(HushPayInvoices, "InvalidFeeRecipient");
    });

    it("Should revert with fee > 1%", async function () {
      const [, , , feeRecipient] = await ethers.getSigners();
      const usdc = await deployMockUSDC();
      const HushPayInvoices = await ethers.getContractFactory("HushPayInvoices");
      await expect(
        HushPayInvoices.deploy(await usdc.getAddress(), feeRecipient.address, 101)
      ).to.be.revertedWithCustomError(HushPayInvoices, "FeeTooHigh");
    });
  });

  describe("Create Invoice", function () {
    it("Should create an invoice with correct details", async function () {
      const { hushPay, merchant } = await loadFixture(deployHushPayFixture);
      
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test invoice"));
      const dueAt = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const metadataCID = "QmTest123";

      const tx = await hushPay.connect(merchant).createInvoice(
        INVOICE_AMOUNT,
        dueAt,
        memoHash,
        metadataCID
      );

      await expect(tx)
        .to.emit(hushPay, "InvoiceCreated")
        .withArgs(1, merchant.address, INVOICE_AMOUNT, dueAt, memoHash, metadataCID);

      const invoice = await hushPay.getInvoice(1);
      expect(invoice.id).to.equal(1);
      expect(invoice.merchant).to.equal(merchant.address);
      expect(invoice.usdcAmount).to.equal(INVOICE_AMOUNT);
      expect(invoice.status).to.equal(0); // Unpaid
      expect(invoice.dueAt).to.equal(dueAt);
      expect(invoice.memoHash).to.equal(memoHash);
      expect(invoice.metadataCID).to.equal(metadataCID);
    });

    it("Should increment invoice ID", async function () {
      const { hushPay, merchant } = await loadFixture(deployHushPayFixture);
      
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");

      expect(await hushPay.nextInvoiceId()).to.equal(3);
    });

    it("Should revert with zero amount", async function () {
      const { hushPay, merchant } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await expect(
        hushPay.connect(merchant).createInvoice(0, 0, memoHash, "")
      ).to.be.revertedWithCustomError(hushPay, "InvalidAmount");
    });
  });

  describe("Cancel Invoice", function () {
    it("Should allow merchant to cancel unpaid invoice", async function () {
      const { hushPay, merchant } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      
      await expect(hushPay.connect(merchant).cancelInvoice(1))
        .to.emit(hushPay, "InvoiceCancelled")
        .withArgs(1);

      const invoice = await hushPay.getInvoice(1);
      expect(invoice.status).to.equal(4); // Cancelled
    });

    it("Should revert if not merchant", async function () {
      const { hushPay, merchant, other } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      
      await expect(
        hushPay.connect(other).cancelInvoice(1)
      ).to.be.revertedWithCustomError(hushPay, "OnlyMerchant");
    });

    it("Should revert if invoice not found", async function () {
      const { hushPay, merchant } = await loadFixture(deployHushPayFixture);
      
      await expect(
        hushPay.connect(merchant).cancelInvoice(999)
      ).to.be.revertedWithCustomError(hushPay, "InvoiceNotFound");
    });
  });

  describe("Pay Invoice", function () {
    it("Should allow payment with sufficient allowance", async function () {
      const { hushPay, usdc, merchant, payer } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      
      // Approve USDC
      await usdc.connect(payer).approve(await hushPay.getAddress(), INVOICE_AMOUNT);

      // Pay invoice
      await expect(hushPay.connect(payer).payInvoice(1))
        .to.emit(hushPay, "InvoicePaid")
        .withArgs(1, payer.address);

      const invoice = await hushPay.getInvoice(1);
      expect(invoice.status).to.equal(1); // PaidEscrowed
      expect(invoice.payer).to.equal(payer.address);

      // Check USDC transferred to contract
      expect(await usdc.balanceOf(await hushPay.getAddress())).to.equal(INVOICE_AMOUNT);
    });

    it("Should revert without allowance", async function () {
      const { hushPay, merchant, payer } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");

      await expect(
        hushPay.connect(payer).payInvoice(1)
      ).to.be.reverted;
    });

    it("Should revert if already paid", async function () {
      const { hushPay, usdc, merchant, payer } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      await usdc.connect(payer).approve(await hushPay.getAddress(), INVOICE_AMOUNT * 2n);
      await hushPay.connect(payer).payInvoice(1);

      await expect(
        hushPay.connect(payer).payInvoice(1)
      ).to.be.revertedWithCustomError(hushPay, "InvalidStatus");
    });

    it("Should revert if cancelled", async function () {
      const { hushPay, usdc, merchant, payer } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      await hushPay.connect(merchant).cancelInvoice(1);
      await usdc.connect(payer).approve(await hushPay.getAddress(), INVOICE_AMOUNT);

      await expect(
        hushPay.connect(payer).payInvoice(1)
      ).to.be.revertedWithCustomError(hushPay, "InvalidStatus");
    });
  });

  describe("Release", function () {
    it("Should release funds to merchant minus fee", async function () {
      const { hushPay, usdc, merchant, payer, feeRecipient } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      await usdc.connect(payer).approve(await hushPay.getAddress(), INVOICE_AMOUNT);
      await hushPay.connect(payer).payInvoice(1);

      const merchantBalanceBefore = await usdc.balanceOf(merchant.address);
      const feeRecipientBalanceBefore = await usdc.balanceOf(feeRecipient.address);

      const expectedFee = (INVOICE_AMOUNT * BigInt(FEE_BPS)) / 10000n;
      const expectedMerchantAmount = INVOICE_AMOUNT - expectedFee;

      await expect(hushPay.connect(merchant).release(1))
        .to.emit(hushPay, "InvoiceReleased")
        .withArgs(1, merchant.address, expectedFee);

      const invoice = await hushPay.getInvoice(1);
      expect(invoice.status).to.equal(2); // Released

      const merchantBalanceAfter = await usdc.balanceOf(merchant.address);
      const feeRecipientBalanceAfter = await usdc.balanceOf(feeRecipient.address);

      expect(merchantBalanceAfter - merchantBalanceBefore).to.equal(expectedMerchantAmount);
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(expectedFee);
    });

    it("Should revert if not merchant", async function () {
      const { hushPay, usdc, merchant, payer, other } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      await usdc.connect(payer).approve(await hushPay.getAddress(), INVOICE_AMOUNT);
      await hushPay.connect(payer).payInvoice(1);

      await expect(
        hushPay.connect(other).release(1)
      ).to.be.revertedWithCustomError(hushPay, "OnlyMerchant");
    });

    it("Should revert if not paid", async function () {
      const { hushPay, merchant } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");

      await expect(
        hushPay.connect(merchant).release(1)
      ).to.be.revertedWithCustomError(hushPay, "InvalidStatus");
    });

    it("Should revert if already released", async function () {
      const { hushPay, usdc, merchant, payer } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      await usdc.connect(payer).approve(await hushPay.getAddress(), INVOICE_AMOUNT);
      await hushPay.connect(payer).payInvoice(1);
      await hushPay.connect(merchant).release(1);

      await expect(
        hushPay.connect(merchant).release(1)
      ).to.be.revertedWithCustomError(hushPay, "InvalidStatus");
    });
  });

  describe("Refund", function () {
    it("Should refund full amount to payer", async function () {
      const { hushPay, usdc, merchant, payer } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      await usdc.connect(payer).approve(await hushPay.getAddress(), INVOICE_AMOUNT);
      await hushPay.connect(payer).payInvoice(1);

      const payerBalanceBefore = await usdc.balanceOf(payer.address);

      await expect(hushPay.connect(merchant).refund(1))
        .to.emit(hushPay, "InvoiceRefunded")
        .withArgs(1, payer.address);

      const invoice = await hushPay.getInvoice(1);
      expect(invoice.status).to.equal(3); // Refunded

      const payerBalanceAfter = await usdc.balanceOf(payer.address);
      expect(payerBalanceAfter - payerBalanceBefore).to.equal(INVOICE_AMOUNT);
    });

    it("Should revert if not merchant", async function () {
      const { hushPay, usdc, merchant, payer, other } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      await usdc.connect(payer).approve(await hushPay.getAddress(), INVOICE_AMOUNT);
      await hushPay.connect(payer).payInvoice(1);

      await expect(
        hushPay.connect(other).refund(1)
      ).to.be.revertedWithCustomError(hushPay, "OnlyMerchant");
    });

    it("Should revert if not paid", async function () {
      const { hushPay, merchant } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");

      await expect(
        hushPay.connect(merchant).refund(1)
      ).to.be.revertedWithCustomError(hushPay, "InvalidStatus");
    });

    it("Should revert if already released", async function () {
      const { hushPay, usdc, merchant, payer } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      await usdc.connect(payer).approve(await hushPay.getAddress(), INVOICE_AMOUNT);
      await hushPay.connect(payer).payInvoice(1);
      await hushPay.connect(merchant).release(1);

      await expect(
        hushPay.connect(merchant).refund(1)
      ).to.be.revertedWithCustomError(hushPay, "InvalidStatus");
    });
  });

  describe("Fee Calculations", function () {
    it("Should calculate fee correctly", async function () {
      const { hushPay } = await loadFixture(deployHushPayFixture);
      
      const amount = ethers.parseUnits("1000", USDC_DECIMALS);
      const expectedFee = (amount * BigInt(FEE_BPS)) / 10000n;
      
      expect(await hushPay.calculateFee(amount)).to.equal(expectedFee);
    });
  });

  describe("View Functions", function () {
    it("Should return multiple invoices", async function () {
      const { hushPay, merchant } = await loadFixture(deployHushPayFixture);
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));

      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT, 0, memoHash, "");
      await hushPay.connect(merchant).createInvoice(INVOICE_AMOUNT * 2n, 0, memoHash, "");

      const invoices = await hushPay.getInvoices([1, 2]);
      expect(invoices.length).to.equal(2);
      expect(invoices[0].usdcAmount).to.equal(INVOICE_AMOUNT);
      expect(invoices[1].usdcAmount).to.equal(INVOICE_AMOUNT * 2n);
    });
  });
});
