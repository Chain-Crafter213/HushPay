// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IHushPayFeeManager {
    function feeRecipient() external view returns (address);
    function feeBps() external view returns (uint16);
    function calculateFee(uint256 amount) external view returns (uint256);
}

interface IHushPayMerchantRegistry {
    function canActForMerchant(address merchant, address actor) external view returns (bool);
    function getPayoutAddress(address merchant) external view returns (address);
    function isMerchant(address merchant) external view returns (bool);
}

/**
 * @title HushPayMilestones
 * @notice Milestone-based invoice system with partial payments and releases
 * @dev Supports creating invoices with multiple milestones, paying per milestone
 */
contract HushPayMilestones is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Enums ============
    enum MilestoneStatus { Unpaid, Paid, Released, Refunded }
    enum InvoiceStatus { Active, Completed, Cancelled }

    // ============ Structs ============
    struct Milestone {
        uint256 amount;
        string description;
        MilestoneStatus status;
        uint64 paidAt;
        uint64 releasedAt;
        uint64 refundedAt;
    }

    struct MilestoneInvoice {
        uint256 id;
        address merchant;
        address payer;
        uint256 totalAmount;
        uint256 paidAmount;
        uint256 releasedAmount;
        InvoiceStatus status;
        uint64 createdAt;
        uint64 dueAt;
        bytes32 memoHash;
        string metadataCID;
        uint256 milestoneCount;
    }

    // ============ State ============
    IERC20 public immutable usdcToken;
    IHushPayFeeManager public immutable feeManager;
    IHushPayMerchantRegistry public merchantRegistry; // Optional, can be address(0)

    uint256 public nextInvoiceId = 1;
    
    mapping(uint256 => MilestoneInvoice) public invoices;
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones; // invoiceId => milestoneIndex => Milestone
    
    // ============ Events ============
    event MilestoneInvoiceCreated(
        uint256 indexed invoiceId,
        address indexed merchant,
        uint256 totalAmount,
        uint256 milestoneCount,
        uint64 dueAt,
        bytes32 memoHash,
        string metadataCID
    );
    event MilestoneAdded(
        uint256 indexed invoiceId,
        uint256 indexed milestoneIndex,
        uint256 amount,
        string description
    );
    event MilestonePaid(
        uint256 indexed invoiceId,
        uint256 indexed milestoneIndex,
        address indexed payer,
        uint256 amount
    );
    event MilestoneReleased(
        uint256 indexed invoiceId,
        uint256 indexed milestoneIndex,
        address indexed merchant,
        uint256 amount,
        uint256 feeAmount
    );
    event MilestoneRefunded(
        uint256 indexed invoiceId,
        uint256 indexed milestoneIndex,
        address indexed payer,
        uint256 amount
    );
    event InvoiceCompleted(uint256 indexed invoiceId);
    event InvoiceCancelled(uint256 indexed invoiceId);

    // ============ Errors ============
    error InvalidUsdcToken();
    error InvalidFeeManager();
    error InvalidAmount();
    error InvalidMilestoneCount();
    error MilestoneAmountMismatch();
    error InvoiceNotFound();
    error InvoiceNotActive();
    error InvalidMilestoneIndex();
    error MilestoneNotUnpaid();
    error MilestoneNotPaid();
    error OnlyMerchant();
    error OnlyPayer();
    error TransferFailed();
    error PreviousMilestoneNotPaid();
    error HasPaidMilestones();

    // ============ Constructor ============
    constructor(
        address _usdcToken,
        address _feeManager,
        address _merchantRegistry
    ) {
        if (_usdcToken == address(0)) revert InvalidUsdcToken();
        if (_feeManager == address(0)) revert InvalidFeeManager();
        
        usdcToken = IERC20(_usdcToken);
        feeManager = IHushPayFeeManager(_feeManager);
        merchantRegistry = IHushPayMerchantRegistry(_merchantRegistry);
    }

    // ============ Create Functions ============

    /**
     * @notice Create a milestone-based invoice
     * @param milestoneAmounts Array of amounts for each milestone
     * @param milestoneDescriptions Array of descriptions for each milestone
     * @param memoHash Hash of invoice memo
     * @param dueAt Due date timestamp (0 for no due date)
     * @param metadataCID IPFS CID for extended metadata
     */
    function createInvoice(
        uint256[] calldata milestoneAmounts,
        string[] calldata milestoneDescriptions,
        bytes32 memoHash,
        uint64 dueAt,
        string calldata metadataCID
    ) external nonReentrant returns (uint256 invoiceId) {
        if (milestoneAmounts.length == 0) revert InvalidMilestoneCount();
        if (milestoneAmounts.length != milestoneDescriptions.length) revert InvalidMilestoneCount();
        if (milestoneAmounts.length > 20) revert InvalidMilestoneCount(); // Max 20 milestones

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            if (milestoneAmounts[i] == 0) revert InvalidAmount();
            totalAmount += milestoneAmounts[i];
        }

        invoiceId = nextInvoiceId++;

        invoices[invoiceId] = MilestoneInvoice({
            id: invoiceId,
            merchant: msg.sender,
            payer: address(0),
            totalAmount: totalAmount,
            paidAmount: 0,
            releasedAmount: 0,
            status: InvoiceStatus.Active,
            createdAt: uint64(block.timestamp),
            dueAt: dueAt,
            memoHash: memoHash,
            metadataCID: metadataCID,
            milestoneCount: milestoneAmounts.length
        });

        // Create milestones
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            milestones[invoiceId][i] = Milestone({
                amount: milestoneAmounts[i],
                description: milestoneDescriptions[i],
                status: MilestoneStatus.Unpaid,
                paidAt: 0,
                releasedAt: 0,
                refundedAt: 0
            });

            emit MilestoneAdded(invoiceId, i, milestoneAmounts[i], milestoneDescriptions[i]);
        }

        emit MilestoneInvoiceCreated(
            invoiceId,
            msg.sender,
            totalAmount,
            milestoneAmounts.length,
            dueAt,
            memoHash,
            metadataCID
        );
    }

    // ============ Payment Functions ============

    /**
     * @notice Pay a specific milestone
     * @param invoiceId Invoice ID
     * @param milestoneIndex Index of milestone to pay (0-based)
     */
    function payMilestone(uint256 invoiceId, uint256 milestoneIndex) 
        external 
        nonReentrant 
    {
        MilestoneInvoice storage invoice = invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Active) revert InvoiceNotActive();
        if (milestoneIndex >= invoice.milestoneCount) revert InvalidMilestoneIndex();

        Milestone storage milestone = milestones[invoiceId][milestoneIndex];
        if (milestone.status != MilestoneStatus.Unpaid) revert MilestoneNotUnpaid();

        // Ensure previous milestones are paid (sequential payment)
        for (uint256 i = 0; i < milestoneIndex; i++) {
            if (milestones[invoiceId][i].status == MilestoneStatus.Unpaid) {
                revert PreviousMilestoneNotPaid();
            }
        }

        // Set payer on first payment
        if (invoice.payer == address(0)) {
            invoice.payer = msg.sender;
        }

        // Transfer USDC
        usdcToken.safeTransferFrom(msg.sender, address(this), milestone.amount);

        milestone.status = MilestoneStatus.Paid;
        milestone.paidAt = uint64(block.timestamp);
        invoice.paidAmount += milestone.amount;

        emit MilestonePaid(invoiceId, milestoneIndex, msg.sender, milestone.amount);
    }

    /**
     * @notice Pay all remaining unpaid milestones at once
     * @param invoiceId Invoice ID
     */
    function payAllMilestones(uint256 invoiceId) external nonReentrant {
        MilestoneInvoice storage invoice = invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Active) revert InvoiceNotActive();

        uint256 totalToPay = 0;
        
        // Calculate total unpaid amount
        for (uint256 i = 0; i < invoice.milestoneCount; i++) {
            if (milestones[invoiceId][i].status == MilestoneStatus.Unpaid) {
                totalToPay += milestones[invoiceId][i].amount;
            }
        }

        if (totalToPay == 0) revert InvalidAmount();

        // Set payer on first payment
        if (invoice.payer == address(0)) {
            invoice.payer = msg.sender;
        }

        // Transfer total USDC
        usdcToken.safeTransferFrom(msg.sender, address(this), totalToPay);

        // Mark all unpaid milestones as paid
        for (uint256 i = 0; i < invoice.milestoneCount; i++) {
            Milestone storage milestone = milestones[invoiceId][i];
            if (milestone.status == MilestoneStatus.Unpaid) {
                milestone.status = MilestoneStatus.Paid;
                milestone.paidAt = uint64(block.timestamp);
                invoice.paidAmount += milestone.amount;
                
                emit MilestonePaid(invoiceId, i, msg.sender, milestone.amount);
            }
        }
    }

    // ============ Release Functions ============

    /**
     * @notice Release a paid milestone to merchant
     * @param invoiceId Invoice ID
     * @param milestoneIndex Index of milestone to release
     */
    function releaseMilestone(uint256 invoiceId, uint256 milestoneIndex) 
        external 
        nonReentrant 
    {
        MilestoneInvoice storage invoice = invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Active) revert InvoiceNotActive();
        if (!_canActAsMerchant(invoice.merchant, msg.sender)) revert OnlyMerchant();
        if (milestoneIndex >= invoice.milestoneCount) revert InvalidMilestoneIndex();

        Milestone storage milestone = milestones[invoiceId][milestoneIndex];
        if (milestone.status != MilestoneStatus.Paid) revert MilestoneNotPaid();

        // Calculate fee
        uint256 fee = feeManager.calculateFee(milestone.amount);
        uint256 merchantAmount = milestone.amount - fee;

        milestone.status = MilestoneStatus.Released;
        milestone.releasedAt = uint64(block.timestamp);
        invoice.releasedAmount += milestone.amount;

        // Get payout address
        address payoutAddress = _getPayoutAddress(invoice.merchant);

        // Transfer to merchant and fee recipient
        if (fee > 0) {
            usdcToken.safeTransfer(feeManager.feeRecipient(), fee);
        }
        usdcToken.safeTransfer(payoutAddress, merchantAmount);

        emit MilestoneReleased(invoiceId, milestoneIndex, invoice.merchant, merchantAmount, fee);

        // Check if all milestones are released
        _checkInvoiceCompletion(invoiceId);
    }

    /**
     * @notice Release all paid milestones at once
     * @param invoiceId Invoice ID
     */
    function releaseAllPaidMilestones(uint256 invoiceId) external nonReentrant {
        MilestoneInvoice storage invoice = invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Active) revert InvoiceNotActive();
        if (!_canActAsMerchant(invoice.merchant, msg.sender)) revert OnlyMerchant();

        uint256 totalToRelease = 0;
        uint256 totalFee = 0;

        // Calculate totals and update milestones
        for (uint256 i = 0; i < invoice.milestoneCount; i++) {
            Milestone storage milestone = milestones[invoiceId][i];
            if (milestone.status == MilestoneStatus.Paid) {
                uint256 fee = feeManager.calculateFee(milestone.amount);
                uint256 merchantAmount = milestone.amount - fee;
                
                totalToRelease += merchantAmount;
                totalFee += fee;
                
                milestone.status = MilestoneStatus.Released;
                milestone.releasedAt = uint64(block.timestamp);
                invoice.releasedAmount += milestone.amount;
                
                emit MilestoneReleased(invoiceId, i, invoice.merchant, merchantAmount, fee);
            }
        }

        if (totalToRelease == 0) revert InvalidAmount();

        // Get payout address
        address payoutAddress = _getPayoutAddress(invoice.merchant);

        // Transfer
        if (totalFee > 0) {
            usdcToken.safeTransfer(feeManager.feeRecipient(), totalFee);
        }
        usdcToken.safeTransfer(payoutAddress, totalToRelease);

        _checkInvoiceCompletion(invoiceId);
    }

    // ============ Refund Functions ============

    /**
     * @notice Refund a paid milestone to payer
     * @param invoiceId Invoice ID
     * @param milestoneIndex Index of milestone to refund
     */
    function refundMilestone(uint256 invoiceId, uint256 milestoneIndex) 
        external 
        nonReentrant 
    {
        MilestoneInvoice storage invoice = invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Active) revert InvoiceNotActive();
        if (!_canActAsMerchant(invoice.merchant, msg.sender)) revert OnlyMerchant();
        if (milestoneIndex >= invoice.milestoneCount) revert InvalidMilestoneIndex();

        Milestone storage milestone = milestones[invoiceId][milestoneIndex];
        if (milestone.status != MilestoneStatus.Paid) revert MilestoneNotPaid();

        milestone.status = MilestoneStatus.Refunded;
        milestone.refundedAt = uint64(block.timestamp);
        invoice.paidAmount -= milestone.amount;

        // Transfer back to payer
        usdcToken.safeTransfer(invoice.payer, milestone.amount);

        emit MilestoneRefunded(invoiceId, milestoneIndex, invoice.payer, milestone.amount);
    }

    // ============ Cancel Functions ============

    /**
     * @notice Cancel an invoice (only if no milestones paid)
     * @param invoiceId Invoice ID
     */
    function cancelInvoice(uint256 invoiceId) external nonReentrant {
        MilestoneInvoice storage invoice = invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Active) revert InvoiceNotActive();
        if (!_canActAsMerchant(invoice.merchant, msg.sender)) revert OnlyMerchant();
        
        // Check if any milestones have been paid
        for (uint256 i = 0; i < invoice.milestoneCount; i++) {
            if (milestones[invoiceId][i].status != MilestoneStatus.Unpaid) {
                revert HasPaidMilestones();
            }
        }

        invoice.status = InvoiceStatus.Cancelled;
        emit InvoiceCancelled(invoiceId);
    }

    // ============ View Functions ============

    /**
     * @notice Get invoice details
     * @param invoiceId Invoice ID
     */
    function getInvoice(uint256 invoiceId) external view returns (MilestoneInvoice memory) {
        return invoices[invoiceId];
    }

    /**
     * @notice Get milestone details
     * @param invoiceId Invoice ID
     * @param milestoneIndex Milestone index
     */
    function getMilestone(uint256 invoiceId, uint256 milestoneIndex) 
        external 
        view 
        returns (Milestone memory) 
    {
        return milestones[invoiceId][milestoneIndex];
    }

    /**
     * @notice Get all milestones for an invoice
     * @param invoiceId Invoice ID
     */
    function getAllMilestones(uint256 invoiceId) 
        external 
        view 
        returns (Milestone[] memory) 
    {
        MilestoneInvoice storage invoice = invoices[invoiceId];
        Milestone[] memory result = new Milestone[](invoice.milestoneCount);
        
        for (uint256 i = 0; i < invoice.milestoneCount; i++) {
            result[i] = milestones[invoiceId][i];
        }
        
        return result;
    }

    /**
     * @notice Get invoice progress
     * @param invoiceId Invoice ID
     * @return paidMilestones Number of paid milestones
     * @return releasedMilestones Number of released milestones
     * @return totalMilestones Total milestones
     * @return paidPercentage Percentage of amount paid (0-100)
     * @return releasedPercentage Percentage of amount released (0-100)
     */
    function getInvoiceProgress(uint256 invoiceId) 
        external 
        view 
        returns (
            uint256 paidMilestones,
            uint256 releasedMilestones,
            uint256 totalMilestones,
            uint256 paidPercentage,
            uint256 releasedPercentage
        ) 
    {
        MilestoneInvoice storage invoice = invoices[invoiceId];
        totalMilestones = invoice.milestoneCount;
        
        for (uint256 i = 0; i < invoice.milestoneCount; i++) {
            MilestoneStatus status = milestones[invoiceId][i].status;
            if (status == MilestoneStatus.Paid || status == MilestoneStatus.Released) {
                paidMilestones++;
            }
            if (status == MilestoneStatus.Released) {
                releasedMilestones++;
            }
        }
        
        if (invoice.totalAmount > 0) {
            paidPercentage = (invoice.paidAmount * 100) / invoice.totalAmount;
            releasedPercentage = (invoice.releasedAmount * 100) / invoice.totalAmount;
        }
    }

    // ============ Internal Functions ============

    function _canActAsMerchant(address merchant, address actor) internal view returns (bool) {
        if (actor == merchant) return true;
        if (address(merchantRegistry) != address(0)) {
            return merchantRegistry.canActForMerchant(merchant, actor);
        }
        return false;
    }

    function _getPayoutAddress(address merchant) internal view returns (address) {
        if (address(merchantRegistry) != address(0)) {
            try merchantRegistry.getPayoutAddress(merchant) returns (address payout) {
                if (payout != address(0)) return payout;
            } catch {}
        }
        return merchant;
    }

    function _checkInvoiceCompletion(uint256 invoiceId) internal {
        MilestoneInvoice storage invoice = invoices[invoiceId];
        
        bool allReleased = true;
        for (uint256 i = 0; i < invoice.milestoneCount; i++) {
            if (milestones[invoiceId][i].status != MilestoneStatus.Released &&
                milestones[invoiceId][i].status != MilestoneStatus.Refunded) {
                allReleased = false;
                break;
            }
        }
        
        if (allReleased) {
            invoice.status = InvoiceStatus.Completed;
            emit InvoiceCompleted(invoiceId);
        }
    }
}
