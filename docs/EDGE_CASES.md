# CocoPay Edge Cases

> Scenarios that need clear handling

---

## Payment Edge Cases

### 1. Payment Succeeds but Merchant Doesn't See It

**Scenario**: Customer's phone confirms payment, but terminal/staff phone doesn't show notification (network split, app crashed, etc.)

**Risk**: Customer walks away thinking they paid, merchant thinks they didn't.

**Mitigations**:
- Customer's success screen shows **confirmation code** (e.g., "A7B3C9")
- Staff can manually check: "Show me your confirmation"
- Backend records payment regardless of frontend state
- Store dashboard shows all payments even if live notification missed

**UX Addition**:
```
┌─────────────────────────────────────────┐
│               ✓ Paid                    │
│              $45.00                     │
│                                         │
│      Confirmation: A7B3C9               │
│                                         │
│  Show this to the merchant if asked.    │
└─────────────────────────────────────────┘
```

---

### 2. Customer Pays Wrong Store

**Scenario**: Customer scans a QR code from a different store (old receipt, similar-looking codes, malicious swap).

**Risk**: Funds go to wrong merchant.

**Mitigations**:
- Payment confirmation screen **prominently shows store name**
- Require customer to confirm: "You're paying **Café da Praia**"
- QR codes include store logo/color for visual distinction
- Consider: GPS check if payment location doesn't match store location (warning, not blocking)

**Open question**: Do we support refunds? Or is this "buyer beware"?

---

### 3. Double Payment Attempt

**Scenario**: Customer taps confirm twice, or network lag causes retry.

**Risk**: Charged twice for same purchase.

**Mitigations**:
- **Idempotency key** on payment requests (client-generated UUID)
- Server rejects duplicate within time window
- Disable confirm button after first tap
- Show "Processing..." state clearly

---

### 4. Insufficient Balance Mid-Payment

**Scenario**: Customer starts payment with $50 balance, but token prices drop during confirmation, now balance is $48.

**Risk**: Payment fails unexpectedly.

**Mitigations**:
- Lock token amounts at preview time (short TTL, ~60 seconds)
- If expired, re-fetch and show updated preview
- Small buffer in balance check (allow 1-2% slippage)

---

### 5. Refunds / Disputes

**Scenario**: Customer wants money back (wrong item, didn't receive service, etc.)

**Current position**: No in-app refunds. Merchants handle offline.

**Rationale**:
- Blockchain payments are final
- Adding refund flow adds massive complexity
- Most disputes are social, not technical

**Future consideration**:
- Merchant-initiated refund (push payment back to customer)
- Requires customer to have received store tokens (can send back)

**Documentation needed**: Make clear that payments are final.

---

## Store & Team Edge Cases

### 6. Owner Loses Account Access

**Scenario**: Owner loses phone, can't recover passkey, phone number changed.

**Risk**: Store is orphaned. No one can manage payouts or team.

**Mitigations**:
- Multiple recovery methods (phone + email + passkey)
- Allow owner to designate a **backup owner** (another user who can claim ownership if owner inactive for X days)
- Support process for identity verification + ownership transfer

**Data model addition**:
```sql
backup_owner_id UUID REFERENCES users(id),
owner_inactive_since TIMESTAMP  -- Set when owner hasn't logged in for 30 days
```

---

### 7. Staff Member Leaves / Fired

**Scenario**: Employee quits or is fired, still has app with store access.

**Risk**: Ex-employee can still see payments (privacy), or worse.

**Mitigations**:
- Owner/Admin can **remove team member** instantly
- Removal revokes access immediately (server-side check)
- Staff only sees today's payments anyway (limited exposure)
- Consider: auto-expire access after N days of inactivity

---

### 8. Disputed Ownership

**Scenario**: Business partner claims they should be owner, not current owner.

**Risk**: Legal dispute spills into platform.

**Position**: Ownership is whoever created the store. Disputes are offline.

**Documentation needed**: Clear ToS that ownership follows account, platform doesn't arbitrate.

---

### 9. Store Symbol Collision

**Scenario**: Two stores want symbol "CAFE".

**Current handling**: First-come-first-served. Symbol is unique.

**UX**: Show error if symbol taken, suggest alternatives.

```
┌─────────────────────────────────────────┐
│  Store symbol                           │
│  ┌─────────────────────────────────┐   │
│  │  CAFE                      ❌   │   │
│  └─────────────────────────────────┘   │
│  Already taken. Try: CAFE2, CAFEPR     │
└─────────────────────────────────────────┘
```

---

### 10. Store Closes / Abandons

**Scenario**: Store owner stops operating, never comes back.

**Risks**:
- Customers hold worthless tokens
- Store appears in Explore
- Revnet still exists on-chain

**Mitigations**:
- Auto-hide stores with no payments for 90 days from Explore
- Tokens still work (revnet doesn't disappear)
- Customers can still cash out tokens via revnet's bonding curve
- No "delete store" - just inactive

**Philosophy**: Revnets are permanent. Store UI is just a wrapper.

---

## Token & Balance Edge Cases

### 11. Token Price Drops Significantly

**Scenario**: Store token was worth $1 per 1000 tokens. Now worth $0.50 per 1000.

**Risk**: Customer balance shows $50, but cash-out value is only $25.

**Current handling**: Balance shows **current** market value, updated in real-time.

**Clarification needed**: Make clear that balance fluctuates. "Balance" is not a bank account.

**UX consideration**: Show trend indicator?
```
Your Balance
  $127.50
  ▼ $3.20 today
```

---

### 12. Orphaned Store Tokens

**Scenario**: Customer holds tokens from a store that closed. Can't spend them there.

**Options**:
1. **Spend at other stores** - tokens are accepted network-wide (current design)
2. **Cash out via revnet** - always possible, bonding curve is permanent
3. **Show as separate "inactive" category** in balance breakdown

**Current design handles this**: All tokens work everywhere. Closed store just means no new payments to that revnet.

---

### 13. Dust Balances

**Scenario**: Customer has $0.003 worth of tokens from 10 different stores.

**Risk**: Cluttered UI, confusion, gas costs exceed value.

**Mitigations**:
- Don't show balances below $0.01 in breakdown (aggregate as "Other")
- When paying, ignore dust (don't try to use 0.001 of a token)
- Consider: "Sweep dust" feature that consolidates into USDC

---

### 14. Cross-Chain Token Fragmentation

**Scenario**: User has 100 CAFE tokens on Base, 50 CAFE tokens on Optimism.

**Current handling**: Show combined balance ($X from Café da Praia), but can only spend from one chain at a time.

**Edge case**: User tries to pay $75 at Café, but each chain only has $50.

**Options**:
1. **Show warning**: "You have $150 total but only $100 on Base. Switch chains or reduce amount."
2. **Auto-bridge**: Bridge tokens before payment (adds latency, complexity)
3. **Accept limitation**: "Your available balance on this chain is $X"

**Recommendation**: Option 3 for MVP. Show chain-specific balances when expanded.

---

## Loan / Bonus Edge Cases

### 15. Underwater Position (Loan > Collateral)

**Scenario**: User took $100 loan against $120 collateral. Collateral drops to $90.

**Risk**: User owes more than they have. Can't fully exit.

**Handling**:
- Loans are **non-recourse**: User can walk away (lose collateral, keep loan proceeds)
- Or user can add collateral to restore LTV
- "Available Bonus" shows $0 (or negative, hidden)

**UX**: Don't show scary negative numbers. Just show "No bonus available."

---

### 16. Loan Repayment

**Scenario**: User took loan, now wants to "pay it back" to unlock collateral.

**Resolution**: REVLoans burns collateral at loan origination - there's nothing to "unlock."

**How it actually works:**
- When you take a loan, tokens are **burned** (not locked)
- No repayment is required - the loan never needs to be closed
- If you want tokens back, you can repay to **remint** them at the original collateral ratio
- "Bonus" grows because the revnet appreciates → you can refinance to extract more value

**User mental model**: "I converted my tokens to cash. If I want, I can convert cash back to tokens later."

**UI implications:**
- Don't show "loan balance" or "repay" prominently
- Show "Available Bonus" (refinancing headroom) as the key metric
- Optional "Convert back to tokens" buried in advanced settings

---

### 17. Bonus Calculation During Volatility

**Scenario**: User checks bonus at 10 AM ($10 available). Prices move. At 10:05 AM bonus is $8.

**Risk**: User expected $10, only gets $8. Feels like a bug.

**Mitigations**:
- Show bonus as **approximate** with refresh indicator
- Add timestamp: "As of 10:05 AM"
- On claim, re-calculate and show actual amount before confirm

---

## Hardware Terminal Edge Cases

### 18. Terminal Stolen

**Scenario**: Someone steals the physical terminal.

**Risk**: Thief can't access funds (no payout permissions), but could deface/misuse.

**Mitigations**:
- Owner can **remote wipe** from app
- Terminal requires WiFi (thief can't use on different network without reconfiguring)
- Device shows store name prominently (obvious it's stolen)
- Consider: GPS tracking (privacy tradeoff)

---

### 19. Extended Offline Period

**Scenario**: Store loses internet for 3 days.

**Handling**:
- Terminal shows "Offline" banner but still displays QR
- Payments still work (customer's phone does the transaction)
- Terminal doesn't show confirmations until back online
- On reconnect, syncs and shows all missed payments

**Limitation**: Staff won't see payment confirmations in real-time. Must trust customer's phone.

---

### 20. Multiple Terminals, Same Payment

**Scenario**: Store has 3 terminals. Customer pays. Which terminal shows confirmation?

**Current design**: **All terminals** receive the WebSocket event. All show confirmation.

**Alternative**: Only terminal that was "active" (last interacted with) shows it.

**Recommendation**: All show it. Simple, no edge cases about "which one."

---

## Onboarding Edge Cases

### 21. Existing Wallet User

**Scenario**: Crypto-native user already has wallet with USDC. Wants to use that, not create new account.

**Flow**:
- Sign-In-With-Ethereum (SIWE) option
- Links existing wallet to CocoPay account
- Can pay from that wallet directly (no smart account intermediary)

**Already in architecture**, but needs prominent UI placement.

---

### 22. Phone Number Changes

**Scenario**: User switches carriers, gets new phone number. Old number recycled to someone else.

**Risks**:
- User can't log in with old number
- New owner of number could access account (if they try to sign up)

**Mitigations**:
- Require **passkey or email** as backup auth method
- If user has passkey: can log in and update phone number
- If user only had phone: support process for recovery
- Rate-limit OTPs to new devices for existing accounts

---

### 23. Phone Number Hijacked (SIM Swap)

**Scenario**: Attacker convinces carrier to transfer victim's number. Receives OTPs.

**Risk**: Account takeover.

**Mitigations**:
- Passkey is primary auth (not SMS-interceptable)
- Any sensitive action (payout, add team member) requires passkey, not just SMS
- Consider: withdrawal delay for new devices (24h hold)

**Security doc reference**: See SECURITY.md for detailed threat model.

---

### 24. Invite to Existing User

**Scenario**: Owner invites phone number +55 48 99999-9999. That number already has a CocoPay account.

**Handling**:
- Don't create new account
- Show invite to existing user in their app
- They accept, gain access to store

**UX**: Same as inviting new user, just skips account creation.

---

## Multi-Chain Edge Cases

### 25. Cross-Chain Payment

**Scenario**: User has USDC on Arbitrum. Store's revnet is on Base.

**Options**:
1. **Bridge then pay**: User bridges USDC to Base, then pays (slow, extra step)
2. **Cross-chain swap**: Use bridge/swap aggregator to do it atomically
3. **Store deploys multi-chain**: Revnet exists on Arbitrum too, pay there directly

**Current design**: Option 3 (stores deploy on multiple chains). Option 2 for advanced users.

**Edge case within edge case**: Store only on Base, user only has USDC on Arbitrum. Must bridge.

**UX**: Detect this case, offer to bridge (with fee/time estimate).

---

### 26. Bridge Failure

**Scenario**: User initiates cross-chain payment. Bridge transaction fails/stuck.

**Risk**: User's USDC locked in bridge, payment didn't complete.

**Mitigations**:
- Use reputable bridges with refund mechanisms
- Show bridge status clearly
- If bridge fails, funds return to origin chain
- Consider: avoid bridging in MVP, require same-chain payments

---

## Privacy Edge Cases

### 27. Customer Wants Anonymity

**Scenario**: Customer pays but doesn't want merchant to know their name.

**Current handling**: Payments from CocoPay app show name (if set). Payments from external wallet show address (pseudonymous).

**Options**:
1. **Anonymous mode**: User can disable name sharing
2. **Always anonymous**: Never share names
3. **Merchant choice**: Merchant can require name (for orders, etc.)

**Recommendation**: Default to showing name (builds community), but allow user to set preference in settings.

---

### 28. Merchant Tracks Customer Spending

**Scenario**: Merchant sees "João bought $500 this month across all his stores."

**Risk**: Privacy violation if João didn't consent.

**Current handling**: Merchant only sees payments to **their own store(s)**. No cross-store visibility.

**Already handled**, but document clearly.

---

## Financial / Regulatory Edge Cases

### 29. Large Transactions

**Scenario**: Someone tries to pay $10,000.

**Risks**: Structuring, AML concerns, fraud.

**Mitigations**:
- Implement transaction limits (per day, per transaction)
- KYC required above certain thresholds
- Flag unusual activity for review

**Needs policy decision**: What are the limits? $1k/day? $10k/month?

---

### 30. Tax Reporting

**Scenario**: Merchant needs records for tax purposes.

**Feature needed**: Export transaction history (CSV, PDF).

**Data to include**:
- Date, amount, customer (if available)
- Store balance movements
- Payout history

---

### 31. Currency Display (BRL vs USD)

**Scenario**: Merchant in Brazil wants to see amounts in BRL, not USD.

**Current design**: Everything in USD (digital dollars).

**Options**:
1. **Show both**: "$45.00 (~R$225.00)"
2. **User preference**: Choose display currency
3. **Stay USD-only**: Simpler, avoids FX confusion

**Recommendation**: Show both in merchant analytics. Keep core UI in USD.

---

## Smart Account & Payment Execution Edge Cases

### 32. Relayr Bundle Timeout

**Scenario**: Relayr balance bundle is submitted but never confirms (RPC issues, gas spike, etc.).

**Current handling**:
- `BundleStatusJob` polls every 5 seconds, max 60 attempts (5 minutes)
- After timeout, transaction is marked `failed` with `BUNDLE_TIMEOUT` error
- User sees "Payment failed" and can retry

**Mitigations**:
- Show "This is taking longer than usual..." after 30 seconds
- Allow user to dismiss and check status later via activity feed
- Backend retries on transient RPC errors before failing

---

### 33. Smart Account Not Yet Deployed

**Scenario**: User's smart account address is computed counterfactually but has never been deployed on-chain. First transaction needs to deploy it.

**Current handling**:
- The ERC-2771 forwarder + Relayr handles this transparently — the forwarder calls the smart account, and if the account doesn't exist, the call is routed through the factory
- `SmartAccount.deployed` flag tracks deployment state
- First successful transaction updates `deployed: true` with `deploy_tx_hash`

**Mitigations**:
- No user-facing action needed — deployment is lazy and transparent
- Factory CREATE2 ensures the address matches the pre-computed one

---

### 34. Insufficient Balance in Smart Account

**Scenario**: Managed user's smart account has no USDC balance for a payment.

**Current handling**:
- The client builds calldata that references the smart account's balance
- If balance is insufficient, the Relayr simulation will fail
- Transaction marked `failed` with `EXECUTION_FAILED`

**Mitigations**:
- Frontend checks balance before building calldata
- Show "Insufficient balance" error before submitting
- Guide user to deposit USDC to their smart account address

---

### 35. Self-Custody User Rejects ForwardRequest Signature

**Scenario**: Wallet popup appears for `signTypedData`, user clicks "Reject".

**Current handling**:
- `signTypedDataAsync` throws an error
- Payment status set to `failed` with "User rejected signature"
- No backend call is made

**Mitigations**:
- Clear error message: "Signature required to complete payment"
- "Try Again" button re-triggers the signing flow

---

### 36. ForwardRequest Nonce Stale

**Scenario**: User's forwarder nonce changes between building and submitting (another tx confirmed in between).

**Current handling**:
- Nonce is fetched fresh before each signing
- If stale, Relayr simulation fails, transaction marked failed

**Mitigations**:
- Client fetches nonce right before signing (not on page load)
- Backend also fetches fresh nonce for managed users
- Retry with updated nonce on nonce-related failures

---

## Summary: Priority Actions

### Addressed in Spec

1. **Confirmation code on success screen** - Added to SCREENS.md
2. **Store name + activity + ID in payment confirmation** - Added to SCREENS.md
3. **Team member removal is instant** - Server-side revocation
4. **Offline handling for terminals** - Covered in HARDWARE.md
5. **Idempotency on payments** - Architecture requirement
6. **Backup owner mechanism** - Added to data model + SCREENS.md
7. **Transaction export** - Added to SCREENS.md
8. **Cross-chain consolidation** - Added to ARCHITECTURE.md + SCREENS.md

### Still Needed (Implementation)

9. **Dust balance handling** (UX: hide <$0.01, aggregate as "Other")
10. **Transaction limits** (policy decision deferred)

### Intentionally Not Doing

11. Refund flow - Payments are final
12. Multi-currency display - USD only for simplicity
13. Anonymous payment mode - Default shows name, user can disable in settings

---

## Resolved Decisions

1. **Refunds**: No. Payments are final. Merchants handle disputes offline.

2. **Loan repayment**: No repayment needed. Taking a loan IS the cash out. If collateral appreciates, bonus grows. If it drops, user keeps what they borrowed.

3. **Cross-chain**: Accept limitation. User can manually consolidate via button. Auto-consolidate overnight for managed wallets.

4. **Backup owner**: Via email-based accounts. Owner can designate backup who can claim ownership after 90 days of owner inactivity.

5. **Store verification**: Show store name + activity count + project ID on payment confirmation screen.

6. **Confirmation codes**: 6-character alphanumeric on success screen. Staff can verify if notification missed.

## Remaining Open Questions

1. **Transaction limits**: What thresholds? Do we require KYC? *(Defer - not blocking for MVP)*
2. **Store closure**: Auto-hide after 90 days of inactivity? *(Defer)*
