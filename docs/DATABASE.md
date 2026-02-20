# CocoPay Database Schema

> PostgreSQL 16 schema with all tables, indexes, and constraints

---

## Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │────<│   stores    │────<│  payments   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │            ┌──────┴──────┐            │
       │            │             │            │
       ▼            ▼             ▼            ▼
┌─────────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
│smart_accounts│ │store_   │ │store_    │ │token_    │
└─────────────┘ │members  │ │payouts   │ │balances  │
                └─────────┘ └──────────┘ └──────────┘
```

---

## Enums

```sql
-- User authentication methods
CREATE TYPE auth_method AS ENUM ('phone', 'passkey', 'wallet');

-- Store team roles
CREATE TYPE store_role AS ENUM ('owner', 'admin', 'staff');

-- Transaction types
CREATE TYPE transaction_type AS ENUM ('payment', 'received', 'bonus_claim', 'payout', 'consolidation');

-- Transaction status
CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'failed');

-- Deployment status for stores
CREATE TYPE deployment_status AS ENUM ('pending', 'deploying', 'deployed', 'failed');

-- Payout destinations
CREATE TYPE payout_type AS ENUM ('pix', 'bank', 'wallet');

-- Payout status
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Smart account custody status
CREATE TYPE custody_status AS ENUM ('managed', 'self_custody');

-- Supported chains
CREATE TYPE chain_id AS ENUM ('1', '10', '8453', '42161', '11155111', '11155420', '84532', '421614');
```

---

## Tables

### users

Primary user table for both customers and merchants.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  phone VARCHAR(20) UNIQUE NOT NULL,
  phone_verified_at TIMESTAMPTZ,
  name VARCHAR(255),
  email VARCHAR(255),

  -- Recovery
  backup_owner_phone VARCHAR(20),
  backup_owner_activated_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),

  -- Preferences
  preferred_chain_id chain_id DEFAULT '8453',
  locale VARCHAR(10) DEFAULT 'pt-BR',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_last_active ON users(last_active_at);
```

---

### sessions

Active user sessions (JWT tracking).

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Session data
  token_hash VARCHAR(64) NOT NULL,  -- SHA-256 of JWT
  auth_method auth_method NOT NULL,
  device_info JSONB,  -- { platform, os, app_version }
  ip_address INET,

  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE revoked_at IS NULL;
```

---

### passkeys

WebAuthn passkey credentials.

```sql
CREATE TABLE passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- WebAuthn data
  credential_id VARCHAR(512) UNIQUE NOT NULL,
  public_key BYTEA NOT NULL,
  sign_count BIGINT NOT NULL DEFAULT 0,

  -- Derived wallet
  derived_address VARCHAR(42),  -- EOA from PRF

  -- Metadata
  device_name VARCHAR(255),
  last_used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_passkeys_user ON passkeys(user_id);
CREATE INDEX idx_passkeys_credential ON passkeys(credential_id);
```

---

### smart_accounts

ERC-4337 smart accounts per user per chain.

```sql
CREATE TABLE smart_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Account data
  chain_id chain_id NOT NULL,
  address VARCHAR(42) NOT NULL,
  salt VARCHAR(66) NOT NULL,  -- Deterministic salt

  -- Ownership
  owner_address VARCHAR(42) NOT NULL,  -- Reserves EOA or user's EOA
  custody_status custody_status NOT NULL DEFAULT 'managed',

  -- Deployment
  deployed BOOLEAN NOT NULL DEFAULT FALSE,
  deploy_tx_hash VARCHAR(66),
  deployed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, chain_id),
  UNIQUE(chain_id, address)
);

CREATE INDEX idx_smart_accounts_user ON smart_accounts(user_id);
CREATE INDEX idx_smart_accounts_address ON smart_accounts(address);
```

---

### signing_keys

Encrypted signing keys for managed wallets.

```sql
CREATE TABLE signing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Key data (encrypted)
  encrypted_private_key TEXT NOT NULL,  -- AES-256-GCM encrypted
  address VARCHAR(42) NOT NULL,  -- Derived address for verification

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, is_active) WHERE is_active = TRUE
);

CREATE INDEX idx_signing_keys_user ON signing_keys(user_id) WHERE is_active = TRUE;
```

---

### stores

Merchant stores (each is a revnet).

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  category VARCHAR(100),
  description TEXT,

  -- Location
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,

  -- Revnet data (per chain)
  deployment_status deployment_status NOT NULL DEFAULT 'pending',

  -- Links
  website VARCHAR(255),
  instagram VARCHAR(100),

  -- QR code
  qr_code_url VARCHAR(255),
  short_code VARCHAR(20) UNIQUE,  -- For manual entry

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stores_symbol ON stores(symbol);
CREATE INDEX idx_stores_short_code ON stores(short_code);
CREATE INDEX idx_stores_location ON stores USING GIST (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL;
```

---

### store_deployments

Revnet deployment status per chain.

```sql
CREATE TABLE store_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- Chain data
  chain_id chain_id NOT NULL,

  -- Revnet data
  project_id INTEGER,
  token_address VARCHAR(42),
  terminal_address VARCHAR(42),

  -- Deployment
  status deployment_status NOT NULL DEFAULT 'pending',
  bundle_id VARCHAR(255),
  deploy_tx_hash VARCHAR(66),
  error_message TEXT,

  -- Timestamps
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(store_id, chain_id)
);

CREATE INDEX idx_store_deployments_store ON store_deployments(store_id);
CREATE INDEX idx_store_deployments_token ON store_deployments(token_address);
```

---

### store_members

Team membership for stores.

```sql
CREATE TABLE store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Role
  role store_role NOT NULL,

  -- Invitation
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(store_id, user_id)
);

CREATE INDEX idx_store_members_store ON store_members(store_id);
CREATE INDEX idx_store_members_user ON store_members(user_id);
```

---

### token_balances

Cached token balances (updated via blockchain events).

```sql
CREATE TABLE token_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Token data
  chain_id chain_id NOT NULL,
  token_address VARCHAR(42) NOT NULL,  -- '0x0' for native, USDC address, or store token
  store_id UUID REFERENCES stores(id),  -- NULL for USDC

  -- Balance
  balance NUMERIC(78, 0) NOT NULL DEFAULT 0,  -- Wei precision
  balance_usd NUMERIC(18, 6) NOT NULL DEFAULT 0,  -- Cached USD value

  -- Last update
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_block BIGINT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, chain_id, token_address)
);

CREATE INDEX idx_token_balances_user ON token_balances(user_id);
CREATE INDEX idx_token_balances_store ON token_balances(store_id) WHERE store_id IS NOT NULL;
CREATE INDEX idx_token_balances_sync ON token_balances(last_synced_at);
```

---

### transactions

All payment transactions.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parties
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  store_id UUID REFERENCES stores(id),

  -- Type and status
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',

  -- Amounts
  amount_usd NUMERIC(18, 6) NOT NULL,

  -- Token breakdown (JSONB for flexibility)
  tokens_used JSONB,  -- [{ token_address, amount, amount_usd, store_id }]
  rewards_earned JSONB,  -- { token_address, amount, amount_usd, store_id }

  -- Blockchain
  chain_id chain_id NOT NULL,
  bundle_id VARCHAR(255),
  tx_hash VARCHAR(66),
  block_number BIGINT,

  -- Confirmation
  confirmation_code VARCHAR(6),  -- A7B3C9

  -- Error handling
  error_code VARCHAR(50),
  error_message TEXT,

  -- Idempotency
  idempotency_key VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,

  UNIQUE(idempotency_key) WHERE idempotency_key IS NOT NULL
);

CREATE INDEX idx_transactions_from_user ON transactions(from_user_id);
CREATE INDEX idx_transactions_to_user ON transactions(to_user_id);
CREATE INDEX idx_transactions_store ON transactions(store_id);
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status = 'pending';
CREATE INDEX idx_transactions_confirmation ON transactions(confirmation_code);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_bundle ON transactions(bundle_id);
```

---

### loans

REVLoans tracking.

```sql
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Loan data
  chain_id chain_id NOT NULL,
  loan_id_onchain NUMERIC(78, 0) NOT NULL,  -- ERC-721 token ID

  -- Amounts
  collateral NUMERIC(78, 0) NOT NULL,  -- Tokens burned
  collateral_usd_at_origination NUMERIC(18, 6) NOT NULL,
  borrow_amount NUMERIC(78, 0) NOT NULL,
  borrow_amount_usd NUMERIC(18, 6) NOT NULL,

  -- Terms
  prepaid_fee_percent INTEGER NOT NULL,  -- Basis points
  prepaid_duration_seconds BIGINT NOT NULL,

  -- Project
  project_id INTEGER NOT NULL,
  token_address VARCHAR(42) NOT NULL,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  repaid_at TIMESTAMPTZ,

  -- Blockchain
  origination_tx_hash VARCHAR(66) NOT NULL,
  repayment_tx_hash VARCHAR(66),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(chain_id, loan_id_onchain)
);

CREATE INDEX idx_loans_user ON loans(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_loans_project ON loans(project_id);
```

---

### payouts

Store payouts to external accounts.

```sql
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),

  -- Amount
  amount_usd NUMERIC(18, 6) NOT NULL,
  fee_usd NUMERIC(18, 6) NOT NULL DEFAULT 0,

  -- Destination
  payout_type payout_type NOT NULL,
  destination JSONB NOT NULL,  -- { pix_key, bank_account, wallet_address }

  -- Status
  status payout_status NOT NULL DEFAULT 'pending',

  -- Processing
  external_id VARCHAR(255),  -- PIX transaction ID, etc.
  processed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_store ON payouts(store_id);
CREATE INDEX idx_payouts_status ON payouts(status) WHERE status IN ('pending', 'processing');
```

---

### analytics_events

Raw analytics events for tracking.

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event data
  event_name VARCHAR(100) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',

  -- Context
  user_id UUID REFERENCES users(id),
  session_id UUID,
  device_id VARCHAR(255),

  -- Request context
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition by month for performance
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
```

---

### feature_flags

Feature flag configuration.

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Flag data
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,

  -- State
  enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- Targeting
  rules JSONB NOT NULL DEFAULT '[]',  -- [{ type: 'user_id', values: [...] }, { type: 'percentage', value: 10 }]

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_name ON feature_flags(name);
```

---

### audit_logs

Security audit trail.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,

  -- Action
  action VARCHAR(100) NOT NULL,  -- 'login', 'payment', 'payout', etc.
  resource_type VARCHAR(50),  -- 'user', 'store', 'transaction'
  resource_id UUID,

  -- Data
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

---

## Materialized Views

### store_daily_stats

Daily aggregated stats for stores.

```sql
CREATE MATERIALIZED VIEW store_daily_stats AS
SELECT
  store_id,
  DATE(created_at) AS date,
  COUNT(*) AS transaction_count,
  SUM(amount_usd) AS revenue_usd,
  COUNT(DISTINCT from_user_id) AS unique_customers,
  AVG(amount_usd) AS avg_transaction_usd
FROM transactions
WHERE type = 'payment'
  AND status = 'confirmed'
  AND store_id IS NOT NULL
GROUP BY store_id, DATE(created_at);

CREATE UNIQUE INDEX idx_store_daily_stats ON store_daily_stats(store_id, date);

-- Refresh daily via cron job
-- REFRESH MATERIALIZED VIEW CONCURRENTLY store_daily_stats;
```

---

## Functions

### generate_confirmation_code

Generate unique 6-character alphanumeric code.

```sql
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- No I, O, 0, 1
  result VARCHAR := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### update_updated_at

Auto-update updated_at timestamp.

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_token_balances_updated_at
  BEFORE UPDATE ON token_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Extensions

```sql
-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "earthdistance"; -- Geolocation queries
CREATE EXTENSION IF NOT EXISTS "cube";          -- Required by earthdistance
```

---

## Migration Order

1. Extensions
2. Enums
3. users
4. sessions
5. passkeys
6. smart_accounts
7. signing_keys
8. stores
9. store_deployments
10. store_members
11. token_balances
12. transactions
13. loans
14. payouts
15. analytics_events
16. feature_flags
17. audit_logs
18. Functions and triggers
19. Materialized views
