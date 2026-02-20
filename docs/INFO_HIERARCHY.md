# CocoPay Information Hierarchy

> How information is organized, displayed, and prioritized across the app

---

## Design Principles

### 1. One Number First
Users see ONE number (their Balance) before anything else. Details are progressive disclosure.

### 2. Actions Over Information
Primary UI is "Pay" and "Receive" - not dashboards or analytics.

### 3. Crypto Invisible
All blockchain details hidden unless user explicitly seeks them. No addresses, no hashes, no gas.

### 4. Local Context
Everything framed around the local community (Florianópolis), not global crypto networks.

---

## Screen Hierarchy

### Unified App

Everyone uses the same app. Store owners access their store management via the More tab.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  HOME (Primary)                                     │
│  ├── Balance (single number, tappable)             │
│  │   └── Balance Breakdown (expanded)              │
│  │       ├── USDC balance                          │
│  │       └── Store rewards (per store)             │
│  │                                                 │
│  ├── Available Bonus (tappable)                    │
│  │   └── Claim flow (cash or store rewards)        │
│  │                                                 │
│  ├── [Pay Button] ──────────────────────────────┐  │
│  │                                              │  │
│  └── [Receive Button] ──────────────────────┐   │  │
│                                             │   │  │
└─────────────────────────────────────────────│───│──┘
                                              │   │
┌─────────────────────────────────────────────│───│──┐
│  PAY FLOW                                   │   │  │
│  ├── Scan QR / Enter Store ◀───────────────│───┘  │
│  ├── Enter Amount                          │      │
│  ├── Review (show token breakdown)         │      │
│  └── Confirm (biometric)                   │      │
│      └── Success + Rewards Earned          │      │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  RECEIVE FLOW                              ◀──────┘│
│  ├── Show QR Code                                 │
│  ├── Share Link                                   │
│  └── Request Amount (optional)                    │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  ACTIVITY (Secondary - via tab/menu)              │
│  ├── Recent Transactions                          │
│  │   ├── Payments made                            │
│  │   ├── Payments received                        │
│  │   └── Rewards earned                           │
│  └── Filter by date/store                         │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  EXPLORE (Secondary - via tab/menu)               │
│  ├── Nearby Stores (map)                          │
│  ├── Store Directory (list)                       │
│  └── Community Stats                              │
│      ├── Total stores in Floripa                  │
│      ├── Total circulating rewards                │
│      └── Top neighborhoods                        │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  MORE (Tertiary - via tab)                        │
│  ├── My Store (if store owner)                    │
│  │   ├── Dashboard (today's sales)                │
│  │   ├── Analytics                                │
│  │   ├── QR Code (download/print)                 │
│  │   └── Store Settings                           │
│  │                                                │
│  ├── Create Store (if no store)                   │
│  │                                                │
│  ├── Settings                                     │
│  │   ├── Profile (Phone/Email, Passkey)           │
│  │   ├── Security (PIN/Biometric, Sessions)       │
│  │   ├── Cash Out (PIX keys, External wallets)    │
│  │   └── Advanced (hidden by default)             │
│  │       ├── Connected wallets                    │
│  │       ├── Export wallet                        │
│  │       └── Transaction history (with hashes)    │
│  │                                                │
│  └── Help & Support                               │
└────────────────────────────────────────────────────┘
```

### Store Features (within More → My Store)

Access varies by role (Owner, Admin, Staff).

```
┌────────────────────────────────────────────────────┐
│  MY STORE DASHBOARD                               │
│  │                                                │
│  ├── AI Assistant (voice/text input)              │
│  │   ├── Voice ordering → QR with total           │
│  │   ├── Quick insights → natural language        │
│  │   ├── Menu updates → "add espresso $3"         │
│  │   └── Custom invoices → shareable link         │
│  │                                                │
│  ├── Store Balance (separate from personal)       │
│  │   └── [Pay Out] (owner only)                   │
│  │                                                │
│  ├── Today's Sales (single number)                │
│  │                                                │
│  ├── [Show QR] (for customers to scan)            │
│  │                                                │
│  └── Recent Payments (live feed)                  │
│      └── Staff see today only                     │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  AI ASSISTANT RESPONSES                           │
│  ├── Voice orders → itemized total + payment QR   │
│  ├── Insights → "How was last week?" answered     │
│  ├── Menu edits → confirmation + undo option      │
│  └── Invoices → shareable link + tracking         │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  ANALYTICS (owner & admin only)                   │
│  ├── Daily/Weekly/Monthly toggle                  │
│  ├── Revenue chart                                │
│  ├── Transaction count                            │
│  ├── Average transaction size                     │
│  ├── Repeat customer rate                         │
│  └── Or just ask: "How'd we do this month?"       │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  MENU (owner only)                                │
│  ├── Item list with prices                        │
│  ├── Add/edit/remove items                        │
│  ├── Mark unavailable                             │
│  └── Or just say: "Add large açaí for $15"        │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  TEAM (owner & admin only)                        │
│  ├── Team member list                             │
│  │   ├── Role badges (Owner, Admin, Staff)        │
│  │   └── Pending invites                          │
│  ├── Add team member                              │
│  │   ├── Phone number                             │
│  │   └── Role selection                           │
│  └── Remove/change role (owner only)              │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  PAYOUTS (owner only)                             │
│  ├── Payout to personal balance                   │
│  ├── Payout to team member                        │
│  ├── Payout to PIX (cash out)                     │
│  └── Payout history                               │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  STORE SETTINGS (owner only)                      │
│  ├── Store name                                   │
│  ├── Store symbol (read-only after creation)      │
│  ├── Website/Social links                         │
│  ├── QR code (download/print)                     │
│  └── Advanced                                     │
│      └── Revnet details (project ID, addresses)   │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  STAFF MODE (staff only)                          │
│  ├── Simplified single-screen view                │
│  ├── QR code prominent                            │
│  ├── Today's payments only                        │
│  └── [Switch to personal account]                 │
└────────────────────────────────────────────────────┘
```

### Role Permissions Summary

| Feature | Owner | Admin | Staff |
|---------|-------|-------|-------|
| Show QR / Collect payments | ✓ | ✓ | ✓ |
| Voice ordering | ✓ | ✓ | ✓ |
| View today's payments | ✓ | ✓ | ✓ |
| View all payment history | ✓ | ✓ | ✗ |
| Ask AI for insights | ✓ | ✓ | ✗ |
| View analytics | ✓ | ✓ | ✗ |
| Manage menu | ✓ | ✗ | ✗ |
| Create custom invoices | ✓ | ✓ | ✗ |
| Manage team | ✓ | ✓ | ✗ |
| Add/remove team members | ✓ | ✗ | ✗ |
| View store balance | ✓ | ✗ | ✗ |
| Manage payouts | ✓ | ✗ | ✗ |
| Store settings | ✓ | ✗ | ✗ |

---

## Information Components

### Balance Display

```
┌─────────────────────────────────────────┐
│         Your Balance                    │
│                                         │
│           $127.50                       │
│                                         │
│      ▼ Tap to see breakdown             │
└─────────────────────────────────────────┘

         ↓ (expanded)

┌─────────────────────────────────────────┐
│         Your Balance                    │
│           $127.50                       │
├─────────────────────────────────────────┤
│  $50.00   Dollars                       │
│  $35.00   Café da Praia                 │
│  $22.50   Surf Shop                     │
│  $20.00   Açaí Bowl                     │
├─────────────────────────────────────────┤
│           [Cash Out]                    │
└─────────────────────────────────────────┘
```

**Key decisions:**
- "Dollars" instead of "USDC"
- Store names instead of token symbols
- No addresses or technical details
- Cash out option always visible when expanded

### Payment Preview

```
┌─────────────────────────────────────────┐
│       Paying Surf Shop                  │
│            $45.00                       │
├─────────────────────────────────────────┤
│  Using:                                 │
│    $22.50  Surf Shop rewards            │
│    $15.00  Café da Praia rewards        │
│    $7.50   Dollars                      │
├─────────────────────────────────────────┤
│  You'll earn:                           │
│    ~$2.25  Surf Shop rewards            │
├─────────────────────────────────────────┤
│         [Confirm Payment]               │
└─────────────────────────────────────────┘
```

**Key decisions:**
- Show what's being used (transparency)
- Show rewards earned (incentive)
- "rewards" language, not "tokens"
- Approximate rewards with ~ (because issuance rate changes)

### Transaction Receipt

```
┌─────────────────────────────────────────┐
│              ✓ Paid                     │
│                                         │
│           $45.00                        │
│         to Surf Shop                    │
│                                         │
│     Feb 16, 2026 at 2:34 PM            │
├─────────────────────────────────────────┤
│  You earned $2.25 in Surf Shop rewards  │
├─────────────────────────────────────────┤
│         [View Details]                  │
│            [Done]                       │
└─────────────────────────────────────────┘

         ↓ (View Details - advanced)

┌─────────────────────────────────────────┐
│  Transaction Details                    │
├─────────────────────────────────────────┤
│  From:   Your account                   │
│  To:     Surf Shop (surf.cocopay.app)   │
│  Amount: $45.00                         │
│  Tokens: 22.5 SURF, 15 CAFE, 7.5 USDC  │
│  Status: Confirmed                      │
│  Chain:  Base                           │
│  Hash:   0x1234...abcd [Copy]          │
└─────────────────────────────────────────┘
```

**Key decisions:**
- Success state is prominent and simple
- Technical details hidden behind "View Details"
- Chain and hash only in advanced view
- "Your account" instead of address

### Store Card (in Explore)

```
┌─────────────────────────────────────────┐
│  ┌─────┐                                │
│  │ 🏪 │  Café da Praia                  │
│  └─────┘  Coffee & Pastries             │
│           0.3 km away                   │
│                                         │
│  Your rewards: $35.00                   │
│                                         │
│     [Pay]            [Directions]       │
└─────────────────────────────────────────┘
```

**Key decisions:**
- Store icon/logo prominent
- Distance shown for local context
- User's rewards at this store shown
- Direct action buttons

### Merchant Payment Notification

```
┌─────────────────────────────────────────┐
│  💰 Payment Received                    │
│                                         │
│     $25.00 from João                    │
│         just now                        │
│                                         │
└─────────────────────────────────────────┘
```

**Key decisions:**
- Simple, glanceable
- Name if available, "Customer" if not
- Relative time ("just now", "2 min ago")
- No technical details in notification

---

## Data Model (User-Facing)

### Balance Object

```typescript
// What the user sees
interface UserBalance {
  total: string           // "$127.50"
  breakdown: BalanceItem[]
}

interface BalanceItem {
  amount: string          // "$35.00"
  label: string           // "Café da Praia" or "Dollars"
  type: 'store' | 'cash'
  storeId?: string        // For navigation
}
```

### Transaction Object

```typescript
// What the user sees
interface UserTransaction {
  id: string
  type: 'payment' | 'received' | 'cashout'
  amount: string          // "$45.00"
  counterparty: string    // "Surf Shop" or "João"
  timestamp: string       // "Feb 16, 2:34 PM"
  status: 'pending' | 'confirmed' | 'failed'
  rewardsEarned?: string  // "$2.25 in Surf Shop rewards"
}

// Technical details (hidden by default)
interface TransactionDetails extends UserTransaction {
  tokensUsed: TokenAmount[]
  chain: string
  hash: string
  blockNumber: number
}
```

### Store Object

```typescript
// What the user sees
interface UserStore {
  id: string
  name: string            // "Café da Praia"
  category?: string       // "Coffee & Pastries"
  distance?: string       // "0.3 km"
  userRewards?: string    // "$35.00"
  website?: string
  location?: {
    lat: number
    lng: number
    address: string
  }
}

// Technical details (for merchants/advanced)
interface StoreDetails extends UserStore {
  symbol: string          // "CAFE"
  tokenAddress: string
  revnetId: number
  chainId: number
}
```

---

## Navigation Patterns

### Tab Bar (Mobile)

```
┌─────────────────────────────────────────┐
│                                         │
│            [Screen Content]             │
│                                         │
├─────────────────────────────────────────┤
│   Home     Activity    Explore   More   │
│    🏠         📋         🗺️       ≡     │
└─────────────────────────────────────────┘
```

- **Home**: Balance + Pay/Receive (most used)
- **Activity**: Transaction history
- **Explore**: Map + store directory
- **More**: Settings, cash out, help

### Store Owner Access

No mode toggle needed. Store owners access their store via **More → My Store**:

```
┌─────────────────────────────────────────┐
│  More                                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  ☕ My Store: Café da Praia     │   │
│  │     Today: $342.50              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  ⚙️ Settings                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  ❓ Help & Support              │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

Users without a store see "Create Store" instead:

```
┌─────────────────────────────────────────┐
│  More                                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🏪 Create Store                │   │
│  │     Accept payments from anyone │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  ⚙️ Settings                    │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Progressive Disclosure Levels

### Level 1: Essential (Always Visible)
- Balance total
- Pay/Receive actions
- Recent transactions (last 3)
- Success/error states

### Level 2: Detail (One Tap Away)
- Balance breakdown by store
- Transaction breakdown (tokens used)
- Store details (in explore)
- Analytics charts (for merchants)

### Level 3: Technical (Hidden in Settings > Advanced)
- Wallet addresses
- Transaction hashes
- Chain information
- Token symbols and amounts
- Export functionality

### Level 4: Developer (Not in UI, API only)
- Raw transaction data
- Contract interactions
- WebSocket events
- Debug logs

---

## Copy Guidelines

### Currency Display
```
✓ $45.00          (always USD)
✓ $1,234.56       (thousands separator)
✓ ~$2.25          (approximate with tilde)
✗ 45 USDC         (never show "USDC")
✗ 45.000000       (never show extra decimals)
```

### Rewards Display
```
✓ Café da Praia rewards
✓ Store rewards
✓ You earned $2.25 in rewards
✗ CAFE tokens
✗ $CAFE
✗ Cococoins
```

### Action Buttons
```
✓ Pay
✓ Receive
✓ Cash Out
✓ Confirm
✗ Send
✗ Transfer
✗ Swap
✗ Redeem
```

### Status Messages
```
✓ Paid              (past tense, complete)
✓ Receiving...      (present, in progress)
✓ Confirmed         (technical, hidden)
✗ Transaction sent
✗ Pending confirmation
✗ Awaiting block
```

### Error Messages
```
✓ Payment failed. Try again.
✓ Not enough balance for this payment.
✓ Connection lost. Check your internet.
✗ Transaction reverted
✗ Insufficient gas
✗ RPC error
```

---

## Responsive Behavior

### Mobile (Primary)
- Full-screen balance
- Bottom sheet for breakdowns
- Full-screen pay flow
- Tab navigation

### Tablet
- Split view: Balance left, Activity right
- Larger touch targets
- Same information hierarchy

### Web (Desktop)
- Centered card layout (max 480px content)
- Same mobile flows
- Keyboard shortcuts for power users
- QR codes display larger for scanning

### Hardware POS (Future)
- Balance + QR only
- Large numbers for visibility
- Minimal interaction (tap to refresh)
- Audible notifications

---

## Accessibility

### Screen Readers
- Balance announced as "Your balance is one hundred twenty-seven dollars and fifty cents"
- Buttons have clear labels
- Transaction list announces amounts and counterparties

### Font Sizes
- Minimum 16px for body text
- Balance number at least 32px
- Support system font scaling

### Color
- All information conveyed with more than color
- Green checkmarks have "Confirmed" text
- Red errors have descriptive messages

### Touch Targets
- Minimum 44x44pt touch targets
- Generous spacing between interactive elements
- Swipe gestures have button alternatives
