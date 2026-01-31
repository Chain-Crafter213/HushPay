// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HushPayInvoices
 * @notice Escrow-based invoice system for USDC payments on Polygon PoS
 * @dev Implements create, pay, release, refund, and cancel flows with fee collection
 */
contract HushPayInvoices is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================
    // TYPES
    // ============================================

    enum InvoiceStatus {
        Unpaid,      // 0: Invoice created, awaiting payment
        PaidEscrowed, // 1: Payment received, held in escrow
        Released,    // 2: Funds released to merchant
        Refunded,    // 3: Funds refunded to payer
        Cancelled    // 4: Invoice cancelled by merchant (before payment)
    }

    struct Invoice {
        uint256 id;
        address merchant;
        uint256 usdcAmount;      // Amount in USDC (6 decimals)
        InvoiceStatus status;
        uint64 createdAt;
        uint64 dueAt;           // 0 if no due date
        address payer;
        uint64 paidAt;
        uint64 releasedAt;
        uint64 refundedAt;
        bytes32 memoHash;       // Hash of memo for verification
        string metadataCID;     // IPFS CID for full invoice metadata (optional)
    }

    // ============================================
    // STATE VARIABLES
    // ============================================

    IERC20 public immutable usdcToken;
    address public feeRecipient;
    uint16 public feeBps;           // Fee in basis points (max 100 = 1%)
    uint16 public constant MAX_FEE_BPS = 100; // 1% max fee

    uint256 public nextInvoiceId;
    mapping(uint256 => Invoice) public invoices;

    // ============================================
    // EVENTS
    // ============================================

    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed merchant,
        uint256 amount,
        uint64 dueAt,
        bytes32 memoHash,
        string metadataCID
    );

    event InvoiceCancelled(uint256 indexed invoiceId);

    event InvoicePaid(
        uint256 indexed invoiceId,
        address indexed payer
    );

    event InvoiceReleased(
        uint256 indexed invoiceId,
        address indexed merchant,
        uint256 feeAmount
    );

    event InvoiceRefunded(
        uint256 indexed invoiceId,
        address indexed payer
    );

    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event FeeBpsUpdated(uint16 oldFeeBps, uint16 newFeeBps);

    // ============================================
    // ERRORS
    // ============================================

    error InvalidUsdcToken();
    error InvalidFeeRecipient();
    error FeeTooHigh();
    error InvalidAmount();
    error InvoiceNotFound();
    error OnlyMerchant();
    error InvalidStatus();
    error TransferFailed();

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @param _usdcToken Address of USDC token on Polygon
     * @param _feeRecipient Address that receives fees
     * @param _feeBps Fee in basis points (max 100 = 1%)
     */
    constructor(
        address _usdcToken,
        address _feeRecipient,
        uint16 _feeBps
    ) {
        if (_usdcToken == address(0)) revert InvalidUsdcToken();
        if (_feeRecipient == address(0)) revert InvalidFeeRecipient();
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh();

        usdcToken = IERC20(_usdcToken);
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
        nextInvoiceId = 1;
    }

    // ============================================
    // MERCHANT FUNCTIONS
    // ============================================

    /**
     * @notice Create a new invoice
     * @param usdcAmount Amount in USDC (6 decimals)
     * @param dueAt Due date timestamp (0 for no due date)
     * @param memoHash Hash of the memo/description
     * @param metadataCID IPFS CID for full metadata (optional, can be empty)
     * @return invoiceId The ID of the created invoice
     */
    function createInvoice(
        uint256 usdcAmount,
        uint64 dueAt,
        bytes32 memoHash,
        string calldata metadataCID
    ) external returns (uint256 invoiceId) {
        if (usdcAmount == 0) revert InvalidAmount();

        invoiceId = nextInvoiceId++;

        invoices[invoiceId] = Invoice({
            id: invoiceId,
            merchant: msg.sender,
            usdcAmount: usdcAmount,
            status: InvoiceStatus.Unpaid,
            createdAt: uint64(block.timestamp),
            dueAt: dueAt,
            payer: address(0),
            paidAt: 0,
            releasedAt: 0,
            refundedAt: 0,
            memoHash: memoHash,
            metadataCID: metadataCID
        });

        emit InvoiceCreated(
            invoiceId,
            msg.sender,
            usdcAmount,
            dueAt,
            memoHash,
            metadataCID
        );
    }

    /**
     * @notice Cancel an unpaid invoice
     * @param invoiceId The invoice ID to cancel
     */
    function cancelInvoice(uint256 invoiceId) external {
        Invoice storage invoice = invoices[invoiceId];
        
        if (invoice.merchant == address(0)) revert InvoiceNotFound();
        if (invoice.merchant != msg.sender) revert OnlyMerchant();
        if (invoice.status != InvoiceStatus.Unpaid) revert InvalidStatus();

        invoice.status = InvoiceStatus.Cancelled;

        emit InvoiceCancelled(invoiceId);
    }

    /**
     * @notice Release escrowed funds to merchant (minus fee)
     * @param invoiceId The invoice ID to release
     */
    function release(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        
        if (invoice.merchant == address(0)) revert InvoiceNotFound();
        if (invoice.merchant != msg.sender) revert OnlyMerchant();
        if (invoice.status != InvoiceStatus.PaidEscrowed) revert InvalidStatus();

        invoice.status = InvoiceStatus.Released;
        invoice.releasedAt = uint64(block.timestamp);

        uint256 feeAmount = (invoice.usdcAmount * feeBps) / 10000;
        uint256 merchantAmount = invoice.usdcAmount - feeAmount;

        // Transfer fee to fee recipient
        if (feeAmount > 0) {
            usdcToken.safeTransfer(feeRecipient, feeAmount);
        }

        // Transfer remaining to merchant
        usdcToken.safeTransfer(invoice.merchant, merchantAmount);

        emit InvoiceReleased(invoiceId, invoice.merchant, feeAmount);
    }

    /**
     * @notice Refund escrowed funds to payer
     * @param invoiceId The invoice ID to refund
     */
    function refund(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        
        if (invoice.merchant == address(0)) revert InvoiceNotFound();
        if (invoice.merchant != msg.sender) revert OnlyMerchant();
        if (invoice.status != InvoiceStatus.PaidEscrowed) revert InvalidStatus();

        invoice.status = InvoiceStatus.Refunded;
        invoice.refundedAt = uint64(block.timestamp);

        // Full refund to payer (no fee taken on refunds)
        usdcToken.safeTransfer(invoice.payer, invoice.usdcAmount);

        emit InvoiceRefunded(invoiceId, invoice.payer);
    }

    // ============================================
    // PAYER FUNCTIONS
    // ============================================

    /**
     * @notice Pay an invoice (requires prior USDC approval)
     * @param invoiceId The invoice ID to pay
     */
    function payInvoice(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        
        if (invoice.merchant == address(0)) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Unpaid) revert InvalidStatus();

        invoice.status = InvoiceStatus.PaidEscrowed;
        invoice.payer = msg.sender;
        invoice.paidAt = uint64(block.timestamp);

        // Transfer USDC from payer to contract (escrow)
        usdcToken.safeTransferFrom(msg.sender, address(this), invoice.usdcAmount);

        emit InvoicePaid(invoiceId, msg.sender);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get invoice details
     * @param invoiceId The invoice ID
     * @return invoice The invoice struct
     */
    function getInvoice(uint256 invoiceId) external view returns (Invoice memory) {
        Invoice memory invoice = invoices[invoiceId];
        if (invoice.merchant == address(0)) revert InvoiceNotFound();
        return invoice;
    }

    /**
     * @notice Get multiple invoices by IDs
     * @param invoiceIds Array of invoice IDs
     * @return Array of invoice structs
     */
    function getInvoices(uint256[] calldata invoiceIds) external view returns (Invoice[] memory) {
        Invoice[] memory result = new Invoice[](invoiceIds.length);
        for (uint256 i = 0; i < invoiceIds.length; i++) {
            result[i] = invoices[invoiceIds[i]];
        }
        return result;
    }

    /**
     * @notice Calculate fee for a given amount
     * @param amount The USDC amount
     * @return feeAmount The fee amount
     */
    function calculateFee(uint256 amount) external view returns (uint256) {
        return (amount * feeBps) / 10000;
    }

    // ============================================
    // ADMIN FUNCTIONS (for future governance)
    // ============================================

    /**
     * @notice Update fee recipient (only current fee recipient can change)
     * @param newFeeRecipient New fee recipient address
     */
    function setFeeRecipient(address newFeeRecipient) external {
        if (msg.sender != feeRecipient) revert OnlyMerchant();
        if (newFeeRecipient == address(0)) revert InvalidFeeRecipient();
        
        address oldRecipient = feeRecipient;
        feeRecipient = newFeeRecipient;
        
        emit FeeRecipientUpdated(oldRecipient, newFeeRecipient);
    }

    /**
     * @notice Update fee basis points (only fee recipient can change)
     * @param newFeeBps New fee in basis points
     */
    function setFeeBps(uint16 newFeeBps) external {
        if (msg.sender != feeRecipient) revert OnlyMerchant();
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        
        uint16 oldFeeBps = feeBps;
        feeBps = newFeeBps;
        
        emit FeeBpsUpdated(oldFeeBps, newFeeBps);
    }
}
