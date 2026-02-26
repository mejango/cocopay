# CocoPay User Journey

> Community Commerce for Florianópolis

CocoPay connects local merchants with customers through a shared local economy. Merchants accept digital dollars, customers earn rewards at every store they visit.

---

## One App, Two Roles

Everyone uses the same CocoPay app. Users naturally flow between roles:

### Role 1: Customer
Anyone spending in the network. Tourists, digital nomads, locals—and merchants spending their earnings.

### Role 2: Merchant (Store Owner)
Anyone who creates a store. Local businesses wanting easy payments and customer loyalty.

**The key insight**: When merchants receive payments, they earn tokens. These tokens can be spent at ANY store in the network. So every merchant is also a customer. The more merchants participate, the more valuable everyone's balance becomes.

---

## Account Model

### Three Payer Types

| Type | Auth | On-chain identity | Signing | Gas |
|------|------|-------------------|---------|-----|
| **Managed** (email) | Magic link | Smart account | Server signs ForwardRequest | Org pays |
| **Self-custody** (wallet) | SIWE | Smart account | User signs ForwardRequest | Org pays |
| **External** (no account) | None | User's EOA | User signs tx directly | User pays |

Both managed and self-custody users get a `ForwardableSimpleAccount` provisioned on login. This smart account is the on-chain identity for all payment operations. External users (no CocoPay account) can pay via the `CocoPayRouter` contract directly.

### Users vs Stores

**Users** are people. Each person has one account with:
- Personal balance (their tokens and USDC)
- Smart account (provisioned on first login)
- Authentication (email OTP or wallet SIWE)
- Can pay, receive, and spend anywhere

**Stores** are businesses. Each store is a separate entity with:
- Store balance (payments received, not yet paid out)
- Store settings (name, symbol, QR)
- Team members with different access levels

**Key separation**: Store balance ≠ Owner's personal balance. The store must explicitly pay out to user accounts.

### Why Separate Store Accounts?

1. **Multi-person access**: Employees can collect payments without accessing owner funds
2. **Clean accounting**: Business income tracked separately from personal spending
3. **Payout control**: Owner decides when and to whom store funds are distributed
4. **Security**: Compromised employee device doesn't expose owner's full balance

---

## Store Team & Access Levels

### Roles

| Role | Collect Payments | View Sales | View Analytics | Manage Team | Manage Payouts | Store Settings |
|------|-----------------|------------|----------------|-------------|----------------|----------------|
| **Owner** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Admin** | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Staff** | ✓ | ✓ (today only) | ✗ | ✗ | ✗ | ✗ |

### Staff Mode (Cashier Experience)

Staff see a simplified interface—just what they need to collect payments:

```
┌─────────────────────────────────────────┐
│                                         │
│           ☕ Café da Praia              │
│              Staff Mode                 │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │    ┌───────────────────────┐   │   │
│  │    │ ▓▓░░▓▓░░▓▓░░▓▓░░▓▓   │   │   │
│  │    │ ░░▓▓░░▓▓  QR  ▓▓░░   │   │   │
│  │    │ ▓▓░░▓▓░░▓▓░░▓▓░░▓▓   │   │   │
│  │    └───────────────────────┘   │   │
│  │                                 │   │
│  │       Scan to pay              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Today's payments          $342.50      │
│  ────────────────────────────────────   │
│  João S.     $45.00          2 min ago  │
│  Maria L.    $22.50         15 min ago  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │    Switch to personal account   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**What staff CAN'T see:**
- Store balance (total accumulated)
- Historical analytics
- Payout history
- Other team members

**Why this is delightful:**
- Staff can do their job without friction
- No sensitive data exposed
- Easy to switch to their personal account to spend
- Clear visual distinction (Staff Mode badge)

### Inviting Team Members

Owner invites via phone number (they likely already have it):

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
│                                         │
│           Add Team Member               │
│                                         │
│  Phone number                           │
│  ┌─────────────────────────────────┐   │
│  │  +55 (48) 99999-9999            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Role                                   │
│  ┌─────────────────────────────────┐   │
│  │  ○ Admin                        │   │
│  │    Can view analytics & manage  │   │
│  │    team, but not payouts        │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  ● Staff (recommended)          │   │
│  │    Can collect payments and     │   │
│  │    see today's sales only       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  They'll receive an invite to join      │
│  Café da Praia. If they don't have      │
│  CocoPay, they'll create an account.    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         Send Invite             │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Receiving an Invite

New team member gets SMS/notification:

```
┌─────────────────────────────────────────┐
│                                         │
│              ☕                         │
│                                         │
│    You've been invited to join          │
│                                         │
│        Café da Praia                    │
│                                         │
│         as Staff                        │
│                                         │
│    by Ana (Owner)                       │
│                                         │
│                                         │
│  As staff, you can:                     │
│  • Show the payment QR to customers     │
│  • See payments as they come in         │
│  • View today's sales total             │
│                                         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         Accept Invite           │   │
│  └─────────────────────────────────┘   │
│                                         │
│            Decline                      │
│                                         │
└─────────────────────────────────────────┘
```

### Managing the Team

Owner sees all team members:

```
┌─────────────────────────────────────────┐
│  ← Store Settings                       │
│                                         │
│              Team                       │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  👤 Ana (you)           Owner   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  👤 Carlos              Admin   │   │
│  │     Added 3 months ago      ›   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  👤 Maria               Staff   │   │
│  │     Added 2 weeks ago       ›   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  👤 João                Staff   │   │
│  │     Invite pending          ›   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     + Add Team Member           │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Store Payouts

### Store Balance vs Personal Balance

```
┌─────────────────────────────────────────┐
│  ← My Store                             │
│                                         │
│         ☕ Café da Praia                │
│                                         │
│         Store Balance                   │
│           $1,847.50                     │
│                                         │
│  This is your store's accumulated       │
│  earnings, not yet paid out.            │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │          Pay Out                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  Recent payouts                         │
│                                         │
│  $500.00 → Ana (you)      Feb 10       │
│  $500.00 → Ana (you)      Feb 3        │
│  $250.00 → Carlos         Feb 1        │
│                                         │
└─────────────────────────────────────────┘
```

### Payout Flow

Owner selects where funds go:

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
│                                         │
│            Pay Out                      │
│                                         │
│  Store balance: $1,847.50               │
│                                         │
│  Amount                                 │
│  ┌─────────────────────────────────┐   │
│  │  $ 500.00                       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Pay to                                 │
│  ┌─────────────────────────────────┐   │
│  │  ● My CocoPay balance           │   │
│  │    Spend anywhere in network    │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  ○ Team member                  │   │
│  │    Carlos, Maria...             │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  ○ PIX (cash out)               │   │
│  │    To bank account              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Pay $500.00 to My Balance   │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Payout to Team Member

For profit-sharing or wages:

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
│                                         │
│       Pay Out to Team Member            │
│                                         │
│  Amount: $250.00                        │
│                                         │
│  Select team member                     │
│  ┌─────────────────────────────────┐   │
│  │  ○ Carlos (Admin)               │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  ● Maria (Staff)                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Note (optional)                        │
│  ┌─────────────────────────────────┐   │
│  │  February tips                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  Maria will receive $250.00 in her      │
│  CocoPay balance to spend anywhere.     │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │        Send $250.00             │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Merchant Journey

### Phase 1: Discovery
**Trigger**: Merchant sees another store using CocoPay, or hears about it from the local business community.

**Value proposition**: "Accept digital payments with zero fees. Your customers earn rewards they can spend anywhere in Floripa."

### Phase 2: Onboarding (< 2 minutes)

1. **Download app** (iOS/Android) or visit webapp
2. **Create account** via phone number or email
3. **Set up store**:
   - Store name (e.g., "Café da Praia")
   - Website or Instagram (optional)
   - Store symbol (e.g., "CAFE") - this becomes their reward token
4. **Done** - receive QR code for payments

**What happens behind the scenes** (merchant never sees this):
- A revnet is deployed with fixed parameters
- Store's reward token is created
- QR code links to payment page

### Phase 3: Daily Operations

#### Receiving Payments

**Simple flow** (customer-initiated):
1. Customer scans merchant's QR code (printed or on screen)
2. Customer enters amount and confirms
3. Merchant sees instant notification: "Received $25.00 from João"
4. Funds appear in store balance immediately

**Voice flow** (merchant-initiated):
1. Customer orders: "Two lattes and a croissant"
2. Merchant speaks into app: "Two lattes and a croissant"
3. AI generates order total: $13.50
4. Customer scans the resulting QR code
5. Done

#### AI Assistant

The store dashboard has a voice/text input for common tasks:

- **Voice ordering**: "Three coffees and two pastries" → instant QR for $17.50
- **Quick insights**: "How'd we do today?" → natural language summary
- **Menu updates**: "Add large açaí for $15" → menu updated
- **Custom invoices**: "Invoice for Maria's party, 20 coffees" → shareable link

No menus to navigate. Just speak naturally.

#### Viewing Balance

- **Store balance**: Accumulated payments (separate from personal)
- **Pay out**: Transfer to personal balance, team member, or bank
- **Cash out**: Convert to PIX (BRL) or USDC

#### Customer Rewards (Automatic)

Every payment automatically gives the customer a small amount of store tokens:
- Customer pays $100 → Customer receives ~$5 worth of store rewards
- These rewards can be spent at ANY CocoPay merchant
- Merchants keep 95% of every payment

### Phase 4: Growth

- **Ask the AI**: "How was last week?" / "Who's my best customer?" / "What's trending?"
- **View analytics**: Detailed daily/weekly/monthly breakdowns
- **See loyal customers**: Who shops here most often
- **End-of-day summary**: Automatic push notification at close time
- **Referral program**: Invite other merchants, earn bonus when they join

---

## Customer Journey

### Phase 1: Discovery

**Scenario A - Tourist with USDC**:
Tourist arrives in Floripa with USDC in their wallet. Sees "CocoPay accepted here" sign. Scans QR and pays directly from their existing wallet (no app download needed).

**Scenario B - Local wants to join the economy**:
Local downloads app after seeing rewards accumulate at their favorite café.

**Scenario C - Digital nomad**:
Nomad uses CocoPay at coworking space, realizes they can use rewards everywhere.

### Phase 2: First Payment (No App Required)

1. **Scan QR** at merchant
2. **See payment page**: "Pay Café da Praia"
3. **Connect wallet** (MetaMask, Rainbow, etc.) OR enter amount to pay with CocoPay balance
4. **Confirm payment**
5. **Receive confirmation** + "You earned $2.50 in rewards"

**For crypto-native users**: They can pay from any chain where they hold USDC. No app download required.

### Phase 3: App Onboarding (Optional but Recommended)

1. **Download app**
2. **Create account** via phone, email, or passkey
3. **See unified Balance**: All rewards from all stores shown as one USD amount
4. **Add funds**: Deposit USDC to increase balance

### Phase 4: Daily Usage

#### Viewing Balance

The home screen shows ONE number: their Balance in USD.

```
┌─────────────────────────────┐
│                             │
│        Your Balance         │
│          $127.50            │
│                             │
│   ┌─────────┐ ┌─────────┐   │
│   │   Pay   │ │ Receive │   │
│   └─────────┘ └─────────┘   │
│                             │
└─────────────────────────────┘
```

Tapping Balance reveals the breakdown:
- $50.00 USDC (deposited)
- $35.00 from Café da Praia rewards
- $22.50 from Surf Shop rewards
- $20.00 from Açaí Bowl rewards

#### Making a Payment

1. **Tap Pay** or scan merchant QR
2. **Enter amount**: $45.00
3. **See preview**:
   ```
   Paying $45.00 to Surf Shop

   Using:
   • $22.50 Surf Shop rewards
   • $15.00 Café da Praia rewards
   • $7.50 USDC

   You'll earn: ~$2.25 in Surf Shop rewards
   ```
4. **Confirm** (biometric or PIN)
5. **Done** - instant confirmation

**Smart spending**: The app automatically uses store-specific rewards first when paying that store, then other rewards, then USDC. This optimizes for the customer.

#### Receiving Money

1. **Tap Receive**
2. **Show QR code** or share payment link
3. **Someone pays you**
4. **Balance increases**

### Phase 5: Engagement

#### Exploring the Community

- **Nearby merchants**: Map of CocoPay stores
- **Reward breakdown**: See which stores you've earned from
- **Leaderboard**: Top community members (optional, privacy-respecting)

#### Cash Out & Available Bonus

**Behind the scenes**: All cash outs use loans against the user's collateral. Users never "withdraw" - they borrow against their position. **Loans never need to be repaid** - taking a loan IS the cash out.

**User-facing**: Users see an "Available Bonus" that grows as their collateral appreciates:

```
┌─────────────────────────────┐
│        Your Balance         │
│          $127.50            │
│                             │
│     Available Bonus: $12    │
│        ▲ +$3 this week      │
│                             │
│   ┌─────────┐ ┌─────────┐   │
│   │  Claim  │ │  Spend  │   │
│   └─────────┘ └─────────┘   │
└─────────────────────────────┘
```

**Claiming bonus**:
1. **Tap "Claim"** on Available Bonus
2. **Choose form**:
   - Store rewards (claim tokens from stores you've supported)
   - Cash (USDC)
3. **Confirm** - bonus added to balance or sent to bank

**What "bonus" represents**:
- Additional borrowing capacity as collateral appreciates
- Store tokens accumulated from payments
- The "free" value growth from staying in the ecosystem

**The mental model**:
- Cash out $50 → you borrowed $50 against your position
- Position grows → bonus grows → you can claim more
- Position drops → bonus shrinks → you still keep what you borrowed
- No repayment, no interest, no stress

**If customers want to fully exit**:
1. **Tap Balance → Cash Out All**
2. **See amount**: Your remaining position value minus outstanding loans
3. **Choose destination**: PIX (BRL), bank (USD), or USDC to wallet
4. **Confirm** - closes position entirely

The small cash-out fee incentivizes keeping funds in the ecosystem.

---

## Payment Flows

### Flow 1: Customer with CocoPay App → Merchant

```
Customer opens app
       ↓
Scans merchant QR
       ↓
Enters amount ($50)
       ↓
App shows which tokens will be used
       ↓
Customer confirms (biometric)
       ↓
Tokens transfer instantly
       ↓
Both see confirmation
       ↓
Customer earns merchant rewards
```

### Flow 2: Crypto User (No App) → Merchant

```
User scans merchant QR
       ↓
Payment page loads in browser
       ↓
User connects wallet (any chain)
       ↓
User approves USDC payment
       ↓
Payment goes to merchant's revnet
       ↓
Merchant receives funds
       ↓
User receives reward tokens (claimable in app later)
```

### Flow 3: Merchant Cash Out

```
Merchant taps Balance
       ↓
Taps "Transfer to Bank"
       ↓
Enters amount
       ↓
Selects PIX key
       ↓
Confirms
       ↓
Receives BRL in bank account
       ↓
(Backend: sells USDC via exchange partner)
```

---

## Key Moments of Delight

### For Merchants

1. **First payment received**: "It actually works, and it was instant"
2. **Seeing zero fees**: Comparing to 2-3% card fees
3. **Customer returns**: "They came back to use their rewards"
4. **Community growth**: Seeing the network effect in action

### For Customers

1. **Earning first reward**: "Wait, I get money back?"
2. **Using rewards at a different store**: "This works everywhere?"
3. **Seeing balance grow**: Accumulating value across the community
4. **No app required**: "I just scanned and paid from my wallet"

---

## Edge Cases

### Customer has no balance
- Can add USDC directly
- Can receive from another user
- Can pay via connected wallet

### Merchant needs instant cash
- Cash out to PIX is near-instant
- Small minimum ($10)

### Customer wants to leave ecosystem
- Cash out anytime
- Small exit fee makes staying more attractive

### Merchant wants to close store
- Can cash out entire balance
- Store remains functional for existing token holders

### Network issues
- Offline mode for viewing balance
- Payments require connectivity
- Retry logic for failed transactions

---

## Success Metrics

### Merchant Success
- Time to first payment < 5 minutes from signup
- Daily active merchants / total merchants > 60%
- Average merchant monthly volume growth > 10%

### Customer Success
- Rewards earned per customer per month
- Cross-store spending (using rewards at different stores)
- Retention: 30-day return rate > 70%

### Network Success
- Total USDC locked in ecosystem
- Total merchants in Floripa
- Geographic coverage (neighborhoods with CocoPay)

---

## Language & Tone

### Never Say
- Blockchain, crypto, token, wallet (unless user mentions first)
- Smart contract, revnet, gas, transaction hash
- USDC (say "digital dollars" or just "dollars")

### Always Say
- Balance (not "holdings" or "portfolio")
- Rewards (not "tokens" or "coins")
- Store rewards (not "store tokens")
- Community (not "network" or "ecosystem")
- Pay/Receive (not "send/transfer")

### Tone
- Friendly but not overly casual
- Confident but not arrogant
- Local but not exclusive
- Simple but not dumbed down
