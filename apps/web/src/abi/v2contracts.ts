// HushPayDisputes Contract ABI
export const HUSHPAY_DISPUTES_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_invoicesContract", "type": "address" },
      { "internalType": "address", "name": "_admin", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  { "inputs": [], "name": "DisputeAlreadyExists", "type": "error" },
  { "inputs": [], "name": "DisputeNotOpen", "type": "error" },
  { "inputs": [], "name": "DisputeWindowExpired", "type": "error" },
  { "inputs": [], "name": "InsufficientFunds", "type": "error" },
  { "inputs": [], "name": "InvalidInvoiceStatus", "type": "error" },
  { "inputs": [], "name": "InvalidSplitAmounts", "type": "error" },
  { "inputs": [], "name": "NotInvoicePayer", "type": "error" },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "disputeId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "payer", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "DisputeOpened",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "disputeId", "type": "uint256" },
      { "indexed": false, "internalType": "uint8", "name": "outcome", "type": "uint8" },
      { "indexed": true, "internalType": "address", "name": "resolvedBy", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "merchantAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "payerAmount", "type": "uint256" }
    ],
    "name": "DisputeResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "oldWindow", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "newWindow", "type": "uint256" }
    ],
    "name": "DisputeWindowUpdated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "ARBITER_ROLE",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DEFAULT_ADMIN_ROLE",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "canOpenDispute",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "disputeWindow",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "disputeWindowRemaining",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "disputeId", "type": "uint256" }],
    "name": "getDispute",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
          { "internalType": "address", "name": "payer", "type": "address" },
          { "internalType": "address", "name": "merchant", "type": "address" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "string", "name": "reason", "type": "string" },
          { "internalType": "uint8", "name": "status", "type": "uint8" },
          { "internalType": "uint8", "name": "outcome", "type": "uint8" },
          { "internalType": "uint256", "name": "merchantAmount", "type": "uint256" },
          { "internalType": "uint256", "name": "payerAmount", "type": "uint256" },
          { "internalType": "uint64", "name": "openedAt", "type": "uint64" },
          { "internalType": "uint64", "name": "resolvedAt", "type": "uint64" },
          { "internalType": "address", "name": "resolvedBy", "type": "address" }
        ],
        "internalType": "struct HushPayDisputes.Dispute",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "hasActiveDispute",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "invoicesContract",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextDisputeId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "openDispute",
    "outputs": [{ "internalType": "uint256", "name": "disputeId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "disputeId", "type": "uint256" }],
    "name": "resolveRefund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "disputeId", "type": "uint256" }],
    "name": "resolveRelease",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "disputeId", "type": "uint256" },
      { "internalType": "uint256", "name": "merchantAmount", "type": "uint256" }
    ],
    "name": "resolveSplit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "newWindow", "type": "uint256" }],
    "name": "setDisputeWindow",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdcToken",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// HushPayMilestones Contract ABI
export const HUSHPAY_MILESTONES_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_usdcToken", "type": "address" },
      { "internalType": "address", "name": "_feeManager", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  { "inputs": [], "name": "ArrayLengthMismatch", "type": "error" },
  { "inputs": [], "name": "InsufficientFunds", "type": "error" },
  { "inputs": [], "name": "InvalidAmount", "type": "error" },
  { "inputs": [], "name": "InvalidMilestoneCount", "type": "error" },
  { "inputs": [], "name": "InvoiceNotFound", "type": "error" },
  { "inputs": [], "name": "MilestoneAlreadyPaid", "type": "error" },
  { "inputs": [], "name": "MilestoneNotPaid", "type": "error" },
  { "inputs": [], "name": "MustPayInOrder", "type": "error" },
  { "inputs": [], "name": "NoMilestonesToRelease", "type": "error" },
  { "inputs": [], "name": "NotMerchant", "type": "error" },
  { "inputs": [], "name": "TransferFailed", "type": "error" },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256" }
    ],
    "name": "InvoiceCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256" }
    ],
    "name": "InvoiceCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "merchant", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "totalAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "milestoneCount", "type": "uint256" }
    ],
    "name": "InvoiceCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "description", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "MilestoneAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "payer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "MilestonePaid",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "payer", "type": "address" }
    ],
    "name": "MilestoneRefunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "feeAmount", "type": "uint256" }
    ],
    "name": "MilestoneReleased",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "cancelInvoice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "memoHash", "type": "bytes32" },
      { "internalType": "string", "name": "metadataCID", "type": "string" },
      { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" },
      { "internalType": "string[]", "name": "descriptions", "type": "string[]" }
    ],
    "name": "createInvoice",
    "outputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeManager",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "getInvoice",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address", "name": "merchant", "type": "address" },
          { "internalType": "uint256", "name": "totalAmount", "type": "uint256" },
          { "internalType": "uint256", "name": "paidAmount", "type": "uint256" },
          { "internalType": "uint256", "name": "releasedAmount", "type": "uint256" },
          { "internalType": "uint8", "name": "status", "type": "uint8" },
          { "internalType": "uint64", "name": "createdAt", "type": "uint64" },
          { "internalType": "bytes32", "name": "memoHash", "type": "bytes32" },
          { "internalType": "string", "name": "metadataCID", "type": "string" },
          { "internalType": "uint256", "name": "milestoneCount", "type": "uint256" }
        ],
        "internalType": "struct HushPayMilestones.MilestoneInvoice",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "getInvoiceProgress",
    "outputs": [
      { "internalType": "uint256", "name": "totalMilestones", "type": "uint256" },
      { "internalType": "uint256", "name": "paidMilestones", "type": "uint256" },
      { "internalType": "uint256", "name": "releasedMilestones", "type": "uint256" },
      { "internalType": "uint256", "name": "totalAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "paidAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "releasedAmount", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" }
    ],
    "name": "getMilestone",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "uint8", "name": "status", "type": "uint8" },
          { "internalType": "uint64", "name": "paidAt", "type": "uint64" },
          { "internalType": "uint64", "name": "releasedAt", "type": "uint64" },
          { "internalType": "address", "name": "payer", "type": "address" }
        ],
        "internalType": "struct HushPayMilestones.Milestone",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "getMilestones",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "uint8", "name": "status", "type": "uint8" },
          { "internalType": "uint64", "name": "paidAt", "type": "uint64" },
          { "internalType": "uint64", "name": "releasedAt", "type": "uint64" },
          { "internalType": "address", "name": "payer", "type": "address" }
        ],
        "internalType": "struct HushPayMilestones.Milestone[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextInvoiceId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "internalType": "uint256", "name": "upToIndex", "type": "uint256" }
    ],
    "name": "payMilestones",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" }
    ],
    "name": "refundMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "releaseAllPaidMilestones",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" }
    ],
    "name": "releaseMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdcToken",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// HushPayMerchantRegistry Contract ABI
export const HUSHPAY_MERCHANT_REGISTRY_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "_admin", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  { "inputs": [], "name": "AlreadyRegistered", "type": "error" },
  { "inputs": [], "name": "InvalidPayoutAddress", "type": "error" },
  { "inputs": [], "name": "MerchantNotActive", "type": "error" },
  { "inputs": [], "name": "NotMerchantOwner", "type": "error" },
  { "inputs": [], "name": "NotRegistered", "type": "error" },
  { "inputs": [], "name": "OperatorAlreadyAssigned", "type": "error" },
  { "inputs": [], "name": "OperatorNotAssigned", "type": "error" },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "merchant", "type": "address" }
    ],
    "name": "MerchantDeactivated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "merchant", "type": "address" }
    ],
    "name": "MerchantReactivated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "merchant", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "payoutAddress", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "businessName", "type": "string" }
    ],
    "name": "MerchantRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "merchant", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "operator", "type": "address" }
    ],
    "name": "OperatorAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "merchant", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "operator", "type": "address" }
    ],
    "name": "OperatorRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "merchant", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "newPayoutAddress", "type": "address" }
    ],
    "name": "PayoutAddressUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "merchant", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "businessName", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "metadataURI", "type": "string" }
    ],
    "name": "ProfileUpdated",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "address", "name": "operator", "type": "address" }],
    "name": "addOperator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "actor", "type": "address" },
      { "internalType": "address", "name": "merchant", "type": "address" }
    ],
    "name": "canActForMerchant",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "merchant", "type": "address" }],
    "name": "deactivateMerchant",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "merchantAddress", "type": "address" }],
    "name": "getMerchant",
    "outputs": [
      {
        "components": [
          { "internalType": "address", "name": "merchantAddress", "type": "address" },
          { "internalType": "address", "name": "payoutAddress", "type": "address" },
          { "internalType": "string", "name": "businessName", "type": "string" },
          { "internalType": "string", "name": "metadataURI", "type": "string" },
          { "internalType": "bool", "name": "isActive", "type": "bool" },
          { "internalType": "uint64", "name": "registeredAt", "type": "uint64" }
        ],
        "internalType": "struct HushPayMerchantRegistry.Merchant",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMerchantCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "merchant", "type": "address" }],
    "name": "getOperators",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "merchantAddress", "type": "address" }],
    "name": "getPayoutAddress",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "merchantAddress", "type": "address" }],
    "name": "isMerchant",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "merchant", "type": "address" }],
    "name": "reactivateMerchant",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "payoutAddress", "type": "address" },
      { "internalType": "string", "name": "businessName", "type": "string" },
      { "internalType": "string", "name": "metadataURI", "type": "string" }
    ],
    "name": "registerMerchant",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "operator", "type": "address" }],
    "name": "removeOperator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "newPayoutAddress", "type": "address" }],
    "name": "updatePayoutAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "businessName", "type": "string" },
      { "internalType": "string", "name": "metadataURI", "type": "string" }
    ],
    "name": "updateProfile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

// HushPayFeeManager Contract ABI
export const HUSHPAY_FEE_MANAGER_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_feeRecipient", "type": "address" },
      { "internalType": "uint16", "name": "_feeBps", "type": "uint16" },
      { "internalType": "address", "name": "_admin", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  { "inputs": [], "name": "ChangeAlreadyPending", "type": "error" },
  { "inputs": [], "name": "FeeTooHigh", "type": "error" },
  { "inputs": [], "name": "InvalidFeeRecipient", "type": "error" },
  { "inputs": [], "name": "NoChangePending", "type": "error" },
  { "inputs": [], "name": "TimelockNotExpired", "type": "error" },
  {
    "anonymous": false,
    "inputs": [],
    "name": "FeeChangeCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint16", "name": "oldFeeBps", "type": "uint16" },
      { "indexed": false, "internalType": "uint16", "name": "newFeeBps", "type": "uint16" }
    ],
    "name": "FeeChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint16", "name": "proposedFeeBps", "type": "uint16" },
      { "indexed": false, "internalType": "uint256", "name": "effectiveAt", "type": "uint256" }
    ],
    "name": "FeeChangeProposed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "oldRecipient", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "newRecipient", "type": "address" }
    ],
    "name": "RecipientChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "proposedRecipient", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "effectiveAt", "type": "uint256" }
    ],
    "name": "RecipientChangeProposed",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "TIMELOCK_DURATION",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "calculateFee",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cancelFeeChange",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint16", "name": "newFeeBps", "type": "uint16" }],
    "name": "emergencyUpdateFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "newRecipient", "type": "address" }],
    "name": "emergencyUpdateRecipient",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "executeFeeChange",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "executeRecipientChange",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeBps",
    "outputs": [{ "internalType": "uint16", "name": "", "type": "uint16" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeRecipient",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getFeeSettings",
    "outputs": [
      { "internalType": "address", "name": "recipient", "type": "address" },
      { "internalType": "uint16", "name": "bps", "type": "uint16" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint16", "name": "newFeeBps", "type": "uint16" }],
    "name": "proposeFeeChange",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "newRecipient", "type": "address" }],
    "name": "proposeRecipientChange",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
