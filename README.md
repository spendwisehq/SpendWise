<p align="center">
  <img src="https://img.shields.io/badge/SpendWise-AI%20Finance-1D9E75?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4eiIvPjwvc3ZnPg==&logoColor=white" alt="SpendWise" />
</p>

<h1 align="center">💸 SpendWise</h1>

<p align="center">
  <strong>AI-Powered Personal Finance Assistant with Blockchain Audit Trail</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Solidity-0.8.19-363636?style=flat-square&logo=solidity&logoColor=white" />
  <img src="https://img.shields.io/badge/Polygon-Blockchain-8247E5?style=flat-square&logo=polygon&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq-LLaMA%203.3-FF6B35?style=flat-square" />
  <img src="https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=flat-square&logo=pwa&logoColor=white" />
  <img src="https://img.shields.io/badge/React_Native-Expo_54-000020?style=flat-square&logo=expo&logoColor=white" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-smart-contracts">Smart Contracts</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-testing">Testing</a>
</p>

---

## 📖 Overview

**SpendWise** is a full-stack AI-powered personal finance management platform built for modern Indian users. It combines intelligent expense tracking, AI-driven financial insights, payment gateway integration (Razorpay), and blockchain-backed transaction auditing — available as a Progressive Web App and a native mobile app (React Native + Expo).

SpendWise doesn't just track your money — it understands your spending behavior, predicts future budgets, detects anomalies, and provides a tamper-proof audit trail for every transaction. The same backend powers both the web PWA and the mobile app, sharing a single MongoDB database.

---

## ✨ Features

### 💰 Core Finance
- **Transaction Management** — Full CRUD with soft-delete, tagging, notes, and multi-currency support (INR, USD, EUR, GBP, AED)
- **Category System** — 20+ pre-seeded categories with custom category creation, icons, colors, and keyword-based auto-matching
- **Budget Tracking** — Monthly budgets with per-category allocation, threshold alerts (50%, 80%, 100%), and AI-generated budget predictions
- **Savings Goals** — Create goals with deadlines, track contributions, monitor progress with visual indicators and AI-powered suggestions

### 🤖 AI Engine (Groq LLaMA 3.3 70B)
- **Smart Categorization** — AI auto-categorizes transactions by merchant/description with confidence scoring
- **Batch Categorization** — Bulk-categorize up to 20 uncategorized transactions at once
- **Spending Analysis** — Monthly spending breakdowns with health ratings and key findings
- **Financial Insights** — Personalized tips, warnings, and achievements based on 3-month spending history
- **Recommendations** — Actionable financial advice with estimated savings and step-by-step action plans
- **Financial Health Score** — 0–100 score with grade (A+ to F), breakdown across savings/spending/consistency/essentials
- **AI Chat Assistant** — Conversational finance advisor that references your actual spending data
- **Budget Prediction** — ML-style forecasting of next month's budget with per-category trend analysis
- **Anomaly Detection** — Statistical outlier detection (2σ) with AI-generated explanations
- **Subscription Detection** — Auto-discovers recurring payments from transaction patterns, calculates annual costs
- **Spending Forecast** — Multi-month expense projection with trend analysis and risk assessment
- **Score History** — Track financial score evolution over 6 months with AI commentary

### 📱 Automation
- **SMS Parsing** — Extract transaction data from Indian bank/UPI SMS messages with regex-based parser supporting HDFC, SBI, ICICI, Axis, Paytm, PhonePe, GPay, and more
- **SMS Webhook** — Real-time auto-import via MSG91 webhook integration for hands-free tracking
- **Receipt OCR** — Upload receipt photos → Cloudinary → Tesseract.js OCR → auto-fill transaction
- **CSV Import** — Bulk import transactions from CSV files

### 💳 Payments (Razorpay)
- **Payment Orders** — Create and process payments with budget-awareness checks before payment
- **Signature Verification** — Cryptographic verification of Razorpay payment signatures
- **Webhook Processing** — Auto-update transaction status on payment captured/failed/refunded events
- **Budget Alerts** — Pre-payment warnings when approaching or exceeding budget limits

### 👥 Groups & Splits
- **Group Management** — Create groups (trip, flat, office, family, event) with roles (admin/member)
- **Expense Splitting** — Split expenses equally or custom among group members
- **Settlement Tracking** — Track who owes whom with auto-calculated balances
- **Blockchain Settlement** — On-chain settlement via Polygon smart contracts

### 🔗 Blockchain (Polygon)
- **Transaction Auditing** — Hash every transaction into a tamper-proof local blockchain (SHA-256 chain)
- **Chain Verification** — Verify integrity of individual transactions or the entire chain
- **On-Chain Anchoring** — Optionally anchor audit hashes to Polygon (Mumbai/Mainnet) for immutable proof
- **Proof of Spending** — Generate shareable, verifiable spending certificates
- **Financial Score NFTs** — Mint financial health scores as on-chain certificates (ERC-721)
- **Group Settlement Contracts** — Smart contract-based group expense settlement

### 🌐 Developer Platform (API-as-a-Service)
- **API Key Management** — Generate, list, and revoke API keys with granular permissions
- **Tiered Access** — Free (100/day), Starter (₹499/mo), Growth (₹1,499/mo), Enterprise (custom)
- **Public Endpoints** — Categorize, Analyze, Predict, Score, and Categories via API key auth
- **Usage Tracking** — Per-key usage logs with rate limiting and daily/monthly quotas
- **Platform Dashboard** — Monitor API usage, manage keys, and view analytics

### 🔔 Notifications
- **Budget Alerts** — Automated alerts at 50%, 80%, and 100% budget consumption
- **Anomaly Alerts** — Notifications for statistically unusual transactions
- **Weekly Reports** — AI-generated weekly spending summaries
- **Configurable Preferences** — Per-user toggle for email, budget, weekly, and anomaly notifications

### 🎨 Frontend Experience
- **Progressive Web App** — Installable, works offline with Workbox caching strategies
- **Dark/Light Themes** — Flash-free theme switching with CSS custom properties
- **Splash Screen** — Animated branded splash on first visit
- **Fox Mascot** — Animated SVG mascot character for personality
- **Responsive Layout** — Sidebar navigation on desktop, bottom nav on mobile
- **Real-time Sync** — Offline-first with background sync when connectivity returns
- **Charts & Analytics** — Interactive Recharts-powered visualizations

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT (PWA)                            │
│  React 19 · Vite 7 · React Router 7 · TanStack Query · Recharts│
│  Offline Storage (IndexedDB) · Service Worker (Workbox)         │
└──────────────────────┬───────────────────────────────────────────┘
                       │  REST API (JSON)
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                       API GATEWAY                                │
│  Express 5 · Helmet · CORS · Morgan · Rate Limiting             │
│  HPP · XSS Sanitize · Request Size Validation · Compression     │
├──────────────────────────────────────────────────────────────────┤
│                     MIDDLEWARE PIPELINE                           │
│  JWT Auth · API Key Auth · Validators · Performance Tracking     │
├──────────────────────────────────────────────────────────────────┤
│                       BUSINESS LOGIC                             │
│  ┌─────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │
│  │  Auth   │ │  Txns  │ │    AI    │ │ Payments │ │ Groups  │  │
│  └─────────┘ └────────┘ └──────────┘ └──────────┘ └─────────┘  │
│  ┌──────────┐ ┌────────────┐ ┌───────────────┐ ┌────────────┐  │
│  │Automation│ │ Blockchain │ │  Notifications │ │  Platform  │  │
│  └──────────┘ └────────────┘ └───────────────┘ └────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                       EXTERNAL SERVICES                          │
│  Groq (LLaMA 3.3) · Razorpay · Cloudinary · Polygon RPC        │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│  MongoDB (Mongoose 9) · Polygon Blockchain (Ethers.js 6)        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Mobile (React Native)
| Technology | Purpose |
|---|---|
| **React Native 0.81 + Expo 54** | Cross-platform mobile framework |
| **Expo Router 6** | File-based navigation (tabs + auth stack) |
| **TanStack React Query 5** | Server state — transactions, categories, groups, goals, AI |
| **Axios** | HTTP client (Bearer token, auto-refresh, 401 queue) |
| **Expo SecureStore** | Encrypted JWT token storage |
| **AsyncStorage** | User profile persistence |
| **expo-linear-gradient** | Gradient backgrounds |
| **expo-blur** | Blur effects |
| **react-native-svg** | SVG icon rendering + donut charts |
| **react-native-toast-message** | Toast notifications (success, error, info) |
| **date-fns** | Date formatting |

#### Mobile API Modules (`mobile/src/api/`)
| Module | Endpoints |
|---|---|
| `auth.api.js` | register, login, verifyOTP, resendOTP, refresh, getMe, updateProfile |
| `transaction.api.js` | CRUD + summary + stats |
| `category.api.js` | getAll, create |
| `ai.api.js` | chat, analysis, insights, score, categorize |
| `group.api.js` | groups CRUD + members + expenses + balances + settle |
| `friend.api.js` | getAll, add, remove |
| `goal.api.js` | CRUD + contribute |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js ≥ 18** | Runtime |
| **Express 5** | HTTP framework |
| **MongoDB + Mongoose 9** | Database & ODM |
| **JWT (jsonwebtoken)** | Authentication (access + refresh tokens) |
| **bcrypt.js** | Password hashing (12 salt rounds) |
| **Groq SDK** | AI inference (LLaMA 3.3 70B Versatile) |
| **Razorpay** | Payment gateway |
| **Ethers.js 6** | Blockchain interaction |
| **Cloudinary** | Image/receipt storage |
| **Tesseract.js 7** | OCR for receipt scanning |
| **node-cron** | Scheduled tasks |
| **Helmet** | Security headers |
| **express-rate-limit** | Rate limiting |
| **express-mongo-sanitize** | NoSQL injection prevention |
| **hpp** | HTTP parameter pollution protection |
| **xss** | XSS sanitization |
| **compression** | Response compression |
| **csv-parser** | CSV file import |
| **pdf-parse** | PDF parsing |
| **Morgan** | HTTP request logging |
| **Jest + Supertest** | Testing framework |
| **mongodb-memory-server** | In-memory MongoDB for tests |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 7** | Build tool & dev server |
| **React Router 7** | Client-side routing |
| **TanStack React Query 5** | Server state management |
| **Axios** | HTTP client |
| **Recharts 3** | Data visualization |
| **Lucide React** | Icon library |
| **React Hot Toast** | Toast notifications |
| **React Dropzone** | File upload (receipts) |
| **date-fns** | Date formatting |
| **vite-plugin-pwa** | PWA support with Workbox |

### Blockchain
| Technology | Purpose |
|---|---|
| **Solidity 0.8.19** | Smart contract language |
| **Hardhat 3** | Development & deployment framework |
| **OpenZeppelin 5** | Audited contract primitives |
| **Ethers.js 6** | Contract interaction |
| **Polygon (Mumbai / Mainnet)** | Target blockchain network |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.0.0
- **MongoDB** (local or [Atlas](https://www.mongodb.com/atlas))
- **npm** ≥ 9

### 1. Clone the Repository

```bash
git clone https://github.com/spendwisehq/SpendWise.git
cd SpendWise
```

### 2. Install Dependencies

```bash
# Install all dependencies (backend + frontend)
npm run install:all

# Or install individually
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# ─── Server ───────────────────────────
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ─── Database ─────────────────────────
MONGODB_URI=mongodb://localhost:27017
MONGODB_NAME=spendwise

# ─── Authentication ───────────────────
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# ─── AI (Groq) ───────────────────────
GROQ_API_KEY=gsk_your_groq_api_key

# ─── Razorpay (Optional) ─────────────
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# ─── Cloudinary (Optional) ───────────
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx

# ─── Blockchain (Optional) ───────────
BLOCKCHAIN_ENABLED=false
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
CHAIN_ID=80001
BACKEND_SIGNER_PRIVATE_KEY=0x_your_key
SPENDWISE_GROUP_SETTLEMENT_CONTRACT=0x...
SPENDWISE_FINANCIAL_SCORE_CONTRACT=0x...
SPENDWISE_AUDIT_TRAIL_CONTRACT=0x...

# ─── Rate Limiting ───────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ─── Uploads ─────────────────────────
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=uploads

# ─── API Platform (Optional) ─────────
API_FREE_TIER_DAILY_LIMIT=100
API_STARTER_MONTHLY_LIMIT=10000
API_GROWTH_MONTHLY_LIMIT=100000
```

For the **blockchain module**, create a `.env` in `blockchain/`:

```env
POLYGON_MUMBAI_RPC=https://rpc-amoy.polygon.technology
POLYGON_MAINNET_RPC=https://polygon-rpc.com
DEPLOYER_PRIVATE_KEY=0x_your_deployer_private_key
POLYGONSCAN_API_KEY=your_api_key
```

### 4. Seed the Database

```bash
cd backend
npm run seed
```

This populates 20+ default expense/income categories with icons, colors, and keyword mappings.

### 5. Run the Application

```bash
# From the root directory — starts both backend and frontend
npm run dev

# Or run individually
npm run dev:backend    # → http://localhost:5000
npm run dev:frontend   # → http://localhost:5173
```

### 6. Run the Mobile App (Optional)

```bash
cd mobile

# Install dependencies
npm install

# Configure the API URL (create mobile/.env)
echo "EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:5000/api" > .env
# Find your LAN IP with: ifconfig | grep "inet " | grep -v 127.0.0.1

# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

> **Note:** Set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your machine's LAN IP. Both device and machine must be on the same Wi-Fi network. In dev mode, if the email service is unavailable, the backend returns the OTP in the response body and the app will display it in a toast automatically.

### 7. Verify Installation

- **Frontend**: Open [http://localhost:5173](http://localhost:5173)
- **Health Check**: `GET http://localhost:5000/health`
- **Metrics**: `GET http://localhost:5000/metrics`

---

## 📡 API Reference

Base URL: `http://localhost:5000/api`

All protected endpoints require a `Authorization: Bearer <jwt_token>` header.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login and receive JWT tokens |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/auth/me` | Get current user profile |
| `PUT` | `/auth/profile` | Update user profile |
| `PUT` | `/auth/password` | Change password |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/transactions` | List transactions (paginated, filterable) |
| `POST` | `/transactions` | Create a transaction |
| `GET` | `/transactions/:id` | Get transaction by ID |
| `PUT` | `/transactions/:id` | Update a transaction |
| `DELETE` | `/transactions/:id` | Soft-delete a transaction |
| `GET` | `/transactions/summary` | Monthly summary stats |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/categories` | List all categories (system + user) |
| `POST` | `/categories` | Create a custom category |

### AI — Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ai/categorize` | AI-categorize a single transaction |
| `POST` | `/ai/categorize-batch` | Batch-categorize up to 20 transactions |
| `GET` | `/ai/analysis` | Monthly spending analysis |
| `GET` | `/ai/insights` | Personalized financial insights |
| `GET` | `/ai/recommendations` | Actionable financial recommendations |
| `GET` | `/ai/score` | Financial health score (0–100) |
| `POST` | `/ai/chat` | Chat with SpendWise AI assistant |

### AI — Advanced

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/ai/advanced/predict-budget` | Predict next month's budget |
| `GET` | `/ai/advanced/anomalies` | Detect unusual transactions |
| `GET` | `/ai/advanced/subscriptions` | Auto-detect recurring payments |
| `GET` | `/ai/advanced/subscriptions/list` | List saved subscriptions |
| `GET` | `/ai/advanced/forecast` | Multi-month spending forecast |
| `GET` | `/ai/advanced/score-history` | Financial score evolution |

### Automation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/automation/sms/parse` | Parse an SMS message |
| `POST` | `/automation/sms/create` | Parse SMS + create transaction |
| `POST` | `/automation/sms/webhook` | MSG91 SMS webhook receiver |
| `GET` | `/automation/sms/status` | SMS tracking status |
| `PUT` | `/automation/sms/toggle` | Enable/disable SMS tracking |
| `POST` | `/automation/ocr/upload` | Upload receipt for OCR |
| `POST` | `/automation/ocr/create` | Create transaction from OCR |

### Payments (Razorpay)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/payments/order` | Create a payment order |
| `POST` | `/payments/verify` | Verify payment signature |
| `POST` | `/payments/webhook` | Razorpay webhook handler |
| `GET` | `/payments/history` | Payment history |
| `GET` | `/payments/budget-check` | Budget check before payment |
| `GET` | `/payments/stats` | Payment statistics |

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/groups` | Create a group |
| `GET` | `/groups` | List user's groups |
| `GET` | `/groups/:id` | Get group details |
| `PUT` | `/groups/:id` | Update group |
| `POST` | `/groups/:id/members` | Add a member |
| `DELETE` | `/groups/:id/members/:memberId` | Remove a member |
| `POST` | `/groups/:id/expenses` | Add group expense |
| `GET` | `/groups/:id/balances` | Get member balances |
| `POST` | `/groups/:id/settle` | Settle group debts |

### Blockchain

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/blockchain/audit/:transactionId` | Audit a transaction |
| `POST` | `/blockchain/audit-all` | Audit all un-audited transactions |
| `GET` | `/blockchain/verify/:transactionId` | Verify transaction integrity |
| `GET` | `/blockchain/verify-chain` | Verify entire audit chain |
| `GET` | `/blockchain/trail` | Get audit trail (paginated) |
| `GET` | `/blockchain/stats` | Blockchain statistics |
| `GET` | `/blockchain/proof/:transactionId` | Generate proof of spending |

### Platform API (API Key Auth)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/platform/dashboard` | JWT | Platform management dashboard |
| `POST` | `/platform/keys` | JWT | Generate API key |
| `GET` | `/platform/keys` | JWT | List API keys |
| `DELETE` | `/platform/keys/:id` | JWT | Revoke API key |
| `GET` | `/platform/tiers` | None | View pricing tiers |
| `GET` | `/platform/v1/categories` | API Key | List categories |
| `POST` | `/platform/v1/categorize` | API Key | AI categorization |
| `POST` | `/platform/v1/analyze` | API Key | Spending analysis |
| `POST` | `/platform/v1/predict` | API Key | Budget prediction |
| `POST` | `/platform/v1/score` | API Key | Financial score |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/notifications` | List user notifications |
| `PUT` | `/notifications/:id/read` | Mark notification as read |
| `PUT` | `/notifications/read-all` | Mark all as read |

> 📬 A full Postman collection is available at [`SpendWise_API_Collection.postman_collection.json`](./SpendWise_API_Collection.postman_collection.json)

---

## ⛓ Smart Contracts

SpendWise uses three Solidity smart contracts deployed on the Polygon network:

| Contract | Purpose |
|----------|---------|
| **AuditTrail.sol** | Anchors SHA-256 transaction hashes on-chain for immutable audit proof |
| **FinancialScoreCert.sol** | ERC-721 NFT that certifies a user's financial health score on-chain |
| **GroupSettlement.sol** | Handles on-chain group expense settlement among members |

### Deploy Contracts

```bash
cd blockchain

# Compile
npx hardhat compile

# Deploy to local Hardhat network
npx hardhat run scripts/deploy.js

# Deploy to Polygon Mumbai testnet
npx hardhat run scripts/deploy.js --network mumbai

# Verify on PolygonScan
npx hardhat run scripts/verify.js --network mumbai
```

---

## 📁 Project Structure

```
SpendWise/
├── backend/                          # Express.js API server
│   ├── server.js                     # Entry point — starts HTTP, connects DB
│   ├── jest.config.js                # Jest test configuration
│   ├── server-test.js                # Test server helper
│   └── src/
│       ├── app.js                    # Express app setup + middleware pipeline
│       ├── config/
│       │   ├── db.js                 # MongoDB connection + health check
│       │   ├── env.js                # Environment variable validation + config
│       │   └── seedCategories.js     # Database seeder (20+ categories)
│       ├── controllers/
│       │   ├── auth.controller.js    # Register, login, profile, password
│       │   ├── transaction.controller.js  # CRUD + summary + filters
│       │   ├── category.controller.js     # Category management
│       │   ├── ai.controller.js           # Core AI (categorize, analyze, chat)
│       │   ├── aiAdvanced.controller.js   # Advanced AI (predict, anomalies, forecast)
│       │   ├── Automation.controller.js   # SMS parsing, OCR, webhooks
│       │   ├── payment.controller.js      # Razorpay orders, verify, webhooks
│       │   ├── group.controller.js        # Group CRUD + expense splitting
│       │   ├── split.controller.js        # Split calculations + settlements
│       │   ├── blockchain.controller.js   # Audit trail, verification, proofs
│       │   ├── notification.controller.js # Notification management
│       │   ├── apiKey.controller.js       # API key lifecycle management
│       │   └── publicApi.controller.js    # Public API endpoints (key-authed)
│       ├── models/
│       │   ├── User.model.js              # User schema + bcrypt + virtuals
│       │   ├── Transaction.model.js       # Transaction schema (SMS, OCR, AI metadata)
│       │   ├── Category.model.js          # Category schema with keywords
│       │   ├── Budget.model.js            # Monthly budget with per-category allocation
│       │   ├── Goal.model.js              # Savings goals with contributions
│       │   ├── Group.model.js             # Group schema with member roles
│       │   ├── Split.model.js             # Expense split details
│       │   ├── RecurringTransaction.model.js  # Recurring/subscription tracking
│       │   ├── AIReport.model.js          # Cached AI analysis reports
│       │   ├── AuditTrail.model.js        # Blockchain audit chain entries
│       │   ├── APIKey.model.js            # API key schema with permissions
│       │   └── APIUsageLog.model.js       # API usage tracking per key
│       ├── middleware/
│       │   ├── auth.middleware.js          # JWT verification
│       │   ├── apiAuth.middleware.js       # API key auth + permission checking
│       │   ├── errorHandler.js            # Global error handler + 404
│       │   ├── rateLimiter.js             # Rate limits (general, AI, payment, upload)
│       │   ├── security.middleware.js     # HPP, XSS, suspicious activity detection
│       │   ├── performance.middleware.js  # Compression, caching, metrics, request IDs
│       │   └── validators/
│       │       ├── auth.validator.js      # Registration + login validation
│       │       └── transaction.validator.js # Transaction input validation
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── transaction.routes.js
│       │   ├── category.routes.js
│       │   ├── ai.routes.js
│       │   ├── aiAdvanced.routes.js
│       │   ├── automation.routes.js
│       │   ├── payment.routes.js
│       │   ├── group.routes.js
│       │   ├── blockchain.routes.js
│       │   ├── notification.routes.js
│       │   └── platform.routes.js
│       ├── services/
│       │   ├── groq.service.js            # Groq/Claude AI client wrapper
│       │   └── blockchain.service.js      # Hash chain + Polygon on-chain service
│       ├── utils/
│       │   ├── jwt.js                     # Token sign/verify helpers
│       │   ├── response.js               # Standardized API response helpers
│       │   ├── smsParser.js              # Regex-based Indian bank SMS parser
│       │   ├── ocrParser.js              # Tesseract.js OCR receipt processor
│       │   └── cloudinary.js             # Cloudinary upload utility
│       └── __tests__/
│           ├── setup.js                   # Test setup (MongoDB memory server)
│           ├── auth.test.js               # Authentication integration tests
│           ├── transaction.test.js        # Transaction CRUD tests
│           └── smsParser.test.js          # SMS parser unit tests
│
├── frontend/                         # React 19 + Vite PWA
│   ├── index.html                    # Entry HTML with flash-free theme init
│   ├── vite.config.js                # Vite config + PWA plugin + proxy
│   └── src/
│       ├── main.jsx                  # React DOM root
│       ├── App.jsx                   # Router, providers, lazy-loaded routes
│       ├── api/
│       │   ├── axios.js              # Axios instance with interceptors
│       │   ├── auth.api.js           # Auth API calls
│       │   ├── transaction.api.js    # Transaction API calls
│       │   └── category.api.js       # Category API calls
│       ├── context/
│       │   ├── AuthContext.jsx        # Authentication state + JWT management
│       │   ├── ThemeContext.jsx        # Dark/light theme provider
│       │   └── SyncContext.jsx        # Offline sync state management
│       ├── services/
│       │   ├── offlineStorage.js      # IndexedDB offline data persistence
│       │   └── syncService.js         # Background sync when back online
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppLayout.jsx      # Sidebar + content wrapper
│       │   │   └── AppLayout.css
│       │   ├── common/
│       │   │   └── ProtectedRoute.jsx # Auth guard for private routes
│       │   ├── SplashScreen.jsx       # Animated splash on first visit
│       │   ├── FoxMascot.jsx          # SVG animated mascot character
│       │   ├── NotificationsPanel.jsx # Notification dropdown panel
│       │   ├── ProfilePanel.jsx       # User profile side panel
│       │   └── MonthlyIncomePopup.jsx # First-time income prompt
│       ├── pages/
│       │   ├── Login.jsx              # Login page
│       │   ├── Register.jsx           # Registration page
│       │   ├── Dashboard.jsx          # Main dashboard with stats & charts
│       │   ├── Transactions.jsx       # Transaction list + filters + add/edit
│       │   ├── Analytics.jsx          # Charts, breakdowns, AI analysis
│       │   ├── Groups.jsx             # Group management + expenses + splits
│       │   ├── Friends.jsx            # Friends list + balances
│       │   ├── Goals.jsx              # Savings goals tracking
│       │   ├── AIAssistant.jsx        # AI chat interface
│       │   ├── Settings.jsx           # User settings + preferences
│       │   └── NotFound.jsx           # 404 page
│       └── styles/
│           ├── global.css             # Global styles + resets
│           └── variables.css          # CSS custom properties (design tokens)
│
├── mobile/                           # React Native + Expo app
│   ├── app.json                      # Expo config
│   ├── app/
│   │   ├── _layout.jsx               # Root layout — providers + auth gate
│   │   ├── index.jsx                 # Entry redirect
│   │   ├── (auth)/
│   │   │   ├── login.jsx             # Login screen
│   │   │   └── register.jsx          # Registration + OTP verify screen
│   │   ├── (tabs)/
│   │   │   ├── dashboard.jsx         # Dashboard — stats + recent transactions
│   │   │   ├── transactions.jsx      # Transaction list with search + filters
│   │   │   ├── analytics.jsx         # Charts: donut, health ring, sparkline
│   │   │   ├── ai.jsx                # AI assistant chat
│   │   │   └── add.jsx               # Add transaction screen
│   │   ├── goals.jsx                 # Savings goals
│   │   ├── groups.jsx                # Group expenses
│   │   └── settings.jsx              # User settings
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js             # Axios instance — Bearer token + auto-refresh
│   │   │   ├── auth.api.js           # Auth API calls
│   │   │   ├── transaction.api.js    # Transaction API calls
│   │   │   └── category.api.js       # Category API calls
│   │   ├── components/
│   │   │   ├── ui/                   # Design system (BottomNav, Card, Field, etc.)
│   │   │   ├── StatCard.jsx          # Dashboard stat tile
│   │   │   ├── TransactionItem.jsx   # Transaction list row
│   │   │   ├── OTPInput.jsx          # 6-digit OTP input
│   │   │   ├── LoadingScreen.jsx     # Full-screen loader
│   │   │   └── ToastConfig.jsx       # Toast theme config
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       # Auth state + token management
│   │   │   └── ThemeContext.jsx      # Dark/light theme
│   │   ├── hooks/
│   │   │   ├── useDashboardStats.js  # Dashboard data via React Query
│   │   │   ├── useTransactions.js    # Transaction list + mutations
│   │   │   └── useCategories.js      # Category list
│   │   ├── theme/
│   │   │   ├── colors.js             # Design token palette
│   │   │   ├── spacing.js            # Spacing scale
│   │   │   └── typography.js         # Font scale
│   │   └── utils/
│   │       ├── format.js             # INR currency + date formatting
│   │       ├── tokenStorage.js       # SecureStore token helpers
│   │       └── seedData.js           # Prototype seed data
│   └── assets/                       # App icons + splash
│
├── blockchain/                       # Hardhat smart contracts
│   ├── hardhat.config.js             # Hardhat config (Polygon Mumbai + Mainnet)
│   ├── contracts/
│   │   ├── AuditTrail.sol            # Transaction audit hash anchoring
│   │   ├── FinancialScoreCert.sol    # Financial score NFT certificate
│   │   └── GroupSettlement.sol       # On-chain group settlement
│   └── scripts/
│       ├── deploy.js                 # Contract deployment script
│       └── verify.js                 # PolygonScan verification script
│
├── SpendWise_API_Collection.postman_collection.json  # Postman collection
├── package.json                      # Root workspace scripts
└── .gitignore
```

---

## 🧪 Testing

SpendWise uses **Jest** with **Supertest** for integration testing and **mongodb-memory-server** for an isolated in-memory database.

### Run Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage
```

### Test Suites

| Suite | Coverage |
|-------|----------|
| `auth.test.js` | Register, login, profile, token refresh |
| `transaction.test.js` | CRUD, filtering, pagination, soft-delete |
| `smsParser.test.js` | SMS regex parsing for Indian bank formats |

---

## 🔒 Security

SpendWise implements multiple layers of security:

- **Helmet** — Secure HTTP headers (CSP, HSTS, X-Frame-Options)
- **CORS** — Strict origin allowlisting
- **Rate Limiting** — Configurable per-endpoint rate limits (general, AI, payment, upload)
- **Input Validation** — express-validator on all endpoints
- **NoSQL Injection Prevention** — express-mongo-sanitize
- **XSS Protection** — xss sanitization + Content-Security-Policy
- **HPP Protection** — HTTP parameter pollution prevention
- **Password Hashing** — bcrypt with 12 salt rounds
- **JWT Authentication** — Access + refresh token rotation
- **API Key Auth** — HMAC-based API keys with per-key permissions and rate limits
- **Suspicious Activity Detection** — Monitors for SQL injection patterns, path traversal, etc.
- **Graceful Shutdown** — SIGTERM/SIGINT handling with DB disconnect

---

## ⚡ Performance

- **Response Compression** — gzip/brotli via `compression` middleware
- **Request IDs** — UUID-based request tracking for debugging
- **Response Time Tracking** — `X-Response-Time` header on every response
- **Cache Headers** — Configurable cache control for static assets
- **Pagination Limits** — Enforced max page size (50 items)
- **Metrics Endpoint** — Real-time server metrics at `/metrics`
- **Lazy Loading** — React.lazy + Suspense for route-based code splitting
- **PWA Caching** — NetworkFirst for API, CacheFirst for static assets
- **Database Indexing** — Compound indexes on all high-frequency query patterns

---

## 🌍 Supported Banks (SMS Parsing)

The SMS parser supports transaction messages from major Indian banks and UPI apps:

| Banks | UPI Apps |
|-------|----------|
| HDFC Bank | Google Pay |
| SBI | PhonePe |
| ICICI Bank | Paytm |
| Axis Bank | BHIM |
| Kotak Mahindra | Amazon Pay |
| Yes Bank | |
| Punjab National Bank | |
| Bank of Baroda | |

---

## 📋 Scripts Reference

### Root

```bash
npm run dev              # Start backend + frontend concurrently
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run install:all      # Install all dependencies
```

### Backend

```bash
npm start                # Production start
npm run dev              # Development with nodemon
npm run seed             # Seed categories into database
npm test                 # Run test suite
npm run test:watch       # Tests in watch mode
npm run test:coverage    # Coverage report
```

### Frontend

```bash
npm run dev              # Vite dev server
npm run build            # Production build
npm run preview          # Preview production build
npm run lint             # ESLint check
```

### Mobile

```bash
npm start                # Start Expo dev server
npm run ios              # Run on iOS simulator
npm run android          # Run on Android emulator
npm run web              # Run in browser (limited)
```

### Blockchain

```bash
npx hardhat compile      # Compile contracts
npx hardhat test         # Run contract tests
npx hardhat run scripts/deploy.js --network mumbai  # Deploy
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

<p align="center">
  Built with ❤️ by <strong>SpendWise Team</strong>
</p>
