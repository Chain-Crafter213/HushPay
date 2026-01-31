// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

interface IHushPayFeeManager {
    function feeRecipient() external view returns (address);
    function feeBps() external view returns (uint16);
    function calculateFee(uint256 amount) external view returns (uint256);
}

interface IHushPayMerchantRegistry {
    function canActForMerchant(address merchant, address actor) external view returns (bool);
    function getPayoutAddress(address merchant) external view returns (address);
}

interface IHushPayDisputes {
    function hasActiveDispute(uint256 invoiceId) external view returns (bool);
}

/**
 * @title HushPayInvoicesV2
 * @notice Enhanced invoice contract with FeeManager integration, dispute support, and EIP-712 signatures
 * @dev Supports creating invoices on-chain and "pay in one click" with merchant signatures
 */
contract HushPayInvoicesV2 is ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // ============ Constants ============
    bytes32 public constant INVOICE_TYPEHASH = keccak256(
        "Invoice(address merchant,uint256 amount,bytes32 memoHash,uint64 dueAt,string metadataCID,uint256 nonce,uint256 deadline)"
    );

    // ============ Enums ============
    enum InvoiceStatus { Unpaid, Paid, Released, Refunded, Cancelled }

    // ============ Structs ============
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

    // ============ State ============
    IERC20 public immutable usdcToken;
    IHushPayFeeManager public feeManager;
    IHushPayMerchantRegistry public merchantRegistry;
    IHushPayDisputes public disputesContract;

    uint256 public nextInvoiceId = 1;
    mapping(uint256 => Invoice) public invoices;
    mapping(address => uint256) public nonces; // For EIP-712 signatures

    // ============ Events ============
    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed merchant,
        uint256 amount,
        uint64 dueAt,
        bytes32 memoHash,
        string metadataCID
    );
    event InvoicePaid(uint256 indexed invoiceId, address indexed payer);
    event InvoiceReleased(uint256 indexed invoiceId, address indexed merchant, uint256 feeAmount);
    event InvoiceRefunded(uint256 indexed invoiceId, address indexed payer);
    event InvoiceCancelled(uint256 indexed invoiceId);
    event InvoicePaidWithSig(
        uint256 indexed invoiceId,
        address indexed merchant,
        address indexed payer,
        uint256 amount
    );
    event FeeManagerUpdated(address indexed oldManager, address indexed newManager);
    event MerchantRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event DisputesContractUpdated(address indexed oldContract, address indexed newContract);

    // ============ Errors ============
    error InvalidUsdcToken();
    error InvalidFeeManager();
    error InvalidAmount();
    error InvoiceNotFound();
    error InvalidStatus();
    error OnlyMerchant();
    error TransferFailed();
    error InvoiceHasActiveDispute();
    error InvalidSignature();
    error SignatureExpired();
    error InvalidNonce();

    // ============ Constructor ============
    constructor(
        address _usdcToken,
        address _feeManager,
        address _merchantRegistry,
        address _disputesContract
    ) EIP712("HushPayInvoices", "2") {
        if (_usdcToken == address(0)) revert InvalidUsdcToken();
        if (_feeManager == address(0)) revert InvalidFeeManager();
        
        usdcToken = IERC20(_usdcToken);
        feeManager = IHushPayFeeManager(_feeManager);
        
        if (_merchantRegistry != address(0)) {
            merchantRegistry = IHushPayMerchantRegistry(_merchantRegistry);
        }
        if (_disputesContract != address(0)) {
            disputesContract = IHushPayDisputes(_disputesContract);
        }
    }

    // ============ Create Functions ============

    /**
     * @notice Create a new invoice
     * @param amount Invoice amount in USDC (6 decimals)
     * @param memoHash Hash of invoice memo
     * @param dueAt Due date timestamp (0 for no due date)
     * @param metadataCID IPFS CID for extended metadata
     */
    function createInvoice(
        uint256 amount,
        bytes32 memoHash,
        uint64 dueAt,
        string calldata metadataCID
    ) external nonReentrant returns (uint256 invoiceId) {
        invoiceId = nextInvoiceId++;

        invoices[invoiceId] = Invoice({
            id: invoiceId,
            merchant: msg.sender,
            usdcAmount: amount,
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

        emit InvoiceCreated(invoiceId, msg.sender, amount, dueAt, memoHash, metadataCID);
    }

    // ============ Payment Functions ============

    /**
     * @notice Pay an invoice
     * @param invoiceId Invoice ID to pay
     */
    function payInvoice(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Unpaid) revert InvalidStatus();

        usdcToken.safeTransferFrom(msg.sender, address(this), invoice.usdcAmount);

        invoice.status = InvoiceStatus.Paid;
        invoice.payer = msg.sender;
        invoice.paidAt = uint64(block.timestamp);

        emit InvoicePaid(invoiceId, msg.sender);
    }

    /**
     * @notice Pay invoice using merchant's off-chain signature (pay in one click)
     * @dev Creates and pays invoice in one transaction using EIP-712 typed data
     * @param merchant Merchant address
     * @param amount Invoice amount
     * @param memoHash Hash of invoice memo
     * @param dueAt Due date
     * @param metadataCID IPFS CID
     * @param nonce Merchant's nonce
     * @param deadline Signature deadline
     * @param signature Merchant's EIP-712 signature
     */
    function payInvoiceWithSig(
        address merchant,
        uint256 amount,
        bytes32 memoHash,
        uint64 dueAt,
        string calldata metadataCID,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant returns (uint256 invoiceId) {
        // Validate deadline
        if (block.timestamp > deadline) revert SignatureExpired();
        
        // Validate nonce
        if (nonce != nonces[merchant]) revert InvalidNonce();
        
        // Verify signature
        bytes32 structHash = keccak256(
            abi.encode(
                INVOICE_TYPEHASH,
                merchant,
                amount,
                memoHash,
                dueAt,
                keccak256(bytes(metadataCID)),
                nonce,
                deadline
            )
        );
        
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);
        
        if (signer != merchant) revert InvalidSignature();
        
        // Increment nonce
        nonces[merchant]++;
        
        // Create invoice
        invoiceId = nextInvoiceId++;
        
        invoices[invoiceId] = Invoice({
            id: invoiceId,
            merchant: merchant,
            usdcAmount: amount,
            status: InvoiceStatus.Paid, // Already paid
            createdAt: uint64(block.timestamp),
            dueAt: dueAt,
            payer: msg.sender,
            paidAt: uint64(block.timestamp),
            releasedAt: 0,
            refundedAt: 0,
            memoHash: memoHash,
            metadataCID: metadataCID
        });
        
        // Transfer USDC
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        
        emit InvoiceCreated(invoiceId, merchant, amount, dueAt, memoHash, metadataCID);
        emit InvoicePaidWithSig(invoiceId, merchant, msg.sender, amount);
    }

    // ============ Release/Refund Functions ============

    /**
     * @notice Release funds to merchant
     * @param invoiceId Invoice ID
     */
    function release(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Paid) revert InvalidStatus();
        if (!_canActAsMerchant(invoice.merchant, msg.sender)) revert OnlyMerchant();
        
        // Check for active disputes
        if (address(disputesContract) != address(0)) {
            if (disputesContract.hasActiveDispute(invoiceId)) revert InvoiceHasActiveDispute();
        }

        uint256 fee = feeManager.calculateFee(invoice.usdcAmount);
        uint256 merchantAmount = invoice.usdcAmount - fee;

        invoice.status = InvoiceStatus.Released;
        invoice.releasedAt = uint64(block.timestamp);

        // Get payout address
        address payoutAddress = _getPayoutAddress(invoice.merchant);

        // Transfer fees and merchant amount
        if (fee > 0) {
            usdcToken.safeTransfer(feeManager.feeRecipient(), fee);
        }
        usdcToken.safeTransfer(payoutAddress, merchantAmount);

        emit InvoiceReleased(invoiceId, invoice.merchant, fee);
    }

    /**
     * @notice Refund payment to payer
     * @param invoiceId Invoice ID
     */
    function refund(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Paid) revert InvalidStatus();
        if (!_canActAsMerchant(invoice.merchant, msg.sender)) revert OnlyMerchant();
        
        // Check for active disputes
        if (address(disputesContract) != address(0)) {
            if (disputesContract.hasActiveDispute(invoiceId)) revert InvoiceHasActiveDispute();
        }

        invoice.status = InvoiceStatus.Refunded;
        invoice.refundedAt = uint64(block.timestamp);

        usdcToken.safeTransfer(invoice.payer, invoice.usdcAmount);

        emit InvoiceRefunded(invoiceId, invoice.payer);
    }

    /**
     * @notice Cancel an unpaid invoice
     * @param invoiceId Invoice ID
     */
    function cancelInvoice(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Unpaid) revert InvalidStatus();
        if (!_canActAsMerchant(invoice.merchant, msg.sender)) revert OnlyMerchant();

        invoice.status = InvoiceStatus.Cancelled;

        emit InvoiceCancelled(invoiceId);
    }

    // ============ View Functions ============

    /**
     * @notice Get invoice details
     * @param invoiceId Invoice ID
     */
    function getInvoice(uint256 invoiceId) external view returns (Invoice memory) {
        return invoices[invoiceId];
    }

    /**
     * @notice Get multiple invoices
     * @param invoiceIds Array of invoice IDs
     */
    function getInvoices(uint256[] calldata invoiceIds) external view returns (Invoice[] memory) {
        Invoice[] memory result = new Invoice[](invoiceIds.length);
        for (uint256 i = 0; i < invoiceIds.length; i++) {
            result[i] = invoices[invoiceIds[i]];
        }
        return result;
    }

    /**
     * @notice Get domain separator for EIP-712
     */
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @notice Get nonce for merchant
     * @param merchant Merchant address
     */
    function getNonce(address merchant) external view returns (uint256) {
        return nonces[merchant];
    }

    /**
     * @notice Calculate fee for amount
     * @param amount Amount to calculate fee for
     */
    function calculateFee(uint256 amount) external view returns (uint256) {
        return feeManager.calculateFee(amount);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update fee manager (only callable by current fee manager admin)
     * @param _newFeeManager New fee manager address
     */
    function setFeeManager(address _newFeeManager) external {
        // Only allow if caller has admin role on fee manager
        require(msg.sender == address(feeManager) || _newFeeManager != address(0), "Unauthorized");
        address oldManager = address(feeManager);
        feeManager = IHushPayFeeManager(_newFeeManager);
        emit FeeManagerUpdated(oldManager, _newFeeManager);
    }

    /**
     * @notice Update merchant registry
     * @param _newRegistry New registry address
     */
    function setMerchantRegistry(address _newRegistry) external {
        address oldRegistry = address(merchantRegistry);
        merchantRegistry = IHushPayMerchantRegistry(_newRegistry);
        emit MerchantRegistryUpdated(oldRegistry, _newRegistry);
    }

    /**
     * @notice Update disputes contract
     * @param _newDisputes New disputes contract address
     */
    function setDisputesContract(address _newDisputes) external {
        address oldContract = address(disputesContract);
        disputesContract = IHushPayDisputes(_newDisputes);
        emit DisputesContractUpdated(oldContract, _newDisputes);
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
}
