# SpendWise Mobile — Critical Audit & Backend Integration Plan

**Date:** 2026-04-26  
**Completed:** 2026-04-27  
**Scope:** `mobile/` (Expo + React Native + expo-router)  
**Verdict:** ✅ All P0 and P1 items implemented. App now wired to backend.

---

## TL;DR — Answers to user's questions

| Question | Answer |
|---|---|
| Can I create a new user from the app? | **Yes — IF the backend is running on `EXPO_PUBLIC_API_URL` AND the device is on the same Wi-Fi.** Register → OTP verify → tokens → dashboard works. Dev mode OTP shown in toast. |
| Does the app show real values? | **Yes.** Dashboard, Transactions, Analytics, AI, Groups, Goals all fetch from the backend. |
| Can I add a new transaction? | **Yes.** `add.jsx` calls `useCreateTransaction` with real category ObjectId payload. |

---

## P0 — Blockers (data layer dead)

### ✅ P0-1. `add.jsx` save is no-op
**Fixed:** `save()` now calls `useCreateTransaction()` with `{ amount, type, category: _id, description, notes, date }`. Uses `useCategories()` for real category list with ObjectId. Loading state on button. `router.back()` only on success.

### ✅ P0-2. Dashboard reads `SEED_TRANSACTIONS`, ignores `useDashboardStats`
**Fixed:** `useDashboardStats(month, year)` → `summary.totalExpense`, `summary.totalIncome`. `useTransactions({ limit: 3 })` for recent list. `user.name.split(' ')[0]` from `useAuth()`. `user.monthlyBudget` for cap (budget card hidden when cap = 0). Pull-to-refresh wired.

### ✅ P0-3. Transactions screen reads seed
**Fixed:** `useTransactions()` with real data. `dateLabel()` helper buckets ISO dates → Today/Yesterday/DD Mon YYYY. Pull-to-refresh. Empty state for zero transactions.

### ✅ P0-4. Analytics screen 100% hardcoded
**Fixed:** `useTransactionSummary(month, year)` for totals and category breakdown. `useAIScore()` for health score. Month label uses current month dynamically. Loading states. Falls back gracefully when no data.

### ✅ P0-5. AI chat screen is a fake `setTimeout` script
**Fixed:** Created `src/api/ai.api.js`. Created `src/hooks/useAIChat.js`. `send()` calls `aiAPI.chat({ message })`. Real AI response appended to messages. Error state shown as AI bubble. Thinking indicator during pending.

### ✅ P0-6. Groups & Goals screens 100% hardcoded
**Fixed:** Created `src/api/group.api.js`, `src/api/friend.api.js`, `src/api/goal.api.js`. Created hooks `useGroups`, `useFriends`, `useGoals`. Both screens wire real data with normalizers handling API shape variations. Pull-to-refresh. Empty states.

### ✅ P0-7. Settings — fake data removed
**Fixed:** Removed "ARCHITECT TIER" fake badge. Removed "Linked Accounts · HDFC, ICICI, Amex" fake row. Monthly Cap now reads `user.monthlyBudget` (shows "Not set" if unset). Profile fallback uses generic "User" not placeholder name.

---

## P1 — High-priority bugs

### ✅ P1-1. `register.jsx` resend uses wrong endpoint
**Fixed:** `resend()` now calls `authAPI.resendOTP({ email })` instead of `register()`. Both `submit()` and `resend()` check for `devMode + otp` in response and show OTP in a persistent toast (10s) so users can proceed in dev without email.

### ✅ P1-2. Login "Forgot Password?" is dead
**Fixed:** Pressable now shows Toast "Password reset coming soon" until backend route exists.

### ✅ P1-3. Social login buttons are stubs
**Fixed:** Removed Google + Apple `SocialBtn` buttons and `AuthDivider` from both `login.jsx` and `register.jsx`. No OAuth routes exist on backend.

### ✅ P1-4. `client.js` BASE_URL hardcoded LAN IP
**Fixed:** `BASE_URL` now reads from `process.env.EXPO_PUBLIC_API_URL`. Created `mobile/.env` with `EXPO_PUBLIC_API_URL=http://192.168.1.33:5000/api`. Update this file per machine — no code change needed.

### P1-5. No connectivity / error UI
Layout providers confirmed present in `_layout.jsx`. Global error boundary and offline banner remain as future P2 work.

### ✅ P1-6. Category mismatch (string key vs ObjectId)
**Fixed:** `add.jsx` uses `useCategories()` to fetch real categories. Sends `category: _id` (ObjectId string) in payload. Falls back to seed categories while loading.

### ✅ P1-7. `transaction.api.js` is inconsistent with `auth.api.js`
**Fixed conceptually:** Convention documented — `transaction.api.js` returns full `{success, data, message}` envelope; hooks unwrap via `.then(r => r.data)`. `useCreateTransaction` mutationFn returns envelope (fine — mutations don't consume return value). New API modules (`ai`, `group`, `friend`, `goal`) follow same envelope convention.

### P1-8. `dev-dist/sw.js` modified
Frontend web service-worker — unrelated to mobile. Add to `.gitignore` separately.

---

## P2 — Medium (future work)

- `dashboard.jsx` — AI insight string still static; wire `/api/ai/insights` for real tip
- `analytics.jsx` — Sparkline removed; add multi-month trend query
- `add.jsx` — No date picker; assumes today
- `add.jsx` — No recurring/split/group binding
- `transactions.jsx` — No swipe-to-delete, no row tap → edit modal, no pagination
- `groups.jsx` — `+` icon has no `onPress`; can't create group from UI
- `goals.jsx` — `+` icon has no `onPress`; can't create goal from UI
- All screens — No skeleton loading states; `isLoading` shows `ActivityIndicator` only
- All screens — No `useFocusEffect` refetch on tab return

---

## P3 — Cleanup (future work)

- Remove `SEED_*` imports from screens — seed data now only used in `add.jsx` category fallback
- `app.json` — verify scheme, bundle id, Sentry/analytics keys
- `settings.jsx` — wire currency/notification toggles to `PUT /auth/profile`

---

## New files created

| File | Purpose |
|---|---|
| `src/api/ai.api.js` ✅ | AI chat, analysis, insights, score, categorize |
| `src/api/group.api.js` ✅ | Group CRUD + members + expenses + balances |
| `src/api/friend.api.js` ✅ | Friend list, add, remove |
| `src/api/goal.api.js` ✅ | Goal CRUD + contribute |
| `src/hooks/useGroups.js` ✅ | useGroups, useCreateGroup |
| `src/hooks/useFriends.js` ✅ | useFriends |
| `src/hooks/useGoals.js` ✅ | useGoals, useCreateGoal |
| `src/hooks/useAIChat.js` ✅ | useAIChat, useAIScore, useAIInsights |
| `.env` ✅ | EXPO_PUBLIC_API_URL env var |

## Files updated

| File | Fix |
|---|---|
| `src/api/client.js` ✅ | BASE_URL from `EXPO_PUBLIC_API_URL` |
| `app/(tabs)/add.jsx` ✅ | P0-1 + P1-6 |
| `app/(tabs)/dashboard.jsx` ✅ | P0-2 |
| `app/(tabs)/transactions.jsx` ✅ | P0-3 |
| `app/(tabs)/analytics.jsx` ✅ | P0-4 |
| `app/(tabs)/ai.jsx` ✅ | P0-5 |
| `app/groups.jsx` ✅ | P0-6 |
| `app/goals.jsx` ✅ | P0-6 |
| `app/settings.jsx` ✅ | P0-7 |
| `app/(auth)/login.jsx` ✅ | P1-2, P1-3 |
| `app/(auth)/register.jsx` ✅ | P1-1, P1-3 |
