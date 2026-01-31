import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HushPayFeeManager } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("HushPayFeeManager", function () {
  let feeManager: HushPayFeeManager;
  let admin: SignerWithAddress;
  let feeSetter: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let newRecipient: SignerWithAddress;
  let other: SignerWithAddress;

  const INITIAL_FEE_BPS = 50; // 0.5%
  const FEE_CHANGE_DELAY = 2 * 24 * 60 * 60; // 2 days

  beforeEach(async function () {
    [admin, feeSetter, feeRecipient, newRecipient, other] = await ethers.getSigners();

    const FeeManager = await ethers.getContractFactory("HushPayFeeManager");
    feeManager = await FeeManager.deploy(feeRecipient.address, INITIAL_FEE_BPS, admin.address);
    await feeManager.waitForDeployment();

    // Grant FEE_SETTER_ROLE to feeSetter
    const FEE_SETTER_ROLE = await feeManager.FEE_SETTER_ROLE();
    await feeManager.connect(admin).grantRole(FEE_SETTER_ROLE, feeSetter.address);
  });

  describe("Deployment", function () {
    it("Should set the correct fee recipient", async function () {
      expect(await feeManager.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set the correct fee basis points", async function () {
      expect(await feeManager.feeBps()).to.equal(INITIAL_FEE_BPS);
    });

    it("Should revert with invalid fee recipient", async function () {
      const FeeManager = await ethers.getContractFactory("HushPayFeeManager");
      await expect(
        FeeManager.deploy(ethers.ZeroAddress, INITIAL_FEE_BPS, admin.address)
      ).to.be.revertedWithCustomError(feeManager, "InvalidFeeRecipient");
    });

    it("Should revert with fee too high", async function () {
      const FeeManager = await ethers.getContractFactory("HushPayFeeManager");
      await expect(
        FeeManager.deploy(feeRecipient.address, 101, admin.address)
      ).to.be.revertedWithCustomError(feeManager, "FeeTooHigh");
    });
  });

  describe("Fee Calculation", function () {
    it("Should calculate fee correctly", async function () {
      const amount = ethers.parseUnits("100", 6); // 100 USDC
      const expectedFee = ethers.parseUnits("0.5", 6); // 0.5 USDC (0.5%)
      expect(await feeManager.calculateFee(amount)).to.equal(expectedFee);
    });

    it("Should return fee settings", async function () {
      const [recipient, bps] = await feeManager.getFeeSettings();
      expect(recipient).to.equal(feeRecipient.address);
      expect(bps).to.equal(INITIAL_FEE_BPS);
    });
  });

  describe("Fee Change with Timelock", function () {
    it("Should propose fee change", async function () {
      const newFeeBps = 75;
      await expect(feeManager.connect(feeSetter).proposeFeeChange(newFeeBps))
        .to.emit(feeManager, "FeeChangeProposed");
      
      const pending = await feeManager.pendingFeeChange();
      expect(pending.newFeeBps).to.equal(newFeeBps);
      expect(pending.pending).to.be.true;
    });

    it("Should revert if fee too high", async function () {
      await expect(
        feeManager.connect(feeSetter).proposeFeeChange(101)
      ).to.be.revertedWithCustomError(feeManager, "FeeTooHigh");
    });

    it("Should revert if change already pending", async function () {
      await feeManager.connect(feeSetter).proposeFeeChange(75);
      await expect(
        feeManager.connect(feeSetter).proposeFeeChange(80)
      ).to.be.revertedWithCustomError(feeManager, "ChangeAlreadyPending");
    });

    it("Should execute fee change after timelock", async function () {
      const newFeeBps = 75;
      await feeManager.connect(feeSetter).proposeFeeChange(newFeeBps);
      
      // Fast forward time
      await time.increase(FEE_CHANGE_DELAY + 1);
      
      await expect(feeManager.connect(feeSetter).executeFeeChange())
        .to.emit(feeManager, "FeeBpsUpdated")
        .withArgs(INITIAL_FEE_BPS, newFeeBps);
      
      expect(await feeManager.feeBps()).to.equal(newFeeBps);
    });

    it("Should revert if timelock not expired", async function () {
      await feeManager.connect(feeSetter).proposeFeeChange(75);
      
      await expect(
        feeManager.connect(feeSetter).executeFeeChange()
      ).to.be.revertedWithCustomError(feeManager, "TimelockNotExpired");
    });

    it("Should cancel fee change", async function () {
      await feeManager.connect(feeSetter).proposeFeeChange(75);
      
      await expect(feeManager.connect(admin).cancelFeeChange())
        .to.emit(feeManager, "FeeChangeCancelled");
      
      const pending = await feeManager.pendingFeeChange();
      expect(pending.pending).to.be.false;
    });
  });

  describe("Recipient Change with Timelock", function () {
    it("Should propose recipient change", async function () {
      await expect(feeManager.connect(admin).proposeRecipientChange(newRecipient.address))
        .to.emit(feeManager, "RecipientChangeProposed");
    });

    it("Should execute recipient change after timelock", async function () {
      await feeManager.connect(admin).proposeRecipientChange(newRecipient.address);
      await time.increase(FEE_CHANGE_DELAY + 1);
      
      await expect(feeManager.connect(admin).executeRecipientChange())
        .to.emit(feeManager, "FeeRecipientUpdated")
        .withArgs(feeRecipient.address, newRecipient.address);
      
      expect(await feeManager.feeRecipient()).to.equal(newRecipient.address);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow emergency fee update", async function () {
      const newFeeBps = 25;
      await expect(feeManager.connect(admin).emergencySetFee(newFeeBps))
        .to.emit(feeManager, "FeeBpsUpdated");
      expect(await feeManager.feeBps()).to.equal(newFeeBps);
    });

    it("Should allow emergency recipient update", async function () {
      await expect(feeManager.connect(admin).emergencySetRecipient(newRecipient.address))
        .to.emit(feeManager, "FeeRecipientUpdated");
      expect(await feeManager.feeRecipient()).to.equal(newRecipient.address);
    });

    it("Should revert emergency fee if not admin", async function () {
      await expect(
        feeManager.connect(other).emergencySetFee(25)
      ).to.be.reverted;
    });
  });
});
