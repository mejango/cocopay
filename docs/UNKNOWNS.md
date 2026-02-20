# Implementation Unknowns

> Questions resolved and remaining before first prototype

---

## RESOLVED - Critical Decisions Made

### 1. Smart Account Architecture ✅

**Answer**: Build ourselves, following juicy-vision pattern.

**Architecture** (from juicy-vision):
1. **Passkey → EOA**: WebAuthn PRF extension → HKDF → secp256k1 private key → deterministic EOA
2. **Smart Account**: ERC-4337 via `ForwardableSimpleAccountFactory` (CREATE2 deterministic)
3. **Factory**: `0x69a05d911af23501ff9d6b811a97cac972dade05` (same on all chains)
4. **Entry Point**: `0x0000000071727De22E5E9d8BAf0edAc6f37da032` (v0.7)
5. **Salt**: `keccak256('cocopay:' + userId)` for deterministic address
6. **ERC-2771**: TrustedForwarder for meta-transactions
7. **Key storage**: Private key sent to backend (encrypted) for signing

**Gas Sponsorship**: Yes, we sponsor via reserves wallet + paymaster.

---

### 2. Token Economics ✅

**Answer**: All stores accept all tokens at cash out value.

**How it works**:
- Token value = `store.reclaimableSurplusOf(token, amount)`
- When spending Store A tokens at Store B:
  1. Cash out Store A tokens → USDC (incurs cash out tax)
  2. Pay USDC to Store B revnet
  3. Receive Store B tokens as reward
- **OR** directly transfer Cococoins (the network token)

**Payment types**:
- **USDC**: Goes into revnets via `terminal.pay()`
- **Cococoins**: Transfer directly (no revnet interaction)
- **Store tokens**: Cash out → USDC → pay (bundled via Relayr)

---

### 3. Token Valuation ✅

**Answer**: Bonding curve math with inverse formula for payments.

**Forward** (tokens → USD): `reclaimableSurplusOf(tokenAddress, amount)`

**Inverse** (USD → tokens):
```
x = S · (√[(1-t)² + 4·t·y/O] - (1-t)) / 2t

Where:
  x = tokens needed
  y = target USD amount
  O = surplus (treasury overflow)
  S = total token supply
  t = cash out tax rate (0-1)
```

**Special cases:**
- No tax (t=0): `x = y · S / O`
- Max tax (t=1): `x = S · √(y/O)`

---

### 4. Cross-Chain ✅

**Answer**: Users can only spend from ONE chain at a time.

- Show per-chain balances in breakdown
- User picks chain or we default to chain with highest balance
- Consolidation button for manual bridging
- Auto-consolidate overnight for managed wallets (deferred)

---

### 5. Loan/Bonus System (REVLoans) ✅

**Answer**: Required for MVP - it's the only way users exit.

**REVLoans deployed:** All 4 mainnet chains + all 4 Sepolia testnets

**How it works:**
- Taking a loan IS cashing out
- Collateral is **BURNED** (not locked) - reduces supply, increases floor price
- No repayment needed (can repay to remint tokens if desired)
- Bonus grows as revnet appreciates → refinancing headroom
- Prepaid fee: always use minimum (25 basis points = 2.5% = 6 months)
- 10-year expiry (no margin calls, no liquidation risk)

---

## MVP Requirements

### Must Have
- [ ] User auth (phone/passkey - build like juicy-vision)
- [ ] Smart accounts (ERC-4337, deterministic via CREATE2)
- [ ] Store creation (omnichain revnet deployment via Relayr)
- [ ] USDC payments (into revnets)
- [ ] Cococoin payments (direct transfer)
- [ ] Store token payments (cash out → USDC → pay, bundled)
- [ ] Balance display (USDC + Cococoins + store tokens, per chain)
- [ ] Loan/Bonus system (REVLoans for exit)
- [ ] Merchant dashboard (today's sales, recent payments)
- [ ] Payment notifications (WebSocket)
- [ ] Team management (owner/admin/staff roles)
- [ ] Manual chain consolidation button

### Deferred
- [ ] Voice ordering / AI assistant
- [ ] Hardware terminal
- [ ] Auto-consolidation overnight job
- [ ] End-of-day AI summaries
- [ ] Custom invoices

---

## RESOLVED - Additional Clarifications

### 6. Cococoin = Store Token ✅

**Answer**: "Cococoin" is our internal development term for any store's revnet token.

- No separate Cococoin token
- Each store has its own revnet token (CAFE, SURF, etc.)
- **Users never see "cococoin"** - UI shows "rewards" or store name ("Café da Praia rewards")
- Internal only: gives us a consistent label when building/discussing
- Technically they're all standard revnet tokens with our fixed parameters

---

### 7. Token Transfer Mechanics ✅

**Answer**: When transferring "$15 of tokens" to a store, calculate token amount first.

```typescript
// User wants to pay $15 worth of CAFE tokens
const usdAmount = 15
const tokenAmount = await calculateTokensForUsd(cafeToken, usdAmount)
// Uses inverse of reclaimableSurplusOf to find token count

// Then transfer that many tokens
await transfer(cafeToken, storeOwner, tokenAmount)
```

So "transfer $15 cococoins" means:
1. Query `reclaimableSurplusOf` to get current rate
2. Calculate how many tokens = $15
3. Transfer that token amount

---

### 8. Chains at Launch ✅

**Answer**: All 4 chains from day 1.

- Base (primary - lowest fees)
- Optimism
- Arbitrum
- Ethereum Mainnet

Stores deploy to all chains via Relayr omnichain bundle.

---

### 9. Rewards to Payer ✅

**Answer**: Via revnet splits configuration.

- 5% of payment goes to payer as tokens
- Configured in ruleset splits during deployment
- Not a separate hook

---

### 10. Cash Out Tax ✅

**Answer**: Yes, `cashOutTaxRate` in ruleset config.

- Value: `1000` (0.1 on 0-1 scale, where max is 10000)
- Never express as percentage - always use 0-1 scale
- Configured at revnet deployment
- Proceeds stay in revnet (increases token value for holders)

---

## All Critical Questions Resolved

No remaining blockers. Ready to implement.

---

## Technical Stack

| Layer | Choice |
|-------|--------|
| Backend | Ruby on Rails 8 |
| Database | PostgreSQL 16 |
| Cache/PubSub | Redis 7 |
| Mobile | React Native + Expo |
| Blockchain | viem (frontend) + eth.rb (backend) |
| RPC | Alchemy |
| Containers | Docker + Docker Compose |
| Hosting | Railway |
| Testing | TDD (RSpec + Jest + Detox) |

**Why Rails:** AI-optimized codebase. Massive training corpus, convention over configuration, battle-tested for payments. Primary readers/writers are AI agents.

### App Distribution

| Platform | Method | Notes |
|----------|--------|-------|
| iOS | Apple App Store | Expo EAS Build + Submit |
| Android | Google Play Store | Expo EAS Build + Submit |
| Web | Vercel | React app (optional, payment links) |

**Expo EAS** handles:
- Native builds (no local Xcode/Android Studio needed)
- Code signing and certificates
- Over-the-air updates (minor updates without store review)
- Submission to App Store and Play Store

**Web app** is secondary - primarily for:
- Payment link pages (`pay.cocopay.app/store_123`)
- Store QR code landing pages
- Marketing/onboarding (links to app stores)

### Environment Parity

All environments (local, staging, production) run identical Docker images:
- Same PostgreSQL version
- Same Redis version
- Same application code
- Only env vars differ (chain config, secrets)

### Contract Addresses (Testnet)

| Contract | Address | Notes |
|----------|---------|-------|
| SimpleAccountFactory | `0x69a05d911af23501ff9d6b811a97cac972dade05` | juicy-vision's, testnets only for now |
| TrustedForwarder | Use Juicebox's | Same on all chains |
| Entry Point (v0.7) | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | ERC-4337 standard |

### Reserves Wallet

- Private key stored as env var (development)
- Migrate to KMS (Railway or similar) for production
- This wallet is the "owner" of all user smart accounts

### Store Revnet Parameters (Fixed for All Stores)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Initial Issuance | 1000 tokens/$ | High granularity |
| Issuance Decay | 0.5% | Cut every 90 days |
| Owner Split | 95% | Merchant receives |
| Reward Split | 5% | Customer earns |
| Cash Out Tax | 0.1 (1000/10000) | Small exit friction |

### Test Environment

- All 4 Sepolia testnets: Base, Optimism, Arbitrum, Ethereum
- Production addresses will be same as testnet (pending deployment)

---

## Immediate Next Steps

1. **Set up monorepo** - `/apps/web`, `/apps/mobile`, `/apps/backend`, `/packages/shared`
2. **Port juicy-vision wallet code** - passkey auth + smart accounts + signing
3. **Deploy test revnet** - one store on Base to understand the flow
4. **Integrate REVLoans** - understand loan/collateral mechanics
5. **Build payment flow** - USDC first, then token mixing
6. **WebSocket notifications** - payment received events
7. **Basic merchant UI** - dashboard + QR code

---

## Questions to Answer Next

1. **Cococoin**: What is it exactly and how does it fit?
2. **REVLoans**: Contract addresses and integration pattern?
3. **Chains**: Which chains for MVP launch?
