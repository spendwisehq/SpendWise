# SpendWise — How to Run Everything

## Prerequisites

| Tool | Min Version | Install |
|------|-------------|---------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | bundled with Node |
| MongoDB | any | `brew install mongodb-community` |
| Expo CLI | latest | `npm install -g expo-cli` |
| Expo Go app | latest | iOS App Store / Google Play |

---

## 1. Install All Dependencies

From the **repo root**:

```bash
npm run install:all
```

This installs `backend/`, `frontend/`, and `mobile/` in one shot.

For blockchain (optional, only if deploying contracts):

```bash
cd blockchain && npm install
```

---

## 2. Environment Files

You already have all `.env` files. Verify they exist:

```
backend/.env
frontend/.env
mobile/.env
```

### Key values to check

**`backend/.env`**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017
MONGODB_NAME=spendwise
FRONTEND_URL=http://localhost:5173
```

**`frontend/.env`**
```
VITE_API_URL=http://localhost:5000/api
```

**`mobile/.env`**
```
EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:5000/api
```

> **Mobile critical:** Use your machine's LAN IP (e.g. `192.168.1.X`), NOT `localhost`.  
> Find it: `ipconfig getifaddr en0` (Mac) or `ip addr` (Linux).  
> Both your computer and phone must be on the **same Wi-Fi network**.

---

## 3. Start MongoDB

```bash
brew services start mongodb-community
```

Verify it's running:
```bash
brew services list | grep mongodb
```

---

## 4. Backend

```bash
cd backend
npm run dev
```

Runs on **http://localhost:5000**

Health check: http://localhost:5000/health

### Seed categories (first run only)

```bash
cd backend
npm run seed
```

---

## 5. Frontend

```bash
cd frontend
npm run dev
```

Runs on **http://localhost:5173** — opens in browser automatically.

The Vite dev server proxies `/api` → `http://localhost:5000`, so `VITE_API_URL` only matters for production builds.

---

## 6. Mobile

```bash
cd mobile
npx expo start
```

- Scan the QR code with **Expo Go** (iOS) or the Camera app (Android)
- Press `i` for iOS simulator, `a` for Android emulator (requires Xcode/Android Studio)

### Common mobile issues

| Problem | Fix |
|---------|-----|
| Login/register times out | Wrong IP in `mobile/.env` — update `EXPO_PUBLIC_API_URL` to your LAN IP |
| QR not scanning | Ensure phone and Mac are on same Wi-Fi |
| Metro bundler stuck | Press `r` in terminal to reload, or `--clear` flag: `npx expo start --clear` |
| iOS simulator won't open | Open Xcode once to accept license, then retry |

---

## 7. Run Backend + Frontend Together (shortcut)

```bash
# from repo root
npm run dev
```

Uses `concurrently` — starts backend and frontend in one terminal.

---

## 8. Blockchain (optional)

Only needed if you're deploying or testing smart contracts.

```bash
cd blockchain
```

**Local Hardhat node:**
```bash
npx hardhat node
```

**Deploy contracts locally:**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

**Deploy to Polygon Amoy testnet:**
```bash
npx hardhat run scripts/deploy.js --network amoy
```

Set `BLOCKCHAIN_ENABLED=true` in `backend/.env` and fill in:
```
POLYGON_RPC_URL=
CHAIN_ID=
BACKEND_SIGNER_PRIVATE_KEY=
SPENDWISE_GROUP_SETTLEMENT_CONTRACT=
SPENDWISE_FINANCIAL_SCORE_CONTRACT=
SPENDWISE_AUDIT_TRAIL_CONTRACT=
```

---

## 9. Run Tests

```bash
cd backend
npm test                  # run once
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
```

---

## Quick Reference

| Service | Command | URL |
|---------|---------|-----|
| Backend | `cd backend && npm run dev` | http://localhost:5000 |
| Frontend | `cd frontend && npm run dev` | http://localhost:5173 |
| Mobile | `cd mobile && npx expo start` | Expo Go app |
| Both (web) | `npm run dev` (root) | — |
| MongoDB | `brew services start mongodb-community` | localhost:27017 |
| Hardhat node | `cd blockchain && npx hardhat node` | localhost:8545 |

---

## Postman Collection

API collection at repo root: `SpendWise_API_Collection.postman_collection.json`

Import into Postman to test all endpoints.
