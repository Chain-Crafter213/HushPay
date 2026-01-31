// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HushPayFeeManager
 * @notice Centralized fee management for HushPay protocol
 * @dev Controls fee recipient and fee basis points with admin controls
 */
contract HushPayFeeManager is AccessControl, ReentrancyGuard {
    // ============ Roles ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FEE_SETTER_ROLE = keccak256("FEE_SETTER_ROLE");

    // ============ Constants ============
    uint16 public constant MAX_FEE_BPS = 100; // 1% max fee

    // ============ State ============
    address public feeRecipient;
    uint16 public feeBps;
    
    // Timelock for fee changes
    uint256 public constant FEE_CHANGE_DELAY = 2 days;
    
    struct PendingFeeChange {
        uint16 newFeeBps;
        uint256 effectiveTime;
        bool pending;
    }
    
    struct PendingRecipientChange {
        address newRecipient;
        uint256 effectiveTime;
        bool pending;
    }
    
    PendingFeeChange public pendingFeeChange;
    PendingRecipientChange public pendingRecipientChange;

    // ============ Events ============
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event FeeBpsUpdated(uint16 oldFeeBps, uint16 newFeeBps);
    event FeeChangeProposed(uint16 newFeeBps, uint256 effectiveTime);
    event RecipientChangeProposed(address indexed newRecipient, uint256 effectiveTime);
    event FeeChangeCancelled();
    event RecipientChangeCancelled();

    // ============ Errors ============
    error InvalidFeeRecipient();
    error FeeTooHigh();
    error NoChangesPending();
    error TimelockNotExpired();
    error ChangeAlreadyPending();

    // ============ Constructor ============
    constructor(address _feeRecipient, uint16 _feeBps, address _admin) {
        if (_feeRecipient == address(0)) revert InvalidFeeRecipient();
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(FEE_SETTER_ROLE, _admin);
    }

    // ============ View Functions ============
    
    /**
     * @notice Calculate fee for a given amount
     * @param amount The amount to calculate fee for
     * @return fee The fee amount
     */
    function calculateFee(uint256 amount) external view returns (uint256 fee) {
        return (amount * feeBps) / 10000;
    }

    /**
     * @notice Get current fee settings
     * @return recipient The fee recipient address
     * @return bps The fee in basis points
     */
    function getFeeSettings() external view returns (address recipient, uint16 bps) {
        return (feeRecipient, feeBps);
    }

    // ============ Admin Functions ============

    /**
     * @notice Propose a fee change (subject to timelock)
     * @param _newFeeBps New fee in basis points
     */
    function proposeFeeChange(uint16 _newFeeBps) external onlyRole(FEE_SETTER_ROLE) {
        if (_newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (pendingFeeChange.pending) revert ChangeAlreadyPending();
        
        pendingFeeChange = PendingFeeChange({
            newFeeBps: _newFeeBps,
            effectiveTime: block.timestamp + FEE_CHANGE_DELAY,
            pending: true
        });
        
        emit FeeChangeProposed(_newFeeBps, pendingFeeChange.effectiveTime);
    }

    /**
     * @notice Execute pending fee change after timelock
     */
    function executeFeeChange() external onlyRole(FEE_SETTER_ROLE) {
        if (!pendingFeeChange.pending) revert NoChangesPending();
        if (block.timestamp < pendingFeeChange.effectiveTime) revert TimelockNotExpired();
        
        uint16 oldFeeBps = feeBps;
        feeBps = pendingFeeChange.newFeeBps;
        pendingFeeChange.pending = false;
        
        emit FeeBpsUpdated(oldFeeBps, feeBps);
    }

    /**
     * @notice Cancel pending fee change
     */
    function cancelFeeChange() external onlyRole(ADMIN_ROLE) {
        if (!pendingFeeChange.pending) revert NoChangesPending();
        pendingFeeChange.pending = false;
        emit FeeChangeCancelled();
    }

    /**
     * @notice Propose fee recipient change (subject to timelock)
     * @param _newRecipient New fee recipient address
     */
    function proposeRecipientChange(address _newRecipient) external onlyRole(ADMIN_ROLE) {
        if (_newRecipient == address(0)) revert InvalidFeeRecipient();
        if (pendingRecipientChange.pending) revert ChangeAlreadyPending();
        
        pendingRecipientChange = PendingRecipientChange({
            newRecipient: _newRecipient,
            effectiveTime: block.timestamp + FEE_CHANGE_DELAY,
            pending: true
        });
        
        emit RecipientChangeProposed(_newRecipient, pendingRecipientChange.effectiveTime);
    }

    /**
     * @notice Execute pending recipient change after timelock
     */
    function executeRecipientChange() external onlyRole(ADMIN_ROLE) {
        if (!pendingRecipientChange.pending) revert NoChangesPending();
        if (block.timestamp < pendingRecipientChange.effectiveTime) revert TimelockNotExpired();
        
        address oldRecipient = feeRecipient;
        feeRecipient = pendingRecipientChange.newRecipient;
        pendingRecipientChange.pending = false;
        
        emit FeeRecipientUpdated(oldRecipient, feeRecipient);
    }

    /**
     * @notice Cancel pending recipient change
     */
    function cancelRecipientChange() external onlyRole(ADMIN_ROLE) {
        if (!pendingRecipientChange.pending) revert NoChangesPending();
        pendingRecipientChange.pending = false;
        emit RecipientChangeCancelled();
    }

    /**
     * @notice Emergency fee update (bypasses timelock) - only DEFAULT_ADMIN
     * @dev Use only in emergencies
     */
    function emergencySetFee(uint16 _newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        uint16 oldFeeBps = feeBps;
        feeBps = _newFeeBps;
        emit FeeBpsUpdated(oldFeeBps, _newFeeBps);
    }

    /**
     * @notice Emergency recipient update (bypasses timelock) - only DEFAULT_ADMIN
     * @dev Use only in emergencies
     */
    function emergencySetRecipient(address _newRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newRecipient == address(0)) revert InvalidFeeRecipient();
        address oldRecipient = feeRecipient;
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(oldRecipient, _newRecipient);
    }
}
