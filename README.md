# 🔐 HushPay

<div align="center">

![HushPay Logo](https://img.shields.io/badge/HushPay-Privacy%20First%20Payments-8B5CF6?style=for-the-badge&logo=ethereum&logoColor=white)

**Privacy-focused USDC payment links & invoicing for freelancers and SMEs**

[![Polygon](https://img.shields.io/badge/Polygon-Mainnet-8247E5?style=flat-square&logo=polygon&logoColor=white)](https://polygonscan.com/address/0xa961a614CDB8721ccb168cd453d675cAFd4Ee5cC)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity&logoColor=white)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Demo](#demo) • [Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation)

</div>

---

## 🎯 What is HushPay?

HushPay is a **Web3 payment solution** that enables merchants to create shareable payment links and invoices settled in **USDC** on Polygon. With built-in escrow protection, dispute resolution, and milestone-based payments, it provides a trustless way to receive payments globally.

### Why HushPay?

| Problem | HushPay Solution |
|---------|------------------|
| High payment processor fees (3-5%) | **0.5% flat fee** on Polygon |
| Cross-border payment delays | **Instant settlement** worldwide |
| Chargebacks & fraud | **Escrow protection** + dispute arbitration |
| Volatile crypto payments | **USDC stablecoin** - always $1 |
| Complex wallet setup for payers | **Walletless payments** via Dynamic.xyz |

---

## ✨ Features

### 💰 **Invoice Management**
- Create invoices with amount, memo, and due dates
- Shareable payment links with QR codes
- Real-time status tracking (Unpaid → Paid → Released)

### 🔒 **Escrow Protection**
- Funds held securely in smart contract
- Merchant releases after service delivery
- Payer can request refund if issues arise

### ⚖️ **Dispute Resolution**
- 7-day dispute window after payment
- Neutral arbiter for conflict resolution
- Fair outcomes: release, refund, or split

### 📊 **Milestone Payments**
- Split projects into milestones
- Progressive funding and release
- Perfect for freelancers and contractors

### 👤 **Merchant Registry**
- Business profiles with verification
- Custom payout addresses
- Team operators for enterprise

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │Dashboard│ │New Invoice│ │ Payment │ │ Disputes/Miles │  │
│  └────┬────┘ └─────┬────┘ └────┬─────┘ └────────┬────────┘  │
└───────┼────────────┼───────────┼────────────────┼───────────┘
        │            │           │                │
        ▼            ▼           ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    wagmi + viem (Web3)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Polygon PoS Mainnet                        │
│  ┌────────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │ HushPayInvoices│  │ HushPayDisputes│  │HushPayMilestones│ │
│  │ (V1 + V2)      │  │               │  │                │  │
│  └────────────────┘  └───────────────┘  └────────────────┘  │
│  ┌────────────────┐  ┌───────────────┐                      │
│  │ MerchantRegistry│ │  FeeManager   │                      │
│  └────────────────┘  └───────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📜 Smart Contracts

All contracts are deployed on **Polygon PoS Mainnet**:

| Contract | Address | Purpose |
|----------|---------|---------|
| **HushPayInvoices** | [`0xa961...5cC`](https://polygonscan.com/address/0xa961a614CDB8721ccb168cd453d675cAFd4Ee5cC) | Core invoicing (V1) |
| **HushPayFeeManager** | [`0x0a1B...48E`](https://polygonscan.com/address/0x0a1B6ab1Ee210425EDDe4628d5250411aBF4748E) | Fee management |
| **HushPayMerchantRegistry** | [`0x26b1...B14`](https://polygonscan.com/address/0x26b1ea9Bb8Aa33086Fa5b4D32EA89b2Da6DD4B14) | Merchant profiles |
| **HushPayInvoicesV2** | [`0x87B7...630`](https://polygonscan.com/address/0x87B7b40e7f2914B3d5b689AAF4418e1AD7084630) | Enhanced invoicing |
| **HushPayDisputes** | [`0x90EC...68a`](https://polygonscan.com/address/0x90EC2789Eec7381Bc11EAC5AF7B0804e75D1F68a) | Dispute resolution |
| **HushPayMilestones** | [`0xd36D...642`](https://polygonscan.com/address/0xd36De25daeE4Dc1D54c530FE25aD03a195FDf642) | Milestone payments |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or any Web3 wallet

### Installation

```bash
# Clone the repository
git clone https://github.com/Chain-Crafter213/HushPay.git
cd HushPay

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Start development server
cd apps/web && npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Frontend (Required)
VITE_DYNAMIC_ENVIRONMENT_ID=your-dynamic-environment-id
VITE_CHAIN_ID=137
VITE_USDC_ADDRESS=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
VITE_CONTRACT_ADDRESS=0xa961a614CDB8721ccb168cd453d675cAFd4Ee5cC
VITE_APP_URL=http://localhost:5173

# V2 Contracts
VITE_INVOICES_V2_ADDRESS=0x87B7b40e7f2914B3d5b689AAF4418e1AD7084630
VITE_DISPUTES_ADDRESS=0x90EC2789Eec7381Bc11EAC5AF7B0804e75D1F68a
VITE_MILESTONES_ADDRESS=0xd36De25daeE4Dc1D54c530FE25aD03a195FDf642
VITE_MERCHANT_REGISTRY_ADDRESS=0x26b1ea9Bb8Aa33086Fa5b4D32EA89b2Da6DD4B14
VITE_FEE_MANAGER_ADDRESS=0x0a1B6ab1Ee210425EDDe4628d5250411aBF4748E

# Contracts Deployment (Only for deploying)
POLYGON_RPC_URL=your-rpc-url
DEPLOYER_PRIVATE_KEY=your-private-key
```

---

## 📱 Pages & Features

| Page | Route | Description |
|------|-------|-------------|
| 🏠 **Landing** | `/` | Marketing homepage |
| 📊 **Dashboard** | `/app` | Invoice overview & stats |
| ➕ **New Invoice** | `/app/new` | Create payment request |
| 📄 **Invoice Detail** | `/app/invoice/:id` | View, share, manage invoice |
| 💳 **Payment** | `/pay/:id` | Public payment page |
| 🧾 **Receipt** | `/receipt/:id` | Payment confirmation |
| ⚖️ **Disputes** | `/app/disputes` | Manage disputes |
| 📈 **Milestones** | `/app/milestones` | Track project payments |
| ⚙️ **Settings** | `/app/settings` | Merchant profile |

---

## 🧪 Testing

```bash
# Run smart contract tests
cd packages/contracts
npx hardhat test

# Results: 114 tests passing ✅
```

<details>
<summary>View Test Coverage</summary>

```
HushPayInvoices (27 tests)
HushPayInvoicesV2 (18 tests)
HushPayDisputes (17 tests)
HushPayMilestones (18 tests)
HushPayMerchantRegistry (17 tests)
HushPayFeeManager (17 tests)
```

</details>

---

## 🌐 Deployment

### Vercel (Frontend)

1. Connect your GitHub repo to Vercel
2. Set build command: `cd apps/web && npm run build`
3. Set output directory: `apps/web/dist`
4. Add environment variables in Vercel dashboard

### Smart Contracts

```bash
# Deploy V1
cd packages/contracts
npx hardhat run scripts/deploy.ts --network polygon

# Deploy V2
npx hardhat run scripts/deploy-v2.ts --network polygon
```

---

## 🔐 Security

- **ReentrancyGuard** - Prevents reentrancy attacks
- **AccessControl** - Role-based permissions
- **Pausable** - Emergency stop mechanism
- **Escrow Pattern** - Funds held by contract
- **OpenZeppelin v5** - Battle-tested libraries

---

## 🛣️ Roadmap

- [x] V1 Core Contract
- [x] V2 Dispute System
- [x] V2 Milestone Payments
- [x] Merchant Registry
- [x] Fee Management
- [ ] IPFS Metadata Storage
- [ ] Email Notifications
- [ ] Multi-currency Support
- [ ] Mobile App

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

```bash
# Fork the repo
# Create your feature branch
git checkout -b feature/amazing-feature

# Commit your changes
git commit -m 'Add amazing feature'

# Push to the branch
git push origin feature/amazing-feature

# Open a Pull Request
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) - Smart contract libraries
- [Dynamic.xyz](https://dynamic.xyz/) - Wallet authentication
- [Polygon](https://polygon.technology/) - L2 blockchain
- [wagmi](https://wagmi.sh/) - React hooks for Web3

---

<div align="center">

**Built with ❤️ for the Web3 community**

[⬆ Back to Top](#-hushpay)

</div>
