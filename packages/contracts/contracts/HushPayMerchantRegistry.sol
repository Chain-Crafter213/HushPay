// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HushPayMerchantRegistry
 * @notice Merchant profile and payout address management
 * @dev Supports merchant registration, payout addresses, and team operators
 */
contract HushPayMerchantRegistry is AccessControl, ReentrancyGuard {
    // ============ Roles ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Per-merchant operator role prefix
    // Full role = keccak256(abi.encodePacked("MERCHANT_OPERATOR_", merchantAddress))
    
    // ============ Structs ============
    struct Merchant {
        address owner;
        address payoutAddress;
        string businessName;
        string metadataCID; // IPFS CID for extended profile data
        uint256 registeredAt;
        bool active;
    }

    // ============ State ============
    mapping(address => Merchant) public merchants;
    mapping(address => address[]) public merchantOperators; // merchant => operators
    mapping(address => address) public operatorToMerchant; // operator => merchant (for reverse lookup)
    
    address[] public allMerchants;

    // ============ Events ============
    event MerchantRegistered(
        address indexed merchant,
        address indexed payoutAddress,
        string businessName,
        string metadataCID
    );
    event MerchantUpdated(
        address indexed merchant,
        string businessName,
        string metadataCID
    );
    event PayoutAddressUpdated(
        address indexed merchant,
        address indexed oldPayoutAddress,
        address indexed newPayoutAddress
    );
    event OperatorAdded(address indexed merchant, address indexed operator);
    event OperatorRemoved(address indexed merchant, address indexed operator);
    event MerchantDeactivated(address indexed merchant);
    event MerchantReactivated(address indexed merchant);

    // ============ Errors ============
    error MerchantAlreadyRegistered();
    error MerchantNotRegistered();
    error InvalidPayoutAddress();
    error NotMerchantOwner();
    error OperatorAlreadyAdded();
    error OperatorNotFound();
    error OperatorAlreadyAssigned();
    error MerchantNotActive();
    error CannotRemoveSelf();

    // ============ Constructor ============
    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }

    // ============ Modifiers ============
    
    modifier onlyMerchantOwner(address merchant) {
        if (merchants[merchant].owner != msg.sender) revert NotMerchantOwner();
        _;
    }

    modifier merchantExists(address merchant) {
        if (merchants[merchant].owner == address(0)) revert MerchantNotRegistered();
        _;
    }

    modifier merchantActive(address merchant) {
        if (!merchants[merchant].active) revert MerchantNotActive();
        _;
    }

    // ============ Registration Functions ============

    /**
     * @notice Register as a new merchant
     * @param payoutAddress Address to receive payments (can be different from msg.sender)
     * @param businessName Display name for the business
     * @param metadataCID IPFS CID for extended profile data
     */
    function registerMerchant(
        address payoutAddress,
        string calldata businessName,
        string calldata metadataCID
    ) external {
        if (merchants[msg.sender].owner != address(0)) revert MerchantAlreadyRegistered();
        if (payoutAddress == address(0)) revert InvalidPayoutAddress();

        merchants[msg.sender] = Merchant({
            owner: msg.sender,
            payoutAddress: payoutAddress,
            businessName: businessName,
            metadataCID: metadataCID,
            registeredAt: block.timestamp,
            active: true
        });

        allMerchants.push(msg.sender);

        emit MerchantRegistered(msg.sender, payoutAddress, businessName, metadataCID);
    }

    /**
     * @notice Update merchant profile
     * @param businessName New business name
     * @param metadataCID New IPFS CID for profile data
     */
    function updateProfile(
        string calldata businessName,
        string calldata metadataCID
    ) external merchantExists(msg.sender) onlyMerchantOwner(msg.sender) {
        merchants[msg.sender].businessName = businessName;
        merchants[msg.sender].metadataCID = metadataCID;

        emit MerchantUpdated(msg.sender, businessName, metadataCID);
    }

    /**
     * @notice Update payout address
     * @param newPayoutAddress New address to receive payments
     */
    function setPayoutAddress(address newPayoutAddress) 
        external 
        merchantExists(msg.sender) 
        onlyMerchantOwner(msg.sender) 
    {
        if (newPayoutAddress == address(0)) revert InvalidPayoutAddress();
        
        address oldPayoutAddress = merchants[msg.sender].payoutAddress;
        merchants[msg.sender].payoutAddress = newPayoutAddress;

        emit PayoutAddressUpdated(msg.sender, oldPayoutAddress, newPayoutAddress);
    }

    // ============ Operator Management ============

    /**
     * @notice Add an operator who can create invoices on behalf of merchant
     * @param operator Address to add as operator
     */
    function addOperator(address operator) 
        external 
        merchantExists(msg.sender) 
        onlyMerchantOwner(msg.sender)
        merchantActive(msg.sender)
    {
        if (operatorToMerchant[operator] != address(0)) revert OperatorAlreadyAssigned();
        
        // Check if already an operator for this merchant
        address[] storage ops = merchantOperators[msg.sender];
        for (uint256 i = 0; i < ops.length; i++) {
            if (ops[i] == operator) revert OperatorAlreadyAdded();
        }

        merchantOperators[msg.sender].push(operator);
        operatorToMerchant[operator] = msg.sender;

        emit OperatorAdded(msg.sender, operator);
    }

    /**
     * @notice Remove an operator
     * @param operator Address to remove
     */
    function removeOperator(address operator) 
        external 
        merchantExists(msg.sender) 
        onlyMerchantOwner(msg.sender) 
    {
        if (operator == msg.sender) revert CannotRemoveSelf();
        
        address[] storage ops = merchantOperators[msg.sender];
        bool found = false;
        
        for (uint256 i = 0; i < ops.length; i++) {
            if (ops[i] == operator) {
                ops[i] = ops[ops.length - 1];
                ops.pop();
                found = true;
                break;
            }
        }
        
        if (!found) revert OperatorNotFound();
        
        delete operatorToMerchant[operator];

        emit OperatorRemoved(msg.sender, operator);
    }

    // ============ View Functions ============

    /**
     * @notice Get merchant details
     * @param merchant Merchant address
     */
    function getMerchant(address merchant) external view returns (Merchant memory) {
        return merchants[merchant];
    }

    /**
     * @notice Get payout address for a merchant
     * @param merchant Merchant address
     */
    function getPayoutAddress(address merchant) external view returns (address) {
        if (merchants[merchant].owner == address(0)) revert MerchantNotRegistered();
        return merchants[merchant].payoutAddress;
    }

    /**
     * @notice Check if address is registered merchant
     * @param merchant Address to check
     */
    function isMerchant(address merchant) external view returns (bool) {
        return merchants[merchant].owner != address(0) && merchants[merchant].active;
    }

    /**
     * @notice Check if address is operator for a merchant
     * @param merchant Merchant address
     * @param operator Potential operator address
     */
    function isOperator(address merchant, address operator) external view returns (bool) {
        if (operator == merchant) return true; // Owner is always an operator
        return operatorToMerchant[operator] == merchant;
    }

    /**
     * @notice Check if address can act on behalf of merchant (owner or operator)
     * @param merchant Merchant address
     * @param actor Address to check
     */
    function canActForMerchant(address merchant, address actor) external view returns (bool) {
        if (merchants[merchant].owner == address(0)) return false;
        if (actor == merchant) return true;
        return operatorToMerchant[actor] == merchant;
    }

    /**
     * @notice Get all operators for a merchant
     * @param merchant Merchant address
     */
    function getOperators(address merchant) external view returns (address[] memory) {
        return merchantOperators[merchant];
    }

    /**
     * @notice Get merchant for an operator
     * @param operator Operator address
     */
    function getMerchantForOperator(address operator) external view returns (address) {
        return operatorToMerchant[operator];
    }

    /**
     * @notice Get total registered merchants count
     */
    function getMerchantCount() external view returns (uint256) {
        return allMerchants.length;
    }

    // ============ Admin Functions ============

    /**
     * @notice Deactivate a merchant (admin only)
     * @param merchant Merchant to deactivate
     */
    function deactivateMerchant(address merchant) 
        external 
        onlyRole(ADMIN_ROLE) 
        merchantExists(merchant) 
    {
        merchants[merchant].active = false;
        emit MerchantDeactivated(merchant);
    }

    /**
     * @notice Reactivate a merchant (admin only)
     * @param merchant Merchant to reactivate
     */
    function reactivateMerchant(address merchant) 
        external 
        onlyRole(ADMIN_ROLE) 
        merchantExists(merchant) 
    {
        merchants[merchant].active = true;
        emit MerchantReactivated(merchant);
    }
}
