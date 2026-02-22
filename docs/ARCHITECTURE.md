# CocoPay Architecture

> Technical architecture for Community Commerce

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
├─────────────────┬─────────────────┬─────────────────┬───────────────────┤
│   iOS App       │   Android App   │   Web App       │   POS Hardware    │
│   (React Native)│   (React Native)│   (React/Vite)  │   (Future)        │
└────────┬────────┴────────┬────────┴────────┬────────┴─────────┬─────────┘
         │                 │                 │                   │
         └─────────────────┴────────┬────────┴───────────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │   API Gateway     │
                          │   (Rails 8)       │
                          └─────────┬─────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
┌────────▼────────┐      ┌──────────▼──────────┐    ┌─────────▼─────────┐
│  Auth Service   │      │  Payment Service    │    │  Store Service    │
│                 │      │                     │    │                   │
│ • Email         │      │ • Balance calc      │    │ • Store registry  │
│ • Passkey       │      │ • Token routing     │    │ • Revnet deploy   │
│ • Wallet (SIWE) │      │ • Cash out          │    │ • QR generation   │
└────────┬────────┘      └──────────┬──────────┘    └─────────┬─────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │    PostgreSQL     │
                          │                   │
                          │ • Users           │
                          │ • Stores          │
                          │ • Transactions    │
                          │ • Sessions        │
                          └─────────┬─────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
┌────────▼────────┐      ┌──────────▼──────────┐    ┌─────────▼─────────┐
│  Smart Accounts │      │  Relayr Bundle      │    │  Juicebox V5      │
│  (ERC-4337)     │      │  Service            │    │  Protocol         │
│                 │      │                     │    │                   │
│ • User wallets  │      │ • Multi-chain tx    │    │ • Revnets         │
│ • Gas abstraction│     │ • Gas sponsorship   │    │ • Token issuance  │
└─────────────────┘      └─────────────────────┘    └───────────────────┘
```

---

## Core Principles

### 1. Crypto Invisible
Users never see blockchain details. Addresses, gas, chains, transactions - all abstracted away.

### 2. Mobile First
Primary experience is mobile app. Web supports desktop and payment pages.

### 3. Instant Feedback
Every action shows immediate result. Background sync for blockchain confirmations.

### 4. Graceful Degradation
Works with minimal connectivity. Offline balance viewing. Retry on failure.

### 5. Multi-Chain Native
Stores exist on multiple chains. Users can pay from any supported chain.

---

## Tech Stack

### Mobile Apps (iOS + Android)
- **React Native** with Expo
- **Zustand** for state management
- **React Query** for server state
- **Reanimated** for animations
- **Expo SecureStore** for sensitive data

### Web App
- **React 18** with TypeScript
- **Vite** for bundling
- **Wagmi** for wallet connections (payment page only)
- **Tailwind CSS** (matching juicy-vision style)
- **Zustand** for global state

### Backend
- **Ruby on Rails 8** API
- **PostgreSQL 16** database
- **Redis 7** for caching and pub/sub
- **ActionCable** for real-time WebSocket notifications
- **eth.rb** for blockchain interactions
- **Relayr** for transaction bundling

### App Distribution
- **iOS**: Apple App Store via Expo EAS
- **Android**: Google Play Store via Expo EAS
- **Web**: Vercel (payment pages, QR landing pages)
- **OTA Updates**: Expo Updates for minor patches without store review

### Testing
- **Backend**: RSpec (TDD), FactoryBot, VCR
- **Mobile**: Jest, React Native Testing Library
- **E2E**: Detox (iOS + Android)
- **Coverage**: 80%+ required for all layers

### Blockchain
- **Juicebox V5** protocol (revnets)
- **ERC-4337** smart accounts
- **ERC-2771** meta-transactions
- **USDC** as base currency

### Supported Chains (Initial)
1. **Base** (primary - low fees)
2. **Optimism**
3. **Arbitrum**
4. **Ethereum Mainnet** (for larger amounts)

### AI Services
- **Claude API** for intent parsing and natural language responses
- **Whisper** (local) for speech-to-text
- On-device transcription when possible for speed/privacy

---

## Data Model

### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  is_merchant BOOLEAN DEFAULT false,
  smart_account_address TEXT,  -- ERC-4337 address

  -- Activity tracking (for backup owner activation)
  last_active_at TIMESTAMP,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Stores
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,          -- Token symbol (e.g., "CAFE")
  website TEXT,
  image_url TEXT,

  -- Revnet data (per chain)
  revnet_project_ids JSONB,      -- { "base": 123, "optimism": 456 }
  token_addresses JSONB,         -- { "base": "0x...", "optimism": "0x..." }

  -- QR code
  qr_code_url TEXT,
  payment_url TEXT,

  -- Store balance (separate from owner's personal balance)
  -- Funds accumulate here until paid out
  balance_usdc NUMERIC DEFAULT 0,

  -- Backup owner (for recovery if owner loses access)
  backup_owner_id UUID REFERENCES users(id),

  -- Stats (cached, updated periodically)
  total_volume_usd NUMERIC,
  total_transactions INTEGER,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Backup owner activation:
-- If owner hasn't logged in for 90 days AND backup owner requests,
-- backup owner becomes new owner. Requires email verification.
```

### Store Team Members
```sql
CREATE TABLE store_team_members (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES stores(id),
  user_id UUID REFERENCES users(id),

  role TEXT NOT NULL,            -- 'owner', 'admin', 'staff'

  -- Invite tracking
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP,
  accepted_at TIMESTAMP,         -- NULL if pending

  -- Access control
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  UNIQUE(store_id, user_id)
);

-- Role permissions (for reference, enforced in app logic):
-- owner: full access, manage payouts, store settings, team
-- admin: view analytics, manage team (except owner), collect payments
-- staff: collect payments, view today's sales only
```

### Store Menu Items
```sql
CREATE TABLE store_menu_items (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES stores(id),

  name TEXT NOT NULL,           -- "Cappuccino"
  price NUMERIC NOT NULL,       -- 4.00
  category TEXT,                -- "Coffee", "Food", etc.

  -- For AI matching
  aliases TEXT[],               -- ["cap", "capp", "cappucino"]

  -- Availability
  is_available BOOLEAN DEFAULT true,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Store Payouts
```sql
CREATE TABLE store_payouts (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES stores(id),

  -- Who initiated the payout
  initiated_by UUID REFERENCES users(id),

  -- Destination
  destination_type TEXT NOT NULL,  -- 'user_balance', 'pix', 'external_wallet'
  destination_user_id UUID REFERENCES users(id),  -- If paying to team member
  destination_details JSONB,       -- PIX key, wallet address, etc.

  amount_usd NUMERIC NOT NULL,
  note TEXT,

  -- Status
  status TEXT DEFAULT 'pending',   -- 'pending', 'completed', 'failed'

  -- Blockchain (if applicable)
  tx_hash TEXT,
  chain_id INTEGER,

  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### Transactions
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,            -- 'payment', 'cash_out', 'deposit'

  -- Parties
  from_user_id UUID REFERENCES users(id),
  to_store_id UUID REFERENCES stores(id),

  -- Amounts
  amount_usd NUMERIC NOT NULL,
  tokens_used JSONB,             -- [{ "address": "0x...", "amount": "100" }]
  rewards_earned JSONB,          -- { "address": "0x...", "amount": "5" }

  -- Blockchain
  chain_id INTEGER,
  tx_hash TEXT,
  status TEXT,                   -- 'pending', 'confirmed', 'failed'

  created_at TIMESTAMP,
  confirmed_at TIMESTAMP
);
```

### Token Balances (Cached)
```sql
CREATE TABLE token_balances (
  user_id UUID REFERENCES users(id),
  token_address TEXT,
  chain_id INTEGER,
  balance TEXT,                  -- BigInt as string
  usd_value NUMERIC,
  store_id UUID REFERENCES stores(id),  -- Which store this token is from
  updated_at TIMESTAMP,

  PRIMARY KEY (user_id, token_address, chain_id)
);
```

---

## Service Architecture

### Auth Service

Handles user authentication across three modes:

#### 1. Email Magic Link (Managed)
```
User enters email → Server sends magic link → User clicks link → Session created
                                                                        ↓
                                                    Smart account derived from user ID
```

#### 2. Passkey (Managed)
```
User creates passkey → WebAuthn credential stored → PRF extension derives key
                                                              ↓
                                          Same smart account, biometric auth
```

#### 3. Wallet Connect (Self-Custody)
```
User connects wallet → Signs SIWE message → Session created
                                                   ↓
                              User's own wallet used for transactions
```

### Payment Service

Core transaction logic:

#### Calculate Balance
```typescript
async function calculateBalance(userId: string): Promise<Balance> {
  // 1. Get all token balances for user across chains
  const balances = await getTokenBalances(userId)

  // 2. Get current prices for each token
  const prices = await getTokenPrices(balances.map(b => b.tokenAddress))

  // 3. Calculate USD value
  const totalUsd = balances.reduce((sum, b) => {
    return sum + (parseFloat(b.balance) * prices[b.tokenAddress])
  }, 0)

  // 4. Get USDC balance separately (always 1:1)
  const usdcBalance = await getUsdcBalance(userId)

  return {
    totalUsd: totalUsd + usdcBalance,
    breakdown: balances.map(b => ({
      storeName: b.store?.name ?? 'USDC',
      amount: b.balance,
      usdValue: parseFloat(b.balance) * prices[b.tokenAddress]
    }))
  }
}
```

#### Execute Payment
```typescript
async function executePayment(
  fromUserId: string,
  toStoreId: string,
  amountUsd: number
): Promise<Transaction> {
  // 1. Get user's token balances
  const balances = await getTokenBalances(fromUserId)

  // 2. Determine optimal token mix
  const tokenMix = calculateOptimalMix(balances, toStoreId, amountUsd)

  // 3. Build transactions
  const txs = tokenMix.map(t => ({
    type: t.isUsdc ? 'revnet_pay' : 'token_transfer',
    token: t.address,
    amount: t.amount,
    to: t.isUsdc ? storeRevnetAddress : merchantAddress
  }))

  // 4. Bundle and execute via Relayr
  const bundleId = await relayr.submitBundle(txs, fromUserId)

  // 5. Record transaction
  const tx = await recordTransaction({
    fromUserId,
    toStoreId,
    amountUsd,
    tokenMix,
    bundleId
  })

  return tx
}
```

#### Token Mix Algorithm
```typescript
function calculateOptimalMix(
  balances: TokenBalance[],
  storeId: string,
  amountUsd: number
): TokenMix[] {
  const result: TokenMix[] = []
  let remaining = amountUsd

  // Priority 1: Store's own tokens (reward loyalty)
  const storeTokens = balances.filter(b => b.storeId === storeId)
  for (const token of storeTokens) {
    if (remaining <= 0) break
    const use = Math.min(token.usdValue, remaining)
    result.push({ address: token.address, amount: use, isUsdc: false })
    remaining -= use
  }

  // Priority 2: Other store tokens (oldest first - FIFO)
  const otherTokens = balances
    .filter(b => b.storeId !== storeId && !b.isUsdc)
    .sort((a, b) => a.acquiredAt - b.acquiredAt)

  for (const token of otherTokens) {
    if (remaining <= 0) break
    const use = Math.min(token.usdValue, remaining)
    result.push({ address: token.address, amount: use, isUsdc: false })
    remaining -= use
  }

  // Priority 3: USDC (always last)
  if (remaining > 0) {
    result.push({ address: USDC_ADDRESS, amount: remaining, isUsdc: true })
  }

  return result
}
```

#### Token Valuation Formulas

**Bonding Curve Math** (Juicebox V5):

| Variable | Description |
|----------|-------------|
| x | Tokens to burn/cash out |
| y | USD amount received |
| O | Surplus (overflow available in treasury) |
| S | Total token supply |
| t | Cash out tax rate (0-1 scale, e.g., 0.1 = 10%) |

**Forward formula** (tokens → USD):
```
y = (x · O / S) · [(1 - t) + (t · x / S)]
```

**Inverse formula** (USD → tokens):
```
x = S · (√[(1-t)² + 4·t·y/O] - (1-t)) / 2t
```

**Special cases:**
- Linear (t = 0): `x = y · S / O`
- Max tax (t = 1): `x = S · √(y / O)`

**Implementation:**
```typescript
import { Decimal } from 'decimal.js'

function calculateTokensForUsd(
  targetUsd: bigint,
  surplus: bigint,
  supply: bigint,
  taxRate: number  // 0-10000 basis points
): bigint {
  const t = new Decimal(taxRate).div(10000)
  const y = new Decimal(targetUsd.toString())
  const O = new Decimal(surplus.toString())
  const S = new Decimal(supply.toString())

  // Special case: no tax
  if (t.equals(0)) {
    return BigInt(y.mul(S).div(O).toFixed(0))
  }

  // General case: inverse formula
  const oneMinusT = new Decimal(1).sub(t)
  const discriminant = oneMinusT.pow(2).add(t.mul(4).mul(y).div(O))
  const numerator = discriminant.sqrt().sub(oneMinusT)
  const fraction = numerator.div(t.mul(2))

  return BigInt(S.mul(fraction).toFixed(0))
}

function calculateUsdForTokens(
  tokens: bigint,
  surplus: bigint,
  supply: bigint,
  taxRate: number
): bigint {
  const t = new Decimal(taxRate).div(10000)
  const x = new Decimal(tokens.toString())
  const O = new Decimal(surplus.toString())
  const S = new Decimal(supply.toString())

  // y = (x · O / S) · [(1 - t) + (t · x / S)]
  const fraction = x.div(S)
  const taxFactor = new Decimal(1).sub(t).add(t.mul(fraction))
  const y = fraction.mul(O).mul(taxFactor)

  return BigInt(y.toFixed(0))
}
```

### Cash Out Service (REVLoans)

REVLoans provides loan-based exits. Key insight: **collateral is BURNED, not locked.**

**Deployed:** All 4 mainnet chains + all 4 Sepolia testnets (Base, Optimism, Arbitrum, Ethereum)

#### How REVLoans Works
```
User requests "cash out"
         ↓
Tokens are BURNED (removed from supply)
         ↓
User receives loan proceeds (USDC)
         ↓
Token supply decreases → floor price increases for remaining holders
         ↓
As revnet appreciates → "Available Bonus" grows (refinancing headroom)
```

**No repayment required** - The loan is secured by the right to remint tokens. Users can:
1. Never repay (tokens stay burned, loan never closes)
2. Repay to remint tokens at original collateral ratio

**Prepaid fee:** Always use minimum (25 basis points = 2.5% = 6 months duration).

After 6 months: 5% annual interest accrues. Users can refinance to reset the clock.

#### REVLoans API
```typescript
// Take a loan (burn tokens, receive USDC)
await revLoans.borrowFrom(
  projectId,      // Revnet project ID
  terminal,       // JBMultiTerminal address
  token,          // Token address (native or USDC)
  amount,         // Amount to borrow
  collateral,     // Tokens to burn as collateral
  beneficiary,    // Who receives the loan proceeds
  25  // Always use minimum (25 basis points = 2.5%)
)

// Check borrowable amount for given collateral
const maxBorrow = await revLoans.borrowableAmountFrom(
  projectId,
  collateralAmount,
  18,  // decimals
  1    // currency (1=ETH, 2=USDC)
)

// Refinance (extract value from appreciated collateral)
await revLoans.reallocateCollateralFromLoan(
  loanId,
  collateralToReallocate,
  minBorrowAmount,  // slippage protection
  beneficiary,
  25  // Always minimum
)
```

#### Calculate Available Bonus
```typescript
async function calculateAvailableBonus(userId: string): Promise<Bonus> {
  // 1. Get user's existing loans
  const loans = await getUserLoans(userId)

  // 2. For each loan, calculate refinancing headroom
  let totalHeadroom = 0n
  for (const loan of loans) {
    // Current borrowable amount for the original collateral
    const currentBorrowable = await revLoans.borrowableAmountFrom(
      loan.projectId,
      loan.collateral,
      18,
      1
    )
    // Headroom = current borrowable - original borrow amount
    const headroom = currentBorrowable - loan.borrowAmount
    if (headroom > 0n) totalHeadroom += headroom
  }

  // 3. Get uncollateralized token balances (can take new loans)
  const freeTokens = await getFreeTokenBalances(userId)
  for (const token of freeTokens) {
    const borrowable = await revLoans.borrowableAmountFrom(
      token.projectId,
      token.balance,
      18,
      1
    )
    totalHeadroom += borrowable
  }

  return {
    totalBonus: totalHeadroom,
    breakdown: {
      refinancingCapacity: totalHeadroom,
      freeTokenValue: freeTokens.reduce((sum, t) => sum + t.usdValue, 0n)
    }
  }
}
```

#### Execute Cash Out (Loan)
```typescript
async function executeCashOut(
  userId: string,
  amountUsd: number,
  destination: 'usdc' | 'pix' | 'bank'
): Promise<CashOutResult> {
  // 1. Verify sufficient collateral
  const bonus = await calculateAvailableBonus(userId)
  if (amountUsd > bonus.totalBonus) {
    throw new Error('Insufficient available bonus')
  }

  // 2. Take out loan against collateral
  const loanTx = await issueLoan({
    borrower: userId,
    amount: amountUsd,
    collateral: 'user_position'  // Their revnet position
  })

  // 3. Route proceeds to destination
  const disbursement = await routeProceeds(loanTx.proceeds, destination)

  // 4. Update user's loan balance
  await updateLoanBalance(userId, loanTx.id)

  return {
    loanId: loanTx.id,
    amountReceived: amountUsd,
    destination: disbursement.destination,
    newAvailableBonus: await calculateAvailableBonus(userId)
  }
}
```

#### Why Loan-Based?

1. **Collateral keeps earning**: User's position continues to grow
2. **Tax efficiency**: Loans aren't taxable events (in most jurisdictions)
3. **No repayment needed**: Taking a loan IS the cash out - simple mental model
4. **Never truly exit**: Users stay in the ecosystem even when "cashing out"
5. **UX simplicity**: User sees "bonus" growing, not loan mechanics

#### Loan Lifecycle

Loans are **perpetual and non-recourse**:
- User takes loan → receives USDC → done
- No monthly payments, no repayment schedule
- If collateral appreciates → bonus grows → user can take more
- If collateral drops → bonus shrinks to $0 → user keeps what they borrowed
- User can "exit fully" by cashing out all remaining collateral (closes position)

```
Initial state:
  Collateral: $100 │ Loan: $0 │ Bonus: $0

User cashes out $50:
  Collateral: $100 │ Loan: $50 │ Bonus: $0
  (User received $50 USDC)

Collateral appreciates to $150:
  Collateral: $150 │ Loan: $50 │ Bonus: $30
  (80% LTV = $120 max loan, minus $50 existing = $70 capacity)
  (But show ~$30 as "safe" bonus to claim)

User claims $30 bonus:
  Collateral: $150 │ Loan: $80 │ Bonus: $0
  (User received another $30 USDC)
```

### Store Service

Handles store creation and management:

#### Create Store (Revnet Deployment)
```typescript
async function createStore(
  ownerId: string,
  params: { name: string; symbol: string; website?: string }
): Promise<Store> {
  // 1. Create store record
  const store = await db.stores.create({
    ownerId,
    name: params.name,
    symbol: params.symbol.toUpperCase(),
    website: params.website
  })

  // 2. Deploy revnet on primary chain (Base)
  const revnetConfig = {
    name: params.name,
    symbol: params.symbol,

    // Fixed parameters for all stores
    initialIssuanceRate: 1_000_000,  // 1M tokens per ETH equivalent
    decayRate: 5_000,                // 0.5% reduction per 90 days
    decayFrequency: 90 * 24 * 60 * 60,  // 90 days in seconds
    cashOutTaxRate: 1000,            // 0.1 on 0-1 scale (max 10000)

    // Splits: 95% to owner, 5% as rewards to payer
    splits: [
      { beneficiary: ownerAddress, percent: 950_000_000 },  // 95%
      { beneficiary: REWARDS_HOOK, percent: 50_000_000 }    // 5% to hook
    ]
  }

  const deployTx = await encodeRevnetDeployment(revnetConfig)
  const bundleId = await relayr.submitBundle([deployTx], DEPLOYER_ADDRESS)

  // 3. Wait for deployment and get addresses
  const result = await relayr.waitForBundle(bundleId)

  // 4. Update store with on-chain data
  await db.stores.update(store.id, {
    revnetProjectIds: { base: result.projectId },
    tokenAddresses: { base: result.tokenAddress }
  })

  // 5. Generate QR code and payment URL
  const qrCode = await generateQrCode(store.id)
  const paymentUrl = `https://pay.cocopay.app/${store.id}`

  await db.stores.update(store.id, { qrCodeUrl: qrCode, paymentUrl })

  return store
}
```

### AI Assistant Service

Handles voice/text commands from merchants:

#### Intent Classification
```typescript
type MerchantIntent =
  | { type: 'order'; items: OrderItem[] }
  | { type: 'question'; query: string }
  | { type: 'menu_edit'; action: 'add' | 'update' | 'remove'; item: MenuItem }
  | { type: 'invoice'; customer: string; items: OrderItem[]; notes?: string }
  | { type: 'unknown'; raw: string }

async function parseIntent(
  storeId: string,
  input: string
): Promise<MerchantIntent> {
  const menu = await getStoreMenu(storeId)
  const context = { menu, storeName: store.name }

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    system: MERCHANT_ASSISTANT_PROMPT,
    messages: [{ role: 'user', content: input }],
    // Include menu context for item matching
  })

  return parseResponse(response)
}
```

#### Voice Order Flow
```typescript
async function handleVoiceOrder(
  storeId: string,
  audioBlob: Blob
): Promise<OrderResult> {
  // 1. Transcribe (local Whisper for speed)
  const transcript = await transcribe(audioBlob)

  // 2. Parse intent
  const intent = await parseIntent(storeId, transcript)

  if (intent.type !== 'order') {
    return { type: 'not_order', response: handleOtherIntent(intent) }
  }

  // 3. Calculate total from menu prices
  const menu = await getStoreMenu(storeId)
  const orderItems = matchItemsToMenu(intent.items, menu)
  const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

  // 4. Generate payment QR for this amount
  const paymentUrl = `${store.paymentUrl}?amount=${total}`

  return {
    type: 'order',
    items: orderItems,
    total,
    paymentUrl
  }
}
```

#### Analytics Queries
```typescript
async function handleAnalyticsQuery(
  storeId: string,
  query: string
): Promise<string> {
  // Fetch relevant data based on query type
  const data = await gatherAnalyticsContext(storeId, query)

  // Generate natural language response
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    system: ANALYTICS_RESPONSE_PROMPT,
    messages: [{
      role: 'user',
      content: `Query: ${query}\n\nData: ${JSON.stringify(data)}`
    }]
  })

  return response.content[0].text
}
```

---

## Revnet Configuration

All stores use identical revnet parameters (non-negotiable):

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Initial Issuance | 1,000,000 tokens/$1 | High granularity for small purchases |
| Issuance Decay | 0.5% every 90 days | Rewards early customers, sustainable |
| Cash Out Tax | 0.1 (1000/10000) | Small friction to keep funds in ecosystem |
| Owner Split | 95% | Merchant gets almost everything |
| Reward Split | 5% | Customer rewards (via pay hook) |

### Why Fixed Parameters?

1. **Simplicity**: Merchants don't need to understand tokenomics
2. **Predictability**: Customers know what to expect everywhere
3. **Network Effect**: Uniform tokens are more fungible
4. **Trust**: No hidden fees or changing rules

---

## Multi-Chain Strategy

### Primary Chain: Base
- Lowest fees
- Default for all new stores
- Where most transactions happen

### Secondary Chains
- Optimism, Arbitrum for users who hold USDC there
- Ethereum mainnet for larger amounts

### Cross-Chain Payments

When a crypto user pays from a different chain:

```
User has USDC on Optimism
         ↓
Scans merchant QR (store is on Base)
         ↓
Payment page detects user's chain
         ↓
Two options:
  A) Pay on Optimism → Store's Optimism revnet (if deployed)
  B) Bridge to Base → Pay on Base (higher friction)
         ↓
User chooses, payment completes
         ↓
Merchant receives funds on whichever chain
```

### Token Aggregation Challenge

Store tokens may exist on multiple chains. Balance calculation:

```typescript
async function getStoreTokenBalance(userId: string, storeId: string) {
  const store = await getStore(storeId)
  let totalBalance = 0n

  for (const [chain, tokenAddress] of Object.entries(store.tokenAddresses)) {
    const balance = await getOnChainBalance(userId, tokenAddress, chain)
    totalBalance += balance
  }

  return totalBalance
}
```

**Tradeoff accepted**: Tokens on different chains can't be atomically spent together. We show combined balance but spend from one chain at a time.

### Token Consolidation

When users have tokens fragmented across chains:

#### Manual Consolidation
User taps "Consolidate" button in balance breakdown:
```
┌─────────────────────────────────────────┐
│  Café da Praia rewards                  │
│  ────────────────────────────────────   │
│  $50.00 on Base                         │
│  $25.00 on Optimism                     │
│  $10.00 on Arbitrum                     │
│  ────────────────────────────────────   │
│  ┌─────────────────────────────────┐   │
│  │  Consolidate to Base            │   │
│  └─────────────────────────────────┘   │
│  Moves all tokens to one chain.        │
│  Takes a few minutes.                   │
└─────────────────────────────────────────┘
```

#### Auto-Consolidation (Managed Wallets)
For users with CocoPay-managed smart accounts:
- Background job runs during off-hours (2-5 AM local time)
- Consolidates fragmented balances to primary chain (Base)
- Only consolidates if: balance > $5 AND user inactive for 1+ hour
- No user action required

```typescript
async function autoConsolidate() {
  const fragmentedUsers = await getFragmentedBalances({
    minValuePerChain: 5,        // Don't bridge dust
    minInactiveMinutes: 60,     // User not actively using app
    managedWalletsOnly: true    // Only wallets we control
  })

  for (const user of fragmentedUsers) {
    await bridgeToChain(user, 'base')  // Consolidate to Base
  }
}

// Run nightly
schedule('0 3 * * *', autoConsolidate)
```

---

## Real-Time Notifications

Using WebSocket for instant updates:

```typescript
// Server
const ws = new WebSocket.Server({ port: 8080 })

ws.on('connection', (socket, req) => {
  const userId = authenticateSocket(req)
  userSockets.set(userId, socket)
})

function notifyUser(userId: string, event: Event) {
  const socket = userSockets.get(userId)
  if (socket) {
    socket.send(JSON.stringify(event))
  }
  // Also send push notification
  sendPushNotification(userId, event)
}

// Events
type Event =
  | { type: 'payment_received', amount: number, from: string }
  | { type: 'payment_sent', amount: number, to: string }
  | { type: 'balance_updated', newBalance: number }
  | { type: 'transaction_confirmed', txId: string }
```

---

## Security Layers

See SECURITY.md for detailed security architecture.

Key points:
- User keys derived from passkey PRF (never stored raw)
- All transactions signed server-side for managed users
- Rate limiting on all endpoints
- No raw USDC held by backend (only in revnets)

---

## API Endpoints

### Auth
```
POST /auth/email/send          # Send magic link to email
POST /auth/email/verify        # Verify magic link
POST /auth/passkey/register    # Register passkey
POST /auth/passkey/login       # Login with passkey
POST /auth/wallet/siwe         # Sign-In-With-Ethereum
POST /auth/logout              # End session
```

### User
```
GET  /user/me                 # Current user info
GET  /user/balance            # Total balance with breakdown
GET  /user/transactions       # Transaction history
PUT  /user/profile            # Update display name, etc.
```

### Store
```
POST /store/create            # Create new store
GET  /store/:id               # Store details
GET  /store/:id/qr            # QR code image
GET  /store/nearby            # Nearby stores (geo)
GET  /store/my                # User's store (if merchant)
```

### Payment
```
POST /payment/preview         # Preview payment (show token mix)
POST /payment/execute         # Execute payment
POST /payment/cash-out        # Cash out to bank/wallet
GET  /payment/:id/status      # Transaction status
```

### External (Payment Page)
```
GET  /pay/:storeId            # Payment page (no auth required)
POST /pay/:storeId/execute    # Execute payment from connected wallet
```

### Menu
```
GET  /store/:id/menu          # Get store menu items
POST /store/:id/menu          # Add menu item
PUT  /store/:id/menu/:itemId  # Update menu item
DELETE /store/:id/menu/:itemId # Remove menu item
```

### AI Assistant
```
POST /ai/voice                # Process voice order (audio blob)
  Body: { storeId, audio }
  Returns: { items, total, paymentUrl } | { response }

POST /ai/chat                 # Process text command
  Body: { storeId, message }
  Returns: { intent, response, action? }

POST /ai/invoice              # Create custom invoice
  Body: { storeId, customer, items, notes }
  Returns: { invoiceId, shareUrl }

GET  /ai/invoice/:id          # Check invoice status
  Returns: { status, paidAt? }
```

---

## Mobile App Architecture

### Unified App Philosophy

There is ONE app for everyone. Merchants and customers use the same app because:
- Merchants receive tokens when customers pay → merchants become customers
- Anyone can create a store → customers can become merchants
- The network effect strengthens when everyone participates on both sides

### Navigation Structure
```
Tab Navigator
├── Home (Balance + Quick Actions)
│   ├── Balance Detail Modal
│   ├── Available Bonus
│   ├── Pay Flow
│   │   ├── Scan QR
│   │   ├── Enter Amount
│   │   ├── Confirm
│   │   └── Success
│   └── Receive Flow
│       └── Show QR
│
├── Activity (Transaction History)
│   └── Transaction Detail
│
├── Explore (Nearby Stores)
│   ├── Map View
│   ├── List View
│   └── Store Detail
│
└── More
    ├── Settings
    ├── My Store (if store owner)
    │   ├── Dashboard
    │   ├── Analytics
    │   ├── QR Code
    │   └── Store Settings
    ├── Create Store (if no store)
    └── Help
```

### State Management
```typescript
// stores/balanceStore.ts
interface BalanceState {
  totalUsd: number
  breakdown: TokenBalance[]
  isLoading: boolean
  lastUpdated: Date

  refresh: () => Promise<void>
}

// stores/transactionStore.ts
interface TransactionState {
  transactions: Transaction[]
  pendingTx: Transaction | null

  addTransaction: (tx: Transaction) => void
  updateStatus: (id: string, status: string) => void
}

// stores/storeStore.ts
interface StoreState {
  myStore: Store | null
  nearbyStores: Store[]

  createStore: (params: CreateStoreParams) => Promise<Store>
  refreshNearby: (location: LatLng) => Promise<void>
}
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| App launch to balance | < 1s |
| Payment confirmation | < 3s |
| Store creation | < 30s (includes revnet deploy) |
| Balance refresh | < 500ms |
| Push notification latency | < 2s |

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare                           │
│                     (CDN + DDoS Protection)                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
   ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
   │  Web App    │ │  API        │ │  Payment    │
   │  (Static)   │ │  (Rails 8)  │ │  Page       │
   │             │ │             │ │  (Static)   │
   │  Vercel     │ │  Railway    │ │  Vercel     │
   └─────────────┘ └──────┬──────┘ └─────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
       ┌──────▼──────┐ ┌──▼──┐ ┌──────▼──────┐
       │  PostgreSQL │ │Redis│ │   Alchemy   │
       │  (Railway)  │ │     │ │   (RPC)     │
       └─────────────┘ └─────┘ └─────────────┘
```

### Mobile App Distribution
- **iOS**: TestFlight → App Store
- **Android**: Internal Testing → Play Store

---

## Future: Hardware POS

Architecture considerations for hardware terminal:

```
┌─────────────────────────────────────────┐
│            CocoPay Terminal             │
├─────────────────────────────────────────┤
│  • Android-based (custom ROM)           │
│  • Dedicated CocoPay app (kiosk mode)   │
│  • NFC reader for tap-to-pay            │
│  • QR scanner + display                 │
│  • Receipt printer (thermal)            │
│  • 4G/WiFi connectivity                 │
│  • Battery backup                       │
└─────────────────────────────────────────┘

Communication:
  Terminal ←→ Backend API (same as mobile)

Special features:
  • Merchant-only mode (no customer functions)
  • Batch settlement reports
  • Offline queue (sync when connected)
  • Hardware security module for keys
```

---

## Infrastructure & Environments

### Environment Parity

All environments (local, staging, production) run identical configurations via Docker.

```
┌─────────────────────────────────────────────────────────────────┐
│                     ENVIRONMENT MATRIX                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│     LOCAL       │    STAGING      │       PRODUCTION            │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ Docker Compose  │ Railway/Render  │ Railway/Render              │
│ PostgreSQL 16   │ PostgreSQL 16   │ PostgreSQL 16               │
│ Redis 7         │ Redis 7         │ Redis 7                     │
│ Same Docker img │ Same Docker img │ Same Docker img             │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ Sepolia chains  │ Sepolia chains  │ Mainnet chains              │
│ Test USDC       │ Test USDC       │ Real USDC                   │
│ .env.local      │ .env.staging    │ .env.production             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### Docker Compose (Local Development)

```yaml
# docker-compose.yml
services:
  api:
    build: ./apps/api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://cocopay:cocopay@db:5432/cocopay
      - REDIS_URL=redis://redis:6379
      - RESERVES_PRIVATE_KEY=${RESERVES_PRIVATE_KEY}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: cocopay
      POSTGRES_PASSWORD: cocopay
      POSTGRES_DB: cocopay
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Environment Variables

```bash
# .env.example (checked into repo)

# Database
DATABASE_URL=postgresql://user:pass@host:5432/cocopay

# Redis (for sessions, WebSocket pub/sub)
REDIS_URL=redis://host:6379

# Blockchain
ALCHEMY_API_KEY=
RESERVES_PRIVATE_KEY=         # Dev: env var, Prod: KMS

# Security
ENCRYPTION_KEY=               # For encrypting user signing keys
JWT_SECRET=

# Relayr
RELAYR_API_URL=https://api.relayr.ba5ed.com

# Chain Configuration
CHAIN_ENV=sepolia             # sepolia | mainnet

# Contract Addresses (same on all chains)
SIMPLE_ACCOUNT_FACTORY=0x69a05d911af23501ff9d6b811a97cac972dade05
ENTRY_POINT=0x0000000071727De22E5E9d8BAf0edAc6f37da032
```

### Deployment Pipeline

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   git push   │───▶│   CI/CD      │───▶│   Deploy     │
│   main       │    │   (GitHub)   │    │   (Railway)  │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
               ┌────▼────┐  ┌─────▼─────┐
               │  Test   │  │   Build   │
               │  Suite  │  │   Docker  │
               └────┬────┘  └─────┬─────┘
                    │             │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Deploy    │
                    │   Staging   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Manual    │
                    │   Promote   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Deploy    │
                    │   Prod      │
                    └─────────────┘
```

### Monorepo Structure

```
cocopay/
├── apps/
│   ├── api/              # Rails 8 API
│   │   ├── Dockerfile
│   │   ├── app/
│   │   │   ├── models/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── channels/    # ActionCable WebSockets
│   │   ├── config/
│   │   ├── db/
│   │   │   └── migrate/
│   │   └── Gemfile
│   │
│   ├── mobile/           # React Native + Expo
│   │   ├── src/
│   │   └── package.json
│   │
│   └── web/              # React (optional)
│       ├── src/
│       └── package.json
│
├── docker-compose.yml    # Local development
├── .env.example
├── .github/
│   └── workflows/
│       └── deploy.yml    # CI/CD pipeline
│
└── docs/                 # Move .md files here
    ├── ARCHITECTURE.md
    ├── SCREENS.md
    └── ...
```

### Database Migrations

Run the same migrations in all environments:

```bash
# Local
docker compose exec api bin/rails db:migrate

# Staging/Production (via CI/CD or Railway)
bin/rails db:migrate
```

Migrations are idempotent and versioned. Never edit a deployed migration.

### Health Checks

Each environment exposes:
- `GET /up` - Rails 8 default health check
- `GET /health/ready` - Full readiness (DB, Redis, RPC connections)

```ruby
# app/controllers/health_controller.rb
class HealthController < ApplicationController
  def ready
    checks = {
      database: ActiveRecord::Base.connection.active?,
      redis: Redis.current.ping == "PONG",
      rpc: AlchemyService.healthy?
    }

    status = checks.values.all? ? :ok : :service_unavailable
    render json: { status: status == :ok ? 'ok' : 'degraded', checks: checks }, status: status
  end
end
```

### Secrets Management

| Environment | Method |
|-------------|--------|
| Local | `.env.local` (gitignored) |
| Staging | Railway/Render env vars |
| Production | Railway/Render env vars + KMS for RESERVES_PRIVATE_KEY |

**Critical secrets:**
- `RESERVES_PRIVATE_KEY` - Controls all user smart accounts
- `ENCRYPTION_KEY` - Encrypts user signing keys in DB
- `JWT_SECRET` - Session tokens

Production should use KMS (AWS KMS, GCP KMS, or Railway's secrets) for `RESERVES_PRIVATE_KEY`.
