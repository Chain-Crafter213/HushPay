// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IHushPayInvoices {
    enum InvoiceStatus { Unpaid, Paid, Released, Refunded, Cancelled }
    
    struct Invoice {
        uint256 id;
        address merchant;
        uint256 usdcAmount;
        InvoiceStatus status;
        uint64 createdAt;
        uint64 dueAt;
        address payer;
        uint64 paidAt;
        uint64 releasedAt;
        uint64 refundedAt;
        bytes32 memoHash;
        string metadataCID;
    }
    
    function getInvoice(uint256 invoiceId) external view returns (Invoice memory);
    function usdcToken() external view returns (address);
}

/**
 * @title HushPayDisputes
 * @notice Dispute resolution system for paid invoices
 * @dev Allows payers to open disputes, with arbiter resolution
 */
contract HushPayDisputes is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Roles ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ============ Enums ============
    enum DisputeStatus { None, Open, Resolved }
    enum DisputeOutcome { None, ReleasedToMerchant, RefundedToPayer, Split }

    // ============ Structs ============
    struct Dispute {
        uint256 invoiceId;
        address payer;
        address merchant;
        uint256 amount;
        DisputeStatus status;
        DisputeOutcome outcome;
        string reason; // IPFS CID or short reason
        uint256 openedAt;
        uint256 resolvedAt;
        uint256 merchantAmount; // Amount to merchant (for splits)
        uint256 payerAmount; // Amount to payer (for splits)
        address resolvedBy;
    }

    // ============ State ============
    IHushPayInvoices public immutable invoicesContract;
    IERC20 public immutable usdcToken;
    
    uint256 public disputeWindow = 7 days; // Time after payment when disputes can be opened
    uint256 public disputeCount;
    
    mapping(uint256 => Dispute) public disputes; // disputeId => Dispute
    mapping(uint256 => uint256) public invoiceToDispute; // invoiceId => disputeId
    mapping(uint256 => bool) public invoiceHasActiveDispute; // invoiceId => hasDispute
    
    // Escrowed amounts for disputed invoices
    mapping(uint256 => uint256) public escrowedAmounts; // invoiceId => amount

    // ============ Events ============
    event DisputeOpened(
        uint256 indexed disputeId,
        uint256 indexed invoiceId,
        address indexed payer,
        address merchant,
        uint256 amount,
        string reason
    );
    event DisputeResolved(
        uint256 indexed disputeId,
        uint256 indexed invoiceId,
        DisputeOutcome outcome,
        uint256 merchantAmount,
        uint256 payerAmount,
        address resolvedBy
    );
    event DisputeWindowUpdated(uint256 oldWindow, uint256 newWindow);
    event FundsEscrowed(uint256 indexed invoiceId, uint256 amount);
    event FundsReleased(uint256 indexed invoiceId, address indexed to, uint256 amount);

    // ============ Errors ============
    error InvoiceNotFound();
    error InvoiceNotPaid();
    error NotInvoicePayer();
    error DisputeWindowExpired();
    error DisputeAlreadyExists();
    error DisputeNotFound();
    error DisputeNotOpen();
    error InvalidOutcome();
    error InvalidSplitAmounts();
    error TransferFailed();
    error NoFundsEscrowed();
    error InvoiceHasActiveDispute();

    // ============ Constructor ============
    constructor(
        address _invoicesContract,
        address _admin
    ) {
        invoicesContract = IHushPayInvoices(_invoicesContract);
        usdcToken = IERC20(IHushPayInvoices(_invoicesContract).usdcToken());
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(ARBITER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    // ============ Payer Functions ============

    /**
     * @notice Open a dispute for a paid invoice
     * @dev Payer must transfer funds to this contract for escrow
     * @param invoiceId The invoice to dispute
     * @param reason IPFS CID or short reason for dispute
     */
    function openDispute(uint256 invoiceId, string calldata reason) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (uint256 disputeId) 
    {
        IHushPayInvoices.Invoice memory invoice = invoicesContract.getInvoice(invoiceId);
        
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != IHushPayInvoices.InvoiceStatus.Paid) revert InvoiceNotPaid();
        if (invoice.payer != msg.sender) revert NotInvoicePayer();
        if (block.timestamp > invoice.paidAt + disputeWindow) revert DisputeWindowExpired();
        if (invoiceHasActiveDispute[invoiceId]) revert DisputeAlreadyExists();

        disputeCount++;
        disputeId = disputeCount;

        disputes[disputeId] = Dispute({
            invoiceId: invoiceId,
            payer: msg.sender,
            merchant: invoice.merchant,
            amount: invoice.usdcAmount,
            status: DisputeStatus.Open,
            outcome: DisputeOutcome.None,
            reason: reason,
            openedAt: block.timestamp,
            resolvedAt: 0,
            merchantAmount: 0,
            payerAmount: 0,
            resolvedBy: address(0)
        });

        invoiceToDispute[invoiceId] = disputeId;
        invoiceHasActiveDispute[invoiceId] = true;
        
        // Note: In production, the invoice contract would transfer funds here
        // For now, we track the escrow state
        escrowedAmounts[invoiceId] = invoice.usdcAmount;

        emit DisputeOpened(
            disputeId,
            invoiceId,
            msg.sender,
            invoice.merchant,
            invoice.usdcAmount,
            reason
        );
        
        emit FundsEscrowed(invoiceId, invoice.usdcAmount);
    }

    // ============ Arbiter Functions ============

    /**
     * @notice Resolve a dispute - release all funds to merchant
     * @param disputeId The dispute to resolve
     */
    function resolveRelease(uint256 disputeId) 
        external 
        onlyRole(ARBITER_ROLE) 
        nonReentrant 
        whenNotPaused 
    {
        Dispute storage dispute = disputes[disputeId];
        _validateDisputeForResolution(dispute);

        dispute.status = DisputeStatus.Resolved;
        dispute.outcome = DisputeOutcome.ReleasedToMerchant;
        dispute.merchantAmount = dispute.amount;
        dispute.payerAmount = 0;
        dispute.resolvedAt = block.timestamp;
        dispute.resolvedBy = msg.sender;
        
        invoiceHasActiveDispute[dispute.invoiceId] = false;
        
        // Transfer to merchant
        uint256 amount = escrowedAmounts[dispute.invoiceId];
        if (amount > 0) {
            escrowedAmounts[dispute.invoiceId] = 0;
            usdcToken.safeTransfer(dispute.merchant, amount);
            emit FundsReleased(dispute.invoiceId, dispute.merchant, amount);
        }

        emit DisputeResolved(
            disputeId,
            dispute.invoiceId,
            DisputeOutcome.ReleasedToMerchant,
            dispute.amount,
            0,
            msg.sender
        );
    }

    /**
     * @notice Resolve a dispute - refund all funds to payer
     * @param disputeId The dispute to resolve
     */
    function resolveRefund(uint256 disputeId) 
        external 
        onlyRole(ARBITER_ROLE) 
        nonReentrant 
        whenNotPaused 
    {
        Dispute storage dispute = disputes[disputeId];
        _validateDisputeForResolution(dispute);

        dispute.status = DisputeStatus.Resolved;
        dispute.outcome = DisputeOutcome.RefundedToPayer;
        dispute.merchantAmount = 0;
        dispute.payerAmount = dispute.amount;
        dispute.resolvedAt = block.timestamp;
        dispute.resolvedBy = msg.sender;
        
        invoiceHasActiveDispute[dispute.invoiceId] = false;
        
        // Transfer to payer
        uint256 amount = escrowedAmounts[dispute.invoiceId];
        if (amount > 0) {
            escrowedAmounts[dispute.invoiceId] = 0;
            usdcToken.safeTransfer(dispute.payer, amount);
            emit FundsReleased(dispute.invoiceId, dispute.payer, amount);
        }

        emit DisputeResolved(
            disputeId,
            dispute.invoiceId,
            DisputeOutcome.RefundedToPayer,
            0,
            dispute.amount,
            msg.sender
        );
    }

    /**
     * @notice Resolve a dispute - split funds between merchant and payer
     * @param disputeId The dispute to resolve
     * @param merchantAmount Amount to send to merchant
     */
    function resolveSplit(uint256 disputeId, uint256 merchantAmount) 
        external 
        onlyRole(ARBITER_ROLE) 
        nonReentrant 
        whenNotPaused 
    {
        Dispute storage dispute = disputes[disputeId];
        _validateDisputeForResolution(dispute);
        
        if (merchantAmount > dispute.amount) revert InvalidSplitAmounts();
        uint256 payerAmount = dispute.amount - merchantAmount;

        dispute.status = DisputeStatus.Resolved;
        dispute.outcome = DisputeOutcome.Split;
        dispute.merchantAmount = merchantAmount;
        dispute.payerAmount = payerAmount;
        dispute.resolvedAt = block.timestamp;
        dispute.resolvedBy = msg.sender;
        
        invoiceHasActiveDispute[dispute.invoiceId] = false;
        
        // Transfer split amounts
        uint256 escrowed = escrowedAmounts[dispute.invoiceId];
        if (escrowed > 0) {
            escrowedAmounts[dispute.invoiceId] = 0;
            
            if (merchantAmount > 0) {
                usdcToken.safeTransfer(dispute.merchant, merchantAmount);
                emit FundsReleased(dispute.invoiceId, dispute.merchant, merchantAmount);
            }
            if (payerAmount > 0) {
                usdcToken.safeTransfer(dispute.payer, payerAmount);
                emit FundsReleased(dispute.invoiceId, dispute.payer, payerAmount);
            }
        }

        emit DisputeResolved(
            disputeId,
            dispute.invoiceId,
            DisputeOutcome.Split,
            merchantAmount,
            payerAmount,
            msg.sender
        );
    }

    // ============ View Functions ============

    /**
     * @notice Get dispute details
     * @param disputeId Dispute ID
     */
    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return disputes[disputeId];
    }

    /**
     * @notice Get dispute for an invoice
     * @param invoiceId Invoice ID
     */
    function getDisputeForInvoice(uint256 invoiceId) external view returns (Dispute memory) {
        uint256 disputeId = invoiceToDispute[invoiceId];
        return disputes[disputeId];
    }

    /**
     * @notice Check if invoice has an active dispute
     * @param invoiceId Invoice ID
     */
    function hasActiveDispute(uint256 invoiceId) external view returns (bool) {
        return invoiceHasActiveDispute[invoiceId];
    }

    /**
     * @notice Check if invoice is within dispute window
     * @param invoiceId Invoice ID
     */
    function canOpenDispute(uint256 invoiceId) external view returns (bool) {
        IHushPayInvoices.Invoice memory invoice = invoicesContract.getInvoice(invoiceId);
        if (invoice.status != IHushPayInvoices.InvoiceStatus.Paid) return false;
        if (invoiceHasActiveDispute[invoiceId]) return false;
        return block.timestamp <= invoice.paidAt + disputeWindow;
    }

    /**
     * @notice Get time remaining in dispute window
     * @param invoiceId Invoice ID
     */
    function disputeWindowRemaining(uint256 invoiceId) external view returns (uint256) {
        IHushPayInvoices.Invoice memory invoice = invoicesContract.getInvoice(invoiceId);
        if (invoice.status != IHushPayInvoices.InvoiceStatus.Paid) return 0;
        
        uint256 windowEnd = invoice.paidAt + disputeWindow;
        if (block.timestamp >= windowEnd) return 0;
        return windowEnd - block.timestamp;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update dispute window duration
     * @param newWindow New window duration in seconds
     */
    function setDisputeWindow(uint256 newWindow) external onlyRole(ADMIN_ROLE) {
        uint256 oldWindow = disputeWindow;
        disputeWindow = newWindow;
        emit DisputeWindowUpdated(oldWindow, newWindow);
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Deposit funds into escrow for a dispute
     * @dev Called by invoice contract or manually
     * @param invoiceId Invoice ID
     * @param amount Amount to escrow
     */
    function escrowFunds(uint256 invoiceId, uint256 amount) 
        external 
        nonReentrant 
    {
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        escrowedAmounts[invoiceId] += amount;
        emit FundsEscrowed(invoiceId, amount);
    }

    // ============ Internal Functions ============

    function _validateDisputeForResolution(Dispute storage dispute) internal view {
        if (dispute.invoiceId == 0) revert DisputeNotFound();
        if (dispute.status != DisputeStatus.Open) revert DisputeNotOpen();
    }
}
