# CocoPay Analytics Events

> Track everything. Every user action, every system event, every outcome.

---

## Philosophy

**Track everything by default.** Storage is cheap, insights are valuable. We can always filter later, but we can't go back and capture events we didn't track.

**Privacy-conscious:** No PII in event properties. Use IDs, not names/phones.

---

## Event Schema

```json
{
  "event_name": "payment_completed",
  "timestamp": "2026-02-16T14:34:00Z",
  "user_id": "user_123",
  "session_id": "sess_456",
  "device_id": "device_789",
  "properties": {
    "amount_usd": 45.00,
    "store_id": "store_abc",
    "chain_id": 8453,
    "payment_method": "mixed",
    "tokens_used_count": 3
  },
  "context": {
    "app_version": "1.2.3",
    "platform": "ios",
    "os_version": "17.2",
    "locale": "pt-BR",
    "timezone": "America/Sao_Paulo"
  }
}
```

---

## User Lifecycle Events

### Acquisition

| Event | When | Properties |
|-------|------|------------|
| `app_opened` | App launched | `is_first_open`, `source` |
| `onboarding_started` | Tapped "Get Started" | - |
| `phone_entered` | Submitted phone number | `country_code` |
| `otp_requested` | OTP sent | - |
| `otp_verified` | OTP correct | `attempts` |
| `otp_failed` | OTP incorrect | `attempts`, `error_code` |
| `account_created` | New user registered | `auth_method` |
| `onboarding_completed` | Finished onboarding | `duration_seconds` |

### Activation

| Event | When | Properties |
|-------|------|------------|
| `first_payment_started` | Started first payment | `store_id` |
| `first_payment_completed` | Completed first payment | `amount_usd`, `store_id` |
| `passkey_registered` | Added passkey | `device_type` |
| `wallet_linked` | Smart account linked | `chain_id` |

### Engagement

| Event | When | Properties |
|-------|------|------------|
| `session_started` | App opened (returning) | `days_since_last_session` |
| `balance_viewed` | Viewed balance | `total_usd` |
| `balance_expanded` | Expanded breakdown | `token_count` |
| `store_viewed` | Viewed store details | `store_id`, `source` |
| `explore_opened` | Opened explore tab | - |
| `map_interacted` | Moved/zoomed map | - |
| `search_performed` | Searched stores | `query`, `results_count` |

### Revenue (Payments)

| Event | When | Properties |
|-------|------|------------|
| `payment_started` | Initiated payment | `store_id`, `entry_method` |
| `payment_amount_entered` | Entered amount | `amount_usd` |
| `payment_previewed` | Viewed preview | `amount_usd`, `tokens_used_count`, `rewards_usd` |
| `payment_confirmed` | Confirmed payment | `amount_usd`, `store_id`, `chain_id` |
| `payment_completed` | Payment successful | `amount_usd`, `store_id`, `duration_seconds`, `bundle_id` |
| `payment_failed` | Payment failed | `error_code`, `error_message`, `amount_usd` |
| `payment_cancelled` | User cancelled | `step`, `amount_usd` |
| `rewards_earned` | Earned rewards | `amount_usd`, `store_id` |

### Revenue (Bonus/Loans)

| Event | When | Properties |
|-------|------|------------|
| `bonus_viewed` | Viewed available bonus | `amount_usd` |
| `bonus_claim_started` | Started claim flow | `amount_usd` |
| `bonus_claim_completed` | Claimed bonus | `amount_usd`, `loan_id` |
| `bonus_claim_failed` | Claim failed | `error_code`, `amount_usd` |

### Merchant Events

| Event | When | Properties |
|-------|------|------------|
| `store_creation_started` | Started creating store | - |
| `store_creation_completed` | Store created | `store_id`, `category` |
| `store_deployment_started` | Revnet deploying | `store_id`, `chains` |
| `store_deployment_completed` | Revnet deployed | `store_id`, `chains`, `duration_seconds` |
| `store_deployment_failed` | Deployment failed | `store_id`, `error_code` |
| `merchant_dashboard_viewed` | Viewed dashboard | `store_id`, `today_sales_usd` |
| `merchant_qr_displayed` | Showed QR code | `store_id` |
| `merchant_qr_downloaded` | Downloaded QR | `store_id`, `format` |
| `team_member_invited` | Invited team member | `store_id`, `role` |
| `team_member_removed` | Removed team member | `store_id`, `role` |
| `payout_requested` | Requested payout | `store_id`, `amount_usd`, `destination_type` |
| `payout_completed` | Payout completed | `store_id`, `amount_usd` |
| `payout_failed` | Payout failed | `store_id`, `error_code` |

### Consolidation

| Event | When | Properties |
|-------|------|------------|
| `consolidation_previewed` | Viewed consolidation | `from_chain`, `to_chain`, `amount_usd` |
| `consolidation_started` | Started consolidation | `from_chain`, `to_chain`, `amount_usd` |
| `consolidation_completed` | Consolidation done | `from_chain`, `to_chain`, `amount_usd`, `duration_seconds` |
| `consolidation_failed` | Consolidation failed | `error_code` |

### Settings & Profile

| Event | When | Properties |
|-------|------|------------|
| `settings_opened` | Opened settings | - |
| `profile_updated` | Updated profile | `fields_updated` |
| `backup_owner_set` | Set backup owner | - |
| `passkey_added` | Added new passkey | `device_type` |
| `passkey_removed` | Removed passkey | - |
| `session_logged_out` | Logged out | - |
| `account_deleted` | Deleted account | - |

### Errors & Issues

| Event | When | Properties |
|-------|------|------------|
| `error_displayed` | Error shown to user | `error_code`, `screen`, `message` |
| `error_dismissed` | User dismissed error | `error_code`, `action` |
| `retry_attempted` | User retried action | `action`, `attempt_number` |
| `support_contacted` | Opened support | `source` |
| `crash_detected` | App crashed | `screen`, `error` |

---

## System Events (Backend)

### Authentication

| Event | When | Properties |
|-------|------|------------|
| `auth.otp_sent` | OTP SMS sent | `phone_hash`, `provider` |
| `auth.otp_verified` | OTP verified | `user_id` |
| `auth.session_created` | Session created | `user_id`, `auth_method` |
| `auth.session_expired` | Session expired | `user_id` |
| `auth.session_revoked` | Session revoked | `user_id`, `reason` |

### Blockchain

| Event | When | Properties |
|-------|------|------------|
| `blockchain.smart_account_computed` | Address computed | `user_id`, `chain_id`, `address` |
| `blockchain.smart_account_deployed` | Account deployed | `user_id`, `chain_id`, `tx_hash` |
| `blockchain.bundle_submitted` | Relayr bundle sent | `bundle_id`, `tx_count`, `chains` |
| `blockchain.bundle_confirmed` | Bundle confirmed | `bundle_id`, `duration_seconds` |
| `blockchain.bundle_failed` | Bundle failed | `bundle_id`, `error` |
| `blockchain.rpc_error` | RPC call failed | `chain_id`, `method`, `error` |
| `blockchain.balance_synced` | Balance updated | `user_id`, `chain_id`, `balance_change` |

### Store Operations

| Event | When | Properties |
|-------|------|------------|
| `store.revnet_deployed` | Revnet deployed | `store_id`, `chain_id`, `project_id` |
| `store.payment_received` | Payment received | `store_id`, `amount_usd`, `tx_id` |
| `store.payout_processed` | Payout processed | `store_id`, `amount_usd`, `destination` |

### Loans

| Event | When | Properties |
|-------|------|------------|
| `loan.originated` | Loan created | `user_id`, `loan_id`, `amount_usd`, `collateral_usd` |
| `loan.refinanced` | Loan refinanced | `user_id`, `loan_id`, `additional_usd` |
| `loan.repaid` | Loan repaid | `user_id`, `loan_id` |

### Infrastructure

| Event | When | Properties |
|-------|------|------------|
| `infra.deploy_started` | Deployment started | `version`, `environment` |
| `infra.deploy_completed` | Deployment done | `version`, `duration_seconds` |
| `infra.migration_run` | Migration executed | `version`, `direction` |
| `infra.job_failed` | Background job failed | `job_class`, `error` |

---

## Metrics & Aggregations

### Key Performance Indicators (KPIs)

| Metric | Calculation | Target |
|--------|-------------|--------|
| **DAU** | Unique users with `session_started` | Growth |
| **WAU** | Unique users with `session_started` (7d) | Growth |
| **MAU** | Unique users with `session_started` (30d) | Growth |
| **Activation Rate** | `first_payment_completed` / `account_created` | > 50% |
| **Payment Success Rate** | `payment_completed` / `payment_confirmed` | > 98% |
| **Avg Payment Value** | Sum(`amount_usd`) / Count(`payment_completed`) | Monitor |
| **Revenue (GMV)** | Sum(`amount_usd`) from `payment_completed` | Growth |
| **Merchant Activation** | `store_deployment_completed` / `store_creation_started` | > 80% |

### Funnel Analysis

**Onboarding Funnel:**
```
app_opened
  → onboarding_started
    → phone_entered
      → otp_verified
        → account_created
          → first_payment_completed
```

**Payment Funnel:**
```
payment_started
  → payment_amount_entered
    → payment_previewed
      → payment_confirmed
        → payment_completed
```

**Store Creation Funnel:**
```
store_creation_started
  → store_creation_completed
    → store_deployment_started
      → store_deployment_completed
        → first_payment_received
```

---

## Implementation

### Backend (Rails)

```ruby
# app/services/analytics_service.rb
class AnalyticsService
  def self.track(event_name, user: nil, properties: {})
    event = AnalyticsEvent.create!(
      event_name: event_name,
      user_id: user&.id,
      session_id: Current.session_id,
      properties: properties,
      ip_address: Current.ip_address,
      user_agent: Current.user_agent
    )

    # Async broadcast to analytics pipeline
    AnalyticsBroadcastJob.perform_later(event.id)
  end
end

# Usage in controllers/services
AnalyticsService.track('payment_completed',
  user: current_user,
  properties: {
    amount_usd: payment.amount_usd,
    store_id: payment.store_id,
    chain_id: payment.chain_id,
    duration_seconds: (Time.current - payment.created_at).to_i
  }
)
```

### Mobile (React Native)

```typescript
// src/services/analytics.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

class Analytics {
  private deviceId: string | null = null
  private sessionId: string | null = null

  async init() {
    this.deviceId = await this.getOrCreateDeviceId()
    this.sessionId = this.generateSessionId()
  }

  track(eventName: string, properties: Record<string, any> = {}) {
    const event = {
      event_name: eventName,
      timestamp: new Date().toISOString(),
      device_id: this.deviceId,
      session_id: this.sessionId,
      properties,
      context: {
        app_version: Constants.expoConfig?.version,
        platform: Platform.OS,
        os_version: Platform.Version,
        locale: getLocales()[0]?.languageTag,
      }
    }

    // Queue for batch sending
    this.queue.push(event)
    this.flushIfNeeded()
  }

  private async flush() {
    const events = this.queue.splice(0, 100)
    if (events.length === 0) return

    try {
      await api.post('/analytics/events', { events })
    } catch (error) {
      // Re-queue on failure
      this.queue.unshift(...events)
    }
  }
}

export const analytics = new Analytics()

// Usage
analytics.track('payment_completed', {
  amount_usd: 45.00,
  store_id: 'store_123',
  chain_id: 8453,
})
```

### Event Ingestion API

```ruby
# app/controllers/api/v1/analytics_controller.rb
class Api::V1::AnalyticsController < ApplicationController
  skip_before_action :authenticate!, only: [:create]

  def create
    events = params[:events]

    events.each do |event_params|
      AnalyticsEvent.create!(
        event_name: event_params[:event_name],
        user_id: current_user&.id,
        session_id: event_params[:session_id],
        device_id: event_params[:device_id],
        properties: event_params[:properties] || {},
        created_at: event_params[:timestamp]
      )
    end

    head :created
  end
end
```

---

## Data Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Mobile    │────▶│   API       │────▶│  PostgreSQL │
│   Events    │     │   /analytics│     │  analytics_ │
└─────────────┘     └─────────────┘     │  events     │
                                        └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │   Nightly   │
                                        │   ETL Job   │
                                        └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
             ┌──────▼──────┐           ┌──────▼──────┐           ┌──────▼──────┐
             │  Aggregated │           │  Data       │           │  Alerts     │
             │  Metrics    │           │  Warehouse  │           │  (Anomaly)  │
             │  (Redis)    │           │  (Future)   │           │             │
             └─────────────┘           └─────────────┘           └─────────────┘
```

### Future: Data Warehouse

When scale requires:
- Export to BigQuery/Snowflake
- Build dashboards in Metabase/Looker
- ML models for churn prediction, fraud detection

---

## Privacy & Compliance

### Data Retention

| Data Type | Retention | Notes |
|-----------|-----------|-------|
| Raw events | 90 days | Then aggregated |
| Aggregated metrics | 2 years | For trends |
| User-level data | Until deletion | LGPD compliance |

### PII Handling

**Never track:**
- Phone numbers (use `user_id`)
- Names
- Addresses
- Exact location (use `store_id`)

**Hash if needed:**
- `phone_hash` for debugging (SHA-256)

### User Rights (LGPD)

- Export all events for a user
- Delete all events for a user
- Opt-out of analytics (honor `Do Not Track`)
