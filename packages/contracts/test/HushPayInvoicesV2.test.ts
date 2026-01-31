import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { 
  HushPayInvoicesV2, 
  HushPayFeeManager,
  HushPayMerchantRegistry,
  MockUSDC 
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("HushPayInvoicesV2", function () {
  let invoices: HushPayInvoicesV2;
  let feeManager: HushPayFeeManager;
  let registry: HushPayMerchantRegistry;
  let usdc: MockUSDC;
  let admin: SignerWithAddress;
  let merchant: SignerWithAddress;
  let payer: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let payoutAddress: SignerWithAddress;

  const FEE_BPS = 50; // 0.5%
  const INVOICE_AMOUNT = ethers.parseUnits("100", 6);

  beforeEach(async function () {
    [admin, merchant, payer, feeRecipient, payoutAddress] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Deploy FeeManager
    const FeeManager = await ethers.getContractFactory("HushPayFeeManager");
    feeManager = await FeeManager.deploy(feeRecipient.address, FEE_BPS, admin.address);
    await feeManager.waitForDeployment();

    // Deploy MerchantRegistry
    const Registry = await ethers.getContractFactory("HushPayMerchantRegistry");
    registry = await Registry.deploy(admin.address);
    await registry.waitForDeployment();

    // Deploy InvoicesV2
    const InvoicesV2 = await ethers.getContractFactory("HushPayInvoicesV2");
    invoices = await InvoicesV2.deploy(
      await usdc.getAddress(),
      await feeManager.getAddress(),
      await registry.getAddress(),
      ethers.ZeroAddress // No disputes contract for basic tests
    );
    await invoices.waitForDeployment();

    // Mint USDC to payer
    await usdc.mint(payer.address, ethers.parseUnits("10000", 6));
    await usdc.connect(payer).approve(await invoices.getAddress(), ethers.MaxUint256);

    // Register merchant with custom payout address
    await registry.connect(merchant).registerMerchant(
      payoutAddress.address,
      "Test Business",
      ""
    );
  });

  describe("Deployment", function () {
    it("Should set correct USDC token", async function () {
      expect(await invoices.usdcToken()).to.equal(await usdc.getAddress());
    });

    it("Should set correct fee manager", async function () {
      expect(await invoices.feeManager()).to.equal(await feeManager.getAddress());
    });

    it("Should set correct merchant registry", async function () {
      expect(await invoices.merchantRegistry()).to.equal(await registry.getAddress());
    });
  });

  describe("Create Invoice", function () {
    it("Should create invoice", async function () {
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test Invoice"));
      const dueAt = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        invoices.connect(merchant).createInvoice(INVOICE_AMOUNT, memoHash, dueAt, "QmTestCID")
      ).to.emit(invoices, "InvoiceCreated")
        .withArgs(1, merchant.address, INVOICE_AMOUNT, dueAt, memoHash, "QmTestCID");

      const invoice = await invoices.getInvoice(1);
      expect(invoice.merchant).to.equal(merchant.address);
      expect(invoice.usdcAmount).to.equal(INVOICE_AMOUNT);
      expect(invoice.status).to.equal(0); // Unpaid
    });

    it("Should increment invoice ID", async function () {
      const memoHash = ethers.ZeroHash;
      await invoices.connect(merchant).createInvoice(INVOICE_AMOUNT, memoHash, 0, "");
      await invoices.connect(merchant).createInvoice(INVOICE_AMOUNT, memoHash, 0, "");

      expect(await invoices.nextInvoiceId()).to.equal(3);
    });
  });

  describe("Pay Invoice", function () {
    beforeEach(async function () {
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));
      await invoices.connect(merchant).createInvoice(INVOICE_AMOUNT, memoHash, 0, "");
    });

    it("Should pay invoice", async function () {
      await expect(
        invoices.connect(payer).payInvoice(1)
      ).to.emit(invoices, "InvoicePaid")
        .withArgs(1, payer.address);

      const invoice = await invoices.getInvoice(1);
      expect(invoice.status).to.equal(1); // Paid
      expect(invoice.payer).to.equal(payer.address);
    });

    it("Should transfer USDC to contract", async function () {
      const contractBalanceBefore = await usdc.balanceOf(await invoices.getAddress());
      await invoices.connect(payer).payInvoice(1);
      const contractBalanceAfter = await usdc.balanceOf(await invoices.getAddress());
      
      expect(contractBalanceAfter - contractBalanceBefore).to.equal(INVOICE_AMOUNT);
    });
  });

  describe("Release with FeeManager", function () {
    beforeEach(async function () {
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));
      await invoices.connect(merchant).createInvoice(INVOICE_AMOUNT, memoHash, 0, "");
      await invoices.connect(payer).payInvoice(1);
    });

    it("Should release to payout address from registry", async function () {
      const payoutBalanceBefore = await usdc.balanceOf(payoutAddress.address);
      const feeRecipientBalanceBefore = await usdc.balanceOf(feeRecipient.address);

      await invoices.connect(merchant).release(1);

      const payoutBalanceAfter = await usdc.balanceOf(payoutAddress.address);
      const feeRecipientBalanceAfter = await usdc.balanceOf(feeRecipient.address);

      const expectedFee = (INVOICE_AMOUNT * BigInt(FEE_BPS)) / 10000n;
      const expectedPayout = INVOICE_AMOUNT - expectedFee;

      expect(payoutBalanceAfter - payoutBalanceBefore).to.equal(expectedPayout);
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(expectedFee);
    });

    it("Should emit InvoiceReleased with fee", async function () {
      const expectedFee = (INVOICE_AMOUNT * BigInt(FEE_BPS)) / 10000n;

      await expect(
        invoices.connect(merchant).release(1)
      ).to.emit(invoices, "InvoiceReleased")
        .withArgs(1, merchant.address, expectedFee);
    });
  });

  describe("Pay with Signature (EIP-712)", function () {
    it("Should pay invoice with merchant signature", async function () {
      const amount = INVOICE_AMOUNT;
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("Signed Invoice"));
      const dueAt = 0n;
      const metadataCID = "QmSignedCID";
      const nonce = await invoices.getNonce(merchant.address);
      
      // Use blockchain time for deadline
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = BigInt(latestBlock!.timestamp + 3600); // 1 hour from now

      // Get domain separator
      const domain = {
        name: "HushPayInvoices",
        version: "2",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await invoices.getAddress()
      };

      const types = {
        Invoice: [
          { name: "merchant", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "memoHash", type: "bytes32" },
          { name: "dueAt", type: "uint64" },
          { name: "metadataCID", type: "string" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      };

      const value = {
        merchant: merchant.address,
        amount: amount,
        memoHash: memoHash,
        dueAt: dueAt,
        metadataCID: metadataCID,
        nonce: nonce,
        deadline: deadline
      };

      // Sign typed data
      const signature = await merchant.signTypedData(domain, types, value);

      // Pay with signature
      await expect(
        invoices.connect(payer).payInvoiceWithSig(
          merchant.address,
          amount,
          memoHash,
          dueAt,
          metadataCID,
          nonce,
          deadline,
          signature
        )
      ).to.emit(invoices, "InvoicePaidWithSig");

      // Check invoice was created and paid
      const invoice = await invoices.getInvoice(1);
      expect(invoice.merchant).to.equal(merchant.address);
      expect(invoice.payer).to.equal(payer.address);
      expect(invoice.status).to.equal(1); // Paid

      // Check nonce incremented
      expect(await invoices.getNonce(merchant.address)).to.equal(nonce + 1n);
    });

    it("Should revert with expired deadline", async function () {
      const amount = INVOICE_AMOUNT;
      const memoHash = ethers.ZeroHash;
      const nonce = 0n;
      
      // Use blockchain time for expired deadline
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = BigInt(latestBlock!.timestamp - 3600); // 1 hour in the past

      await expect(
        invoices.connect(payer).payInvoiceWithSig(
          merchant.address,
          amount,
          memoHash,
          0,
          "",
          nonce,
          deadline,
          "0x" + "00".repeat(65) // Invalid signature
        )
      ).to.be.revertedWithCustomError(invoices, "SignatureExpired");
    });

    it("Should revert with invalid nonce", async function () {
      const amount = INVOICE_AMOUNT;
      const memoHash = ethers.ZeroHash;
      const nonce = 999n; // Wrong nonce
      
      // Use blockchain time for deadline
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = BigInt(latestBlock!.timestamp + 3600);

      await expect(
        invoices.connect(payer).payInvoiceWithSig(
          merchant.address,
          amount,
          memoHash,
          0,
          "",
          nonce,
          deadline,
          "0x" + "00".repeat(65)
        )
      ).to.be.revertedWithCustomError(invoices, "InvalidNonce");
    });
  });

  describe("Refund", function () {
    beforeEach(async function () {
      const memoHash = ethers.ZeroHash;
      await invoices.connect(merchant).createInvoice(INVOICE_AMOUNT, memoHash, 0, "");
      await invoices.connect(payer).payInvoice(1);
    });

    it("Should refund to payer", async function () {
      const payerBalanceBefore = await usdc.balanceOf(payer.address);

      await expect(
        invoices.connect(merchant).refund(1)
      ).to.emit(invoices, "InvoiceRefunded");

      const payerBalanceAfter = await usdc.balanceOf(payer.address);
      expect(payerBalanceAfter - payerBalanceBefore).to.equal(INVOICE_AMOUNT);
    });
  });

  describe("Cancel Invoice", function () {
    it("Should cancel unpaid invoice", async function () {
      const memoHash = ethers.ZeroHash;
      await invoices.connect(merchant).createInvoice(INVOICE_AMOUNT, memoHash, 0, "");

      await expect(
        invoices.connect(merchant).cancelInvoice(1)
      ).to.emit(invoices, "InvoiceCancelled");

      const invoice = await invoices.getInvoice(1);
      expect(invoice.status).to.equal(4); // Cancelled
    });

    it("Should revert cancelling paid invoice", async function () {
      const memoHash = ethers.ZeroHash;
      await invoices.connect(merchant).createInvoice(INVOICE_AMOUNT, memoHash, 0, "");
      await invoices.connect(payer).payInvoice(1);

      await expect(
        invoices.connect(merchant).cancelInvoice(1)
      ).to.be.revertedWithCustomError(invoices, "InvalidStatus");
    });
  });

  describe("Operator Support via Registry", function () {
    let operator: SignerWithAddress;

    beforeEach(async function () {
      [, , , , , operator] = await ethers.getSigners();
      await registry.connect(merchant).addOperator(operator.address);
    });

    it("Should allow operator to release", async function () {
      const memoHash = ethers.ZeroHash;
      await invoices.connect(merchant).createInvoice(INVOICE_AMOUNT, memoHash, 0, "");
      await invoices.connect(payer).payInvoice(1);

      await expect(
        invoices.connect(operator).release(1)
      ).to.emit(invoices, "InvoiceReleased");
    });

    it("Should allow operator to refund", async function () {
      const memoHash = ethers.ZeroHash;
      await invoices.connect(merchant).createInvoice(INVOICE_AMOUNT, memoHash, 0, "");
      await invoices.connect(payer).payInvoice(1);

      await expect(
        invoices.connect(operator).refund(1)
      ).to.emit(invoices, "InvoiceRefunded");
    });
  });

  describe("Get Multiple Invoices", function () {
    it("Should get multiple invoices", async function () {
      const memoHash = ethers.ZeroHash;
      await invoices.connect(merchant).createInvoice(INVOICE_AMOUNT, memoHash, 0, "");
      await invoices.connect(merchant).createInvoice(INVOICE_AMOUNT * 2n, memoHash, 0, "");

      const result = await invoices.getInvoices([1, 2]);
      expect(result.length).to.equal(2);
      expect(result[0].usdcAmount).to.equal(INVOICE_AMOUNT);
      expect(result[1].usdcAmount).to.equal(INVOICE_AMOUNT * 2n);
    });
  });
});
