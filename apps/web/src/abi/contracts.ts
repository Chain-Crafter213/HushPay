export const HUSHPAY_INVOICES_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_usdcToken", "type": "address" },
      { "internalType": "address", "name": "_feeRecipient", "type": "address" },
      { "internalType": "uint16", "name": "_feeBps", "type": "uint16" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  { "inputs": [], "name": "FeeTooHigh", "type": "error" },
  { "inputs": [], "name": "InvalidAmount", "type": "error" },
  { "inputs": [], "name": "InvalidFeeRecipient", "type": "error" },
  { "inputs": [], "name": "InvalidStatus", "type": "error" },
  { "inputs": [], "name": "InvalidUsdcToken", "type": "error" },
  { "inputs": [], "name": "InvoiceNotFound", "type": "error" },
  { "inputs": [], "name": "OnlyMerchant", "type": "error" },
  { "inputs": [], "name": "ReentrancyGuardReentrantCall", "type": "error" },
  { "inputs": [], "name": "TransferFailed", "type": "error" },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "merchant", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "feeAmount", "type": "uint256" }
    ],
    "name": "InvoiceReleased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "payer", "type": "address" }
    ],
    "name": "InvoiceRefunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "payer", "type": "address" }
    ],
    "name": "InvoicePaid",
    "type": "event"
  },
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
      { "indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "merchant", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "uint64", "name": "dueAt", "type": "uint64" },
      { "indexed": false, "internalType": "bytes32", "name": "memoHash", "type": "bytes32" },
      { "indexed": false, "internalType": "string", "name": "metadataCID", "type": "string" }
    ],
    "name": "InvoiceCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "oldRecipient", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "newRecipient", "type": "address" }
    ],
    "name": "FeeRecipientUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint16", "name": "oldFeeBps", "type": "uint16" },
      { "indexed": false, "internalType": "uint16", "name": "newFeeBps", "type": "uint16" }
    ],
    "name": "FeeBpsUpdated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_FEE_BPS",
    "outputs": [{ "internalType": "uint16", "name": "", "type": "uint16" }],
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
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "cancelInvoice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "usdcAmount", "type": "uint256" },
      { "internalType": "uint64", "name": "dueAt", "type": "uint64" },
      { "internalType": "bytes32", "name": "memoHash", "type": "bytes32" },
      { "internalType": "string", "name": "metadataCID", "type": "string" }
    ],
    "name": "createInvoice",
    "outputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
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
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "getInvoice",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address", "name": "merchant", "type": "address" },
          { "internalType": "uint256", "name": "usdcAmount", "type": "uint256" },
          { "internalType": "enum HushPayInvoices.InvoiceStatus", "name": "status", "type": "uint8" },
          { "internalType": "uint64", "name": "createdAt", "type": "uint64" },
          { "internalType": "uint64", "name": "dueAt", "type": "uint64" },
          { "internalType": "address", "name": "payer", "type": "address" },
          { "internalType": "uint64", "name": "paidAt", "type": "uint64" },
          { "internalType": "uint64", "name": "releasedAt", "type": "uint64" },
          { "internalType": "uint64", "name": "refundedAt", "type": "uint64" },
          { "internalType": "bytes32", "name": "memoHash", "type": "bytes32" },
          { "internalType": "string", "name": "metadataCID", "type": "string" }
        ],
        "internalType": "struct HushPayInvoices.Invoice",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256[]", "name": "invoiceIds", "type": "uint256[]" }],
    "name": "getInvoices",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address", "name": "merchant", "type": "address" },
          { "internalType": "uint256", "name": "usdcAmount", "type": "uint256" },
          { "internalType": "enum HushPayInvoices.InvoiceStatus", "name": "status", "type": "uint8" },
          { "internalType": "uint64", "name": "createdAt", "type": "uint64" },
          { "internalType": "uint64", "name": "dueAt", "type": "uint64" },
          { "internalType": "address", "name": "payer", "type": "address" },
          { "internalType": "uint64", "name": "paidAt", "type": "uint64" },
          { "internalType": "uint64", "name": "releasedAt", "type": "uint64" },
          { "internalType": "uint64", "name": "refundedAt", "type": "uint64" },
          { "internalType": "bytes32", "name": "memoHash", "type": "bytes32" },
          { "internalType": "string", "name": "metadataCID", "type": "string" }
        ],
        "internalType": "struct HushPayInvoices.Invoice[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "invoices",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "address", "name": "merchant", "type": "address" },
      { "internalType": "uint256", "name": "usdcAmount", "type": "uint256" },
      { "internalType": "enum HushPayInvoices.InvoiceStatus", "name": "status", "type": "uint8" },
      { "internalType": "uint64", "name": "createdAt", "type": "uint64" },
      { "internalType": "uint64", "name": "dueAt", "type": "uint64" },
      { "internalType": "address", "name": "payer", "type": "address" },
      { "internalType": "uint64", "name": "paidAt", "type": "uint64" },
      { "internalType": "uint64", "name": "releasedAt", "type": "uint64" },
      { "internalType": "uint64", "name": "refundedAt", "type": "uint64" },
      { "internalType": "bytes32", "name": "memoHash", "type": "bytes32" },
      { "internalType": "string", "name": "metadataCID", "type": "string" }
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
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "payInvoice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "refund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "invoiceId", "type": "uint256" }],
    "name": "release",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint16", "name": "newFeeBps", "type": "uint16" }],
    "name": "setFeeBps",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "newFeeRecipient", "type": "address" }],
    "name": "setFeeRecipient",
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

export const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const
