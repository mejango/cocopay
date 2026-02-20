# CocoPay AI Features

> Making merchant operations effortless

---

## Philosophy

AI should feel like a helpful coworker, not a complicated system. Merchants talk to CocoPay like they'd talk to an employee:

- "Ring up two coffees and a pastry"
- "How'd we do last week?"
- "Create an invoice for Maria's catering order"

No training. No menus. Just speak or type naturally.

---

## Core Feature: Voice & Text Assistant

### The Interface

A single input that accepts voice or text, always accessible from store dashboard:

```
┌─────────────────────────────────────────┐
│  ← My Store                             │
│                                         │
│           ☕ Café da Praia              │
│                                         │
│           Today: $387.50                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🎤  "Two lattes and a croiss…" │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │       Show Payment QR           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Recent payments...                     │
│                                         │
└─────────────────────────────────────────┘
```

Tap mic → speak → AI responds with action.

---

## Use Cases

### 1. Voice Invoicing

**The problem**: Customer orders multiple items. Merchant has to calculate total mentally or use a separate calculator.

**The solution**: Speak the order, get a payment QR with the exact amount.

```
Merchant: "Two cappuccinos, one açaí bowl, and a water"

┌─────────────────────────────────────────┐
│                                         │
│            Order Created                │
│                                         │
│  2x Cappuccino           $8.00          │
│  1x Açaí Bowl            $12.00         │
│  1x Water                $2.00          │
│  ────────────────────────────────────   │
│  Total                   $22.00         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Show QR for $22.00          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Edit Order                  │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**How it works**:
1. AI knows store's menu (prices set by merchant)
2. Parses natural language order
3. Generates itemized invoice
4. Shows pre-filled payment QR

**Edge cases handled**:
- "Make that three cappuccinos" → updates order
- "Actually, remove the water" → adjusts
- "Add a 10% tip" → adds line item
- Unknown item → "I don't have 'croissant' on your menu. Add it now?"

---

### 2. Quick Insights

**The problem**: Merchant wants to know how business is doing but doesn't want to dig through analytics.

**The solution**: Ask, get a clear answer.

```
Merchant: "How was last week?"

┌─────────────────────────────────────────┐
│                                         │
│  Last week at Café da Praia:            │
│                                         │
│  💰 Revenue: $2,847                     │
│     ↑ 12% vs previous week              │
│                                         │
│  📊 Transactions: 156                   │
│     Avg: $18.25 per sale                │
│                                         │
│  ⭐ Top seller: Cappuccino (48 sold)    │
│                                         │
│  👥 Repeat customers: 23 (up from 18)   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     See Full Analytics          │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**More examples**:
- "What's my best day?" → "Saturdays. You average $580, 40% above other days."
- "Who's my best customer?" → "João S. - 12 visits, $340 total this month."
- "Am I on track this month?" → "You're at $4,200, 15% ahead of last month's pace."
- "When's my slowest hour?" → "2-3 PM. Consider a happy hour special?"

---

### 3. Menu Management

**The problem**: Merchant needs to update prices or add items. Current flow requires navigating settings.

**The solution**: Tell the AI what to change.

```
Merchant: "Add a large açaí for $15"

┌─────────────────────────────────────────┐
│                                         │
│         Menu Item Added                 │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🍇 Large Açaí          $15.00  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Your menu now has 12 items.            │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     View Full Menu              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Undo                        │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**More examples**:
- "Raise coffee prices by 50 cents" → confirms, applies to all coffee items
- "We're out of croissants" → marks item as unavailable (won't include in voice orders)
- "Show me my menu" → displays editable list
- "Delete the seasonal special" → removes with confirmation

---

### 4. Custom Invoices

**The problem**: Customer wants a catering order, corporate invoice, or custom arrangement. Merchant needs to create a specific invoice with details.

**The solution**: Describe it naturally, AI generates it.

```
Merchant: "Create an invoice for Maria's birthday party -
          20 coffees, 3 cakes, and 50 pastries.
          Delivery to Lagoa on Saturday."

┌─────────────────────────────────────────┐
│                                         │
│      Invoice for Maria                  │
│                                         │
│  ────────────────────────────────────   │
│  20x Coffee               $60.00        │
│  3x Cake                  $90.00        │
│  50x Pastry               $75.00        │
│  ────────────────────────────────────   │
│  Subtotal                 $225.00       │
│                                         │
│  📍 Delivery: Lagoa, Saturday           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Send Invoice to Maria       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Edit Details                │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Invoice delivery options**:
- Share link via WhatsApp/SMS
- Customer pays via standard CocoPay flow
- Track payment status ("Has Maria paid?" → "Not yet. Sent 2 hours ago.")

---

### 5. End-of-Day Summary

**The problem**: Merchant closes shop, wants a quick recap without opening analytics.

**The solution**: Proactive or on-demand summary.

```
8:00 PM - Store typically closes

┌─────────────────────────────────────────┐
│                                         │
│  📊 Today's Summary                     │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  Revenue: $542.50                       │
│  Transactions: 34                       │
│  Avg: $15.96                            │
│                                         │
│  Best hour: 9-10 AM ($125)              │
│  Most popular: Cappuccino (18)          │
│                                         │
│  New customers: 8                       │
│  Returning: 26                          │
│                                         │
│  Store balance: $3,847.50               │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  "Good day! 15% above your Tuesday      │
│   average. Cappuccinos are hot lately." │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         Got it                  │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Delivery**:
- Push notification at close time (merchant sets schedule)
- Can also ask "How'd we do today?" anytime

---

## Technical Implementation

### Menu Data Model

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

### AI Processing Flow

```
Voice/Text Input
       ↓
Speech-to-Text (if voice)
       ↓
Intent Classification
  ├── "order" → Parse items → Generate invoice
  ├── "question" → Query analytics → Generate response
  ├── "menu_edit" → Parse change → Apply with confirmation
  └── "invoice" → Parse details → Create custom invoice
       ↓
Confirm with merchant (if needed)
       ↓
Execute action
```

### Latency Targets

| Action | Target |
|--------|--------|
| Voice transcription | < 500ms |
| Intent + response | < 1s |
| Full order → QR | < 2s |

### AI Model

- Use Claude for intent parsing and responses
- Fine-tune on merchant language patterns
- Local speech-to-text for speed (Whisper)
- Fallback: "I didn't catch that. Could you repeat?"

---

## Menu Setup (First Time)

New merchants need to set up their menu. AI helps:

```
┌─────────────────────────────────────────┐
│                                         │
│        Set Up Your Menu                 │
│                                         │
│  Tell me what you sell and I'll         │
│  create your menu. Just list items      │
│  with prices.                           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🎤  "Coffee 4 dollars, latte…" │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Or type them:                          │
│  ┌─────────────────────────────────┐   │
│  │  Coffee $4                      │   │
│  │  Latte $5                       │   │
│  │  Croissant $3.50                │   │
│  │  Açaí Bowl $12                  │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Create Menu                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│         Skip for now                    │
│                                         │
└─────────────────────────────────────────┘
```

AI parses freeform text/voice into structured menu items.

---

## Hardware Terminal Integration

Terminal supports voice via built-in mic:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ☕ Café da Praia                         │
│                                                             │
│              ┌───────────────────────┐                     │
│              │                       │                     │
│              │       [QR CODE]       │                     │
│              │                       │                     │
│              └───────────────────────┘                     │
│                                                             │
│                     Scan to pay                             │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│     Today: $342.50          🎤 "Two lattes"    Last: $45   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Staff taps mic icon or says "Hey CocoPay" → terminal listens
```

Terminal shows order summary → customer scans QR for that amount.

---

## What We're NOT Doing

Keeping it simple means saying no to:

- **Inventory management** - Not tracking stock levels (yet)
- **Reservations/bookings** - Out of scope
- **Multi-language in one store** - Menu is in one language
- **Complex discounts** - No "buy 2 get 1" logic
- **POS integrations** - CocoPay IS the POS

These can come later if there's demand.

---

## Privacy & Data

- Voice is transcribed on-device when possible
- Transcripts are not stored (only the resulting action)
- Menu data belongs to merchant
- Analytics queries don't expose individual customer data
- AI doesn't share data between stores

---

## Example Conversations

### Busy Morning Rush

```
Merchant: "Three americanos"
AI: [Shows QR for $12.00]

Merchant: "Add a muffin"
AI: [Updates to $15.00]

Merchant: "Make it four americanos actually"
AI: [Updates to $19.00, shows order summary]
```

### Quick Check

```
Merchant: "How many cappuccinos today?"
AI: "18 so far. That's your most popular item today."
```

### Price Update

```
Merchant: "Raise all prices by 10%"
AI: "This will update 12 items. Cappuccino $4.00 → $4.40,
     Latte $5.00 → $5.50... Confirm?"
Merchant: "Yes"
AI: "Done. New prices are live."
```

### Custom Order

```
Merchant: "João wants 10 coffees for his office,
          bill to his company"

AI: "Got it. Invoice for João:
     10x Coffee = $40.00

     How should I send this?"

Merchant: "WhatsApp"

AI: [Shows share dialog with pre-filled message]
```

---

## Rollout Plan

### Phase 1: Voice Ordering (MVP)
- Menu setup
- Voice → order → QR
- Basic "how did I do today" insights

### Phase 2: Smart Insights
- Natural language analytics queries
- End-of-day summaries
- Trend detection ("Cappuccinos up 20% this week")

### Phase 3: Custom Invoices
- Catering/bulk orders
- Invoice tracking
- WhatsApp/SMS delivery

### Phase 4: Terminal Integration
- Hardware mic support
- "Hey CocoPay" wake word
- Staff training mode

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Voice orders / day (per store) | 10+ |
| Order accuracy | > 95% |
| Time saved per order | 15 seconds |
| Merchant satisfaction | "Would miss it if gone" |
