import { expect } from "chai";
import { ethers } from "hardhat";
import { HushPayMerchantRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("HushPayMerchantRegistry", function () {
  let registry: HushPayMerchantRegistry;
  let admin: SignerWithAddress;
  let merchant: SignerWithAddress;
  let payoutAddress: SignerWithAddress;
  let operator: SignerWithAddress;
  let other: SignerWithAddress;

  beforeEach(async function () {
    [admin, merchant, payoutAddress, operator, other] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("HushPayMerchantRegistry");
    registry = await Registry.deploy(admin.address);
    await registry.waitForDeployment();
  });

  describe("Merchant Registration", function () {
    it("Should register a new merchant", async function () {
      await expect(
        registry.connect(merchant).registerMerchant(
          payoutAddress.address,
          "Test Business",
          "QmTestCID"
        )
      ).to.emit(registry, "MerchantRegistered")
        .withArgs(merchant.address, payoutAddress.address, "Test Business", "QmTestCID");

      const merchantData = await registry.getMerchant(merchant.address);
      expect(merchantData.owner).to.equal(merchant.address);
      expect(merchantData.payoutAddress).to.equal(payoutAddress.address);
      expect(merchantData.businessName).to.equal("Test Business");
      expect(merchantData.active).to.be.true;
    });

    it("Should revert if merchant already registered", async function () {
      await registry.connect(merchant).registerMerchant(payoutAddress.address, "Business", "CID");
      
      await expect(
        registry.connect(merchant).registerMerchant(payoutAddress.address, "Business2", "CID2")
      ).to.be.revertedWithCustomError(registry, "MerchantAlreadyRegistered");
    });

    it("Should revert with invalid payout address", async function () {
      await expect(
        registry.connect(merchant).registerMerchant(ethers.ZeroAddress, "Business", "CID")
      ).to.be.revertedWithCustomError(registry, "InvalidPayoutAddress");
    });
  });

  describe("Profile Updates", function () {
    beforeEach(async function () {
      await registry.connect(merchant).registerMerchant(payoutAddress.address, "Business", "CID");
    });

    it("Should update profile", async function () {
      await expect(
        registry.connect(merchant).updateProfile("New Business Name", "NewCID")
      ).to.emit(registry, "MerchantUpdated")
        .withArgs(merchant.address, "New Business Name", "NewCID");

      const merchantData = await registry.getMerchant(merchant.address);
      expect(merchantData.businessName).to.equal("New Business Name");
      expect(merchantData.metadataCID).to.equal("NewCID");
    });

    it("Should update payout address", async function () {
      const newPayout = other.address;
      
      await expect(
        registry.connect(merchant).setPayoutAddress(newPayout)
      ).to.emit(registry, "PayoutAddressUpdated")
        .withArgs(merchant.address, payoutAddress.address, newPayout);

      expect(await registry.getPayoutAddress(merchant.address)).to.equal(newPayout);
    });

    it("Should revert if not merchant owner", async function () {
      await expect(
        registry.connect(other).updateProfile("Hacked", "CID")
      ).to.be.revertedWithCustomError(registry, "MerchantNotRegistered");
    });
  });

  describe("Operator Management", function () {
    beforeEach(async function () {
      await registry.connect(merchant).registerMerchant(payoutAddress.address, "Business", "CID");
    });

    it("Should add operator", async function () {
      await expect(
        registry.connect(merchant).addOperator(operator.address)
      ).to.emit(registry, "OperatorAdded")
        .withArgs(merchant.address, operator.address);

      expect(await registry.isOperator(merchant.address, operator.address)).to.be.true;
    });

    it("Should remove operator", async function () {
      await registry.connect(merchant).addOperator(operator.address);
      
      await expect(
        registry.connect(merchant).removeOperator(operator.address)
      ).to.emit(registry, "OperatorRemoved")
        .withArgs(merchant.address, operator.address);

      expect(await registry.isOperator(merchant.address, operator.address)).to.be.false;
    });

    it("Should revert adding already assigned operator", async function () {
      await registry.connect(merchant).addOperator(operator.address);
      
      await expect(
        registry.connect(merchant).addOperator(operator.address)
      ).to.be.revertedWithCustomError(registry, "OperatorAlreadyAssigned");
    });

    it("Should check canActForMerchant correctly", async function () {
      expect(await registry.canActForMerchant(merchant.address, merchant.address)).to.be.true;
      expect(await registry.canActForMerchant(merchant.address, operator.address)).to.be.false;
      
      await registry.connect(merchant).addOperator(operator.address);
      expect(await registry.canActForMerchant(merchant.address, operator.address)).to.be.true;
    });

    it("Should get operators list", async function () {
      await registry.connect(merchant).addOperator(operator.address);
      await registry.connect(merchant).addOperator(other.address);
      
      const operators = await registry.getOperators(merchant.address);
      expect(operators).to.include(operator.address);
      expect(operators).to.include(other.address);
    });
  });

  describe("Admin Functions", function () {
    beforeEach(async function () {
      await registry.connect(merchant).registerMerchant(payoutAddress.address, "Business", "CID");
    });

    it("Should deactivate merchant", async function () {
      await expect(
        registry.connect(admin).deactivateMerchant(merchant.address)
      ).to.emit(registry, "MerchantDeactivated")
        .withArgs(merchant.address);

      expect(await registry.isMerchant(merchant.address)).to.be.false;
    });

    it("Should reactivate merchant", async function () {
      await registry.connect(admin).deactivateMerchant(merchant.address);
      
      await expect(
        registry.connect(admin).reactivateMerchant(merchant.address)
      ).to.emit(registry, "MerchantReactivated")
        .withArgs(merchant.address);

      expect(await registry.isMerchant(merchant.address)).to.be.true;
    });

    it("Should revert deactivate if not admin", async function () {
      await expect(
        registry.connect(other).deactivateMerchant(merchant.address)
      ).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return merchant count", async function () {
      expect(await registry.getMerchantCount()).to.equal(0);
      
      await registry.connect(merchant).registerMerchant(payoutAddress.address, "Business", "CID");
      expect(await registry.getMerchantCount()).to.equal(1);
    });

    it("Should check isMerchant correctly", async function () {
      expect(await registry.isMerchant(merchant.address)).to.be.false;
      
      await registry.connect(merchant).registerMerchant(payoutAddress.address, "Business", "CID");
      expect(await registry.isMerchant(merchant.address)).to.be.true;
    });
  });
});
