# HushPay - Project Summary

## Overview

**HushPay** is a walletless payment links + invoicing dApp for freelancers and SMEs, built on Polygon PoS mainnet with USDC settlement.

**Live Contract:** [`0xa961a614CDB8721ccb168cd453d675cAFd4Ee5cC`](https://polygonscan.com/address/0xa961a614CDB8721ccb168cd453d675cAFd4Ee5cC)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Polygon PoS Mainnet (Chain ID: 137) |
| **Smart Contract** | Solidity 0.8.24, OpenZeppelin v5, Hardhat |
| **Frontend** | Vite + React 18 + TypeScript |
| **Auth** | Dynamic.xyz (walletless + wallet connect) |
| **Web3** | wagmi v2 + viem |
| **Styling** | TailwindCSS + Radix UI + Framer Motion |
| **Token** | Native USDC on Polygon (`0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`) |

---

## Project Structure

```
HushPay/
├── packages/
│   └── contracts/           # Smart contracts
│       ├── contracts/
│       │   └── HushPayInvoices.sol
│       ├── test/
│       │   └── HushPayInvoices.test.ts
│       ├── scripts/
│       │   └── deploy.ts
│       └── hardhat.config.ts
├── apps/
│   └── web/                 # Frontend application
│       ├── src/
│       │   ├── pages/       # Landing, Dashboard, NewInvoice, InvoiceDetail, Payment, Receipt
│       │   ├── components/  # UI components
│       │   ├── hooks/       # useContract, useAuth
│       │   ├── providers/   # Web3Provider (Dynamic.xyz + wagmi)
│       │   ├── abi/         # Contract ABIs
│       │   └── config/      # App & wagmi config
│       └── index.html
├── .env                     # Environment variables
└── package.json             # Monorepo root
```

---

## Smart Contract: HushPayInvoices.sol

### Features
- **Create Invoice** - Merchant creates invoice with amount, memo, due date, metadata CID
- **Pay Invoice** - Payer sends USDC (held in escrow)
- **Release Funds** - Merchant releases funds after service delivery
- **Refund** - Merchant can refund payer if needed
- **Cancel Invoice** - Merchant can cancel unpaid invoices
- **Protocol Fees** - Configurable fee (0.5% default, max 1%)

### Invoice States
```
Unpaid → Paid (in escrow) → Released (to merchant)
                         → Refunded (to payer)
Unpaid → Cancelled
```

### Key Functions
| Function | Description |
|----------|-------------|
| `createInvoice(amount, memoHash, dueAt, metadataCID)` | Create new invoice |
| `payInvoice(invoiceId)` | Pay invoice (requires USDC approval) |
| `release(invoiceId)` | Release escrowed funds to merchant |
| `refund(invoiceId)` | Refund escrowed funds to payer |
| `cancelInvoice(invoiceId)` | Cancel unpaid invoice |
| `getInvoice(invoiceId)` | Read single invoice |
| `getInvoices(invoiceIds)` | Batch read invoices |

### Events
- `InvoiceCreated(invoiceId, merchant, amount, dueAt, memoHash, metadataCID)`
- `InvoicePaid(invoiceId, payer)`
- `InvoiceReleased(invoiceId, merchant, feeAmount)`
- `InvoiceRefunded(invoiceId, payer)`
- `InvoiceCancelled(invoiceId)`

---

## Test Results

**All 27 tests passed ✅**

```
HushPayInvoices
  Deployment
    ✓ Should set the correct USDC token address
    ✓ Should set the correct fee recipient
    ✓ Should set the correct fee basis points
    ✓ Should start with invoice counter at 1
  
  Create Invoice
    ✓ Should create an invoice with correct details
    ✓ Should emit InvoiceCreated event
    ✓ Should increment invoice counter
    ✓ Should allow zero amount invoices
    ✓ Should allow zero due date
  
  Pay Invoice
    ✓ Should allow paying an unpaid invoice
    ✓ Should emit InvoicePaid event
    ✓ Should revert if invoice does not exist
    ✓ Should revert if invoice is not unpaid
    ✓ Should revert if USDC transfer fails
  
  Release
    ✓ Should allow merchant to release funds
    ✓ Should emit InvoiceReleased event
    ✓ Should calculate fee correctly
    ✓ Should revert if not merchant
    ✓ Should revert if invoice not paid
  
  Refund
    ✓ Should allow merchant to refund
    ✓ Should emit InvoiceRefunded event
    ✓ Should revert if not merchant
    ✓ Should revert if invoice not paid
  
  Cancel Invoice
    ✓ Should allow merchant to cancel unpaid invoice
    ✓ Should emit InvoiceCancelled event
    ✓ Should revert if not merchant
    ✓ Should revert if invoice is paid
```

---

## Deployment

### Polygon Mainnet Deployment
```
Network: Polygon PoS Mainnet (Chain ID: 137)
Contract: 0xa961a614CDB8721ccb168cd453d675cAFd4Ee5cC
USDC Token: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
Fee: 0.5% (50 basis points)
Deployer: 0x43b09e9c7fde82e048655e17c7989dfbe838a16e
```

### Deployment Transaction
- Block: ~68,000,000+
- Gas Used: ~1.5M gas
- Status: Success ✅

---

## Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| **Landing** | `/` | Hero, features, CTA |
| **Dashboard** | `/app` | Invoice list, stats, create button |
| **New Invoice** | `/app/new` | Create invoice form |
| **Invoice Detail** | `/app/invoice/:id` | View invoice, QR code, actions |
| **Payment** | `/pay/:id` | Public payment page for payers |
| **Receipt** | `/receipt/:id` | Payment confirmation |

---

## Configuration

### Environment Variables (.env)
```env
# Contracts
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/[KEY]
DEPLOYER_PRIVATE_KEY=[PRIVATE_KEY]

# Frontend
VITE_DYNAMIC_ENVIRONMENT_ID=00149423-5def-430a-9d3c-d38afb5977b5
VITE_CHAIN_ID=137
VITE_USDC_ADDRESS=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
VITE_INVOICE_CONTRACT_ADDRESS=0xa961a614CDB8721ccb168cd453d675cAFd4Ee5cC
VITE_APP_URL=http://localhost:5173
```

---

## Issues Resolved

| Issue | Solution |
|-------|----------|
| `toUtf8Bytes` not exported from viem | Changed to `stringToHex` from viem |
| Block range too large for RPC | Reduced from 100k to 3k blocks, then switched to contract reads |
| Alchemy free tier 10 block limit | Switched approach to use `nextInvoiceId()` contract call |
| Ankr requires API key | Switched to public RPC endpoints |
| `invoiceCount` not in ABI | Fixed to use `nextInvoiceId` function |

---

## Working Features ✅

- [x] Wallet connection via Dynamic.xyz
- [x] Create invoice on-chain
- [x] View invoice list (dashboard)
- [x] View invoice details
- [x] Share payment link with QR code
- [x] Payment page (payer view)
- [x] USDC balance check
- [x] Cancel invoice
- [x] Polygon mainnet integration

---

## V2 Contracts (New)

### HushPayFeeManager.sol
Centralized fee management with timelock protection for fee changes.

**Features:**
- Configurable fee (0.5% default, max 1%)
- 2-day timelock for fee/recipient changes
- Emergency admin override
- Role-based access (ADMIN_ROLE, FEE_SETTER_ROLE)

### HushPayMerchantRegistry.sol
Merchant profiles with payout addresses and team operators.

**Features:**
- Merchant registration with business name
- Custom payout address (separate from wallet)
- Operator management (team members can release/refund)
- Admin can deactivate/reactivate merchants

### HushPayDisputes.sol
Dispute resolution system for paid invoices.

**Features:**
- 7-day dispute window after payment
- Arbiter role for dispute resolution
- Three outcomes: Release to Merchant, Refund to Payer, Split
- Funds held in escrow during dispute

### HushPayMilestones.sol
Milestone-based invoicing for project work.

**Features:**
- Create invoice with multiple milestones
- Pay milestones sequentially
- Release/refund individual milestones
- Progress tracking (paid/released amounts)

### HushPayInvoicesV2.sol
Enhanced invoice contract integrating all v2 features.

**Features:**
- Integrates with FeeManager for fees
- Integrates with MerchantRegistry for payouts
- EIP-712 signatures for "Pay in one click"
- Operator support from registry

---

## V2 Test Results

**All 114 tests passed ✅**

```
HushPayDisputes (17 tests)
HushPayFeeManager (17 tests)
HushPayInvoices V1 (27 tests)
HushPayInvoicesV2 (18 tests)
HushPayMerchantRegistry (17 tests)
HushPayMilestones (18 tests)
```

---

## Commands

```bash
# Install dependencies
npm install

# Run tests
cd packages/contracts && npx hardhat test

# Deploy V1 contract
cd packages/contracts && npx hardhat run scripts/deploy.ts --network polygon

# Deploy V2 contracts
cd packages/contracts && npx hardhat run scripts/deploy-v2.ts --network polygon

# Start frontend
cd apps/web && npm run dev

# Build frontend
cd apps/web && npm run build
```

---

## Live Demo

**First Invoice Created:**
- Invoice ID: #1
- Amount: $1.00 USDC
- Status: Unpaid
- Merchant: 0xd462cc...4a2cc0
- Due Date: 2/1/2026

---

## V2 Frontend Pages

- **/app/settings** - Merchant Settings (register, payout address, operators)
- **Dispute Components** - Open dispute dialog, status badges, countdown timer
- **Milestone Components** - Progress bar, milestone cards, create milestone invoice form

---

*Generated: January 31, 2026*
*Updated with V2 contracts*
