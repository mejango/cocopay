# CocoPay Environment Variables

> All required environment variables for local, staging, and production

---

## Quick Reference

| Category | Required | Secrets |
|----------|----------|---------|
| Database | 2 | 1 |
| Redis | 1 | 0 |
| Authentication | 2 | 2 |
| Blockchain | 4 | 2 |
| External Services | 3 | 1 |
| Feature Flags | 1 | 0 |
| Monitoring | 2 | 1 |
| **Total** | **15** | **7** |

---

## Variables by Category

### Database

```bash
# PostgreSQL connection string
# Format: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://cocopay:password@localhost:5432/cocopay_development

# Connection pool size (default: 5)
DATABASE_POOL_SIZE=5
```

| Variable | Required | Secret | Example |
|----------|----------|--------|---------|
| `DATABASE_URL` | Yes | Yes | `postgresql://...` |
| `DATABASE_POOL_SIZE` | No | No | `5` |

---

### Redis

```bash
# Redis connection string
# Format: redis://[:password@]host:port[/db]
REDIS_URL=redis://localhost:6379/0
```

| Variable | Required | Secret | Example |
|----------|----------|--------|---------|
| `REDIS_URL` | Yes | No | `redis://localhost:6379` |

---

### Authentication

```bash
# JWT signing secret (min 64 characters)
# Generate: openssl rand -hex 32
JWT_SECRET=your-64-char-secret-here

# Encryption key for signing keys stored in DB
# Generate: openssl rand -hex 32
ENCRYPTION_KEY=your-64-char-encryption-key

# JWT expiry in seconds (default: 30 days)
JWT_EXPIRY_SECONDS=2592000

# OTP expiry in seconds (default: 5 minutes)
OTP_EXPIRY_SECONDS=300
```

| Variable | Required | Secret | Example |
|----------|----------|--------|---------|
| `JWT_SECRET` | Yes | Yes | 64-char hex |
| `ENCRYPTION_KEY` | Yes | Yes | 64-char hex |
| `JWT_EXPIRY_SECONDS` | No | No | `2592000` |
| `OTP_EXPIRY_SECONDS` | No | No | `300` |

---

### Blockchain

```bash
# Environment: 'sepolia' or 'mainnet'
CHAIN_ENV=sepolia

# Alchemy API key for RPC access
ALCHEMY_API_KEY=your-alchemy-api-key

# Reserves wallet private key (controls all smart accounts)
# CRITICAL: Use KMS in production
RESERVES_PRIVATE_KEY=0x...

# Contract addresses (same on all chains)
SIMPLE_ACCOUNT_FACTORY=0x69a05d911af23501ff9d6b811a97cac972dade05
ENTRY_POINT=0x0000000071727De22E5E9d8BAf0edAc6f37da032

# Optional: Override RPC URLs (comma-separated chainId:url)
RPC_OVERRIDES=8453:https://base-mainnet.g.alchemy.com/v2/xxx
```

| Variable | Required | Secret | Example |
|----------|----------|--------|---------|
| `CHAIN_ENV` | Yes | No | `sepolia` |
| `ALCHEMY_API_KEY` | Yes | Yes | API key |
| `RESERVES_PRIVATE_KEY` | Yes | Yes | `0x...` |
| `SIMPLE_ACCOUNT_FACTORY` | Yes | No | `0x69a05...` |
| `ENTRY_POINT` | Yes | No | `0x000000...` |
| `RPC_OVERRIDES` | No | No | `chainId:url,...` |

---

### Relayr

```bash
# Relayr API base URL
RELAYR_API_URL=https://api.relayr.ba5ed.com

# No API key needed (permissionless)
```

| Variable | Required | Secret | Example |
|----------|----------|--------|---------|
| `RELAYR_API_URL` | Yes | No | `https://api.relayr...` |

---

### SMS (OTP)

```bash
# Twilio credentials for SMS OTP
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+15551234567

# Or use local development mode (logs OTP to console)
SMS_PROVIDER=console  # 'twilio' or 'console'
```

| Variable | Required | Secret | Example |
|----------|----------|--------|---------|
| `SMS_PROVIDER` | Yes | No | `twilio` |
| `TWILIO_ACCOUNT_SID` | Prod | Yes | `ACxxx...` |
| `TWILIO_AUTH_TOKEN` | Prod | Yes | Auth token |
| `TWILIO_PHONE_NUMBER` | Prod | No | `+15551234567` |

---

### PIX Payouts

```bash
# PIX provider (for store payouts)
PIX_PROVIDER=sandbox  # 'sandbox', 'bank_api'

# Production: Bank API credentials
PIX_API_URL=https://api.bank.com/pix
PIX_API_KEY=your-api-key
PIX_CERT_PATH=/path/to/cert.pem
```

| Variable | Required | Secret | Example |
|----------|----------|--------|---------|
| `PIX_PROVIDER` | Yes | No | `sandbox` |
| `PIX_API_URL` | Prod | No | Bank API URL |
| `PIX_API_KEY` | Prod | Yes | API key |
| `PIX_CERT_PATH` | Prod | No | File path |

---

### Feature Flags

```bash
# Default feature flag state (development convenience)
FEATURE_FLAGS_DEFAULT=true  # Enable all flags in dev

# Specific flag overrides (comma-separated)
FEATURE_FLAGS_ENABLED=voice_ordering,ai_insights
FEATURE_FLAGS_DISABLED=hardware_terminal
```

| Variable | Required | Secret | Example |
|----------|----------|--------|---------|
| `FEATURE_FLAGS_DEFAULT` | No | No | `true` |
| `FEATURE_FLAGS_ENABLED` | No | No | `flag1,flag2` |
| `FEATURE_FLAGS_DISABLED` | No | No | `flag1,flag2` |

---

### Monitoring & Logging

```bash
# Log level: debug, info, warn, error
LOG_LEVEL=info

# Sentry DSN for error tracking
SENTRY_DSN=https://xxx@sentry.io/xxx

# Datadog (optional)
DD_API_KEY=your-datadog-key
DD_APP_KEY=your-datadog-app-key

# Health check endpoint secret (optional)
HEALTH_CHECK_TOKEN=secret-for-deep-health-checks
```

| Variable | Required | Secret | Example |
|----------|----------|--------|---------|
| `LOG_LEVEL` | No | No | `info` |
| `SENTRY_DSN` | Prod | No | Sentry URL |
| `DD_API_KEY` | No | Yes | Datadog key |
| `HEALTH_CHECK_TOKEN` | No | Yes | Secret |

---

### Application

```bash
# Rails environment
RAILS_ENV=development

# Application host (for URL generation)
APP_HOST=localhost:3000

# Web app URL (for CORS, links)
WEB_APP_URL=http://localhost:5173

# Payment page URL
PAYMENT_PAGE_URL=https://pay.cocopay.app

# Force SSL in production
FORCE_SSL=true

# Allowed origins for CORS (comma-separated)
CORS_ORIGINS=http://localhost:5173,https://cocopay.app
```

| Variable | Required | Secret | Example |
|----------|----------|--------|---------|
| `RAILS_ENV` | Yes | No | `production` |
| `APP_HOST` | Yes | No | `api.cocopay.app` |
| `WEB_APP_URL` | Yes | No | `https://cocopay.app` |
| `PAYMENT_PAGE_URL` | Yes | No | `https://pay.cocopay.app` |
| `FORCE_SSL` | No | No | `true` |
| `CORS_ORIGINS` | Yes | No | URLs |

---

## Environment Files

### Local Development

```bash
# .env.development (gitignored)

# Database
DATABASE_URL=postgresql://cocopay:cocopay@localhost:5432/cocopay_development

# Redis
REDIS_URL=redis://localhost:6379/0

# Auth (generate your own)
JWT_SECRET=dev-secret-at-least-64-characters-long-for-security-purposes-here
ENCRYPTION_KEY=dev-encryption-key-at-least-64-characters-long-for-security

# Blockchain (Sepolia testnet)
CHAIN_ENV=sepolia
ALCHEMY_API_KEY=your-alchemy-key
RESERVES_PRIVATE_KEY=0x-your-testnet-private-key

# Contracts
SIMPLE_ACCOUNT_FACTORY=0x69a05d911af23501ff9d6b811a97cac972dade05
ENTRY_POINT=0x0000000071727De22E5E9d8BAf0edAc6f37da032

# Relayr
RELAYR_API_URL=https://api.relayr.ba5ed.com

# SMS (development)
SMS_PROVIDER=console

# PIX (development)
PIX_PROVIDER=sandbox

# Application
RAILS_ENV=development
APP_HOST=localhost:3000
WEB_APP_URL=http://localhost:5173
PAYMENT_PAGE_URL=http://localhost:5173/pay
CORS_ORIGINS=http://localhost:5173,http://localhost:19006

# Monitoring
LOG_LEVEL=debug
```

### Staging

```bash
# Railway environment variables (staging)

DATABASE_URL=postgresql://...railway.app...
REDIS_URL=redis://...railway.app...

JWT_SECRET=staging-secret-from-railway-secrets
ENCRYPTION_KEY=staging-encryption-from-railway-secrets

CHAIN_ENV=sepolia
ALCHEMY_API_KEY=alchemy-key
RESERVES_PRIVATE_KEY=staging-testnet-key

SIMPLE_ACCOUNT_FACTORY=0x69a05d911af23501ff9d6b811a97cac972dade05
ENTRY_POINT=0x0000000071727De22E5E9d8BAf0edAc6f37da032

RELAYR_API_URL=https://api.relayr.ba5ed.com

SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+15551234567

PIX_PROVIDER=sandbox

RAILS_ENV=staging
APP_HOST=api-staging.cocopay.app
WEB_APP_URL=https://staging.cocopay.app
PAYMENT_PAGE_URL=https://pay-staging.cocopay.app
FORCE_SSL=true
CORS_ORIGINS=https://staging.cocopay.app

LOG_LEVEL=info
SENTRY_DSN=https://xxx@sentry.io/staging
```

### Production

```bash
# Railway environment variables (production)
# CRITICAL: Use Railway's secret management for sensitive values

DATABASE_URL=postgresql://...railway.app...
REDIS_URL=redis://...railway.app...

# Secrets via Railway KMS
JWT_SECRET={{RAILWAY_SECRET_JWT}}
ENCRYPTION_KEY={{RAILWAY_SECRET_ENCRYPTION}}
RESERVES_PRIVATE_KEY={{RAILWAY_SECRET_RESERVES_KEY}}  # CRITICAL: KMS

CHAIN_ENV=mainnet
ALCHEMY_API_KEY={{RAILWAY_SECRET_ALCHEMY}}

SIMPLE_ACCOUNT_FACTORY=0x69a05d911af23501ff9d6b811a97cac972dade05
ENTRY_POINT=0x0000000071727De22E5E9d8BAf0edAc6f37da032

RELAYR_API_URL=https://api.relayr.ba5ed.com

SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID={{RAILWAY_SECRET_TWILIO_SID}}
TWILIO_AUTH_TOKEN={{RAILWAY_SECRET_TWILIO_TOKEN}}
TWILIO_PHONE_NUMBER=+5548xxxxx

PIX_PROVIDER=bank_api
PIX_API_URL=https://api.bank.com/pix
PIX_API_KEY={{RAILWAY_SECRET_PIX_KEY}}

RAILS_ENV=production
APP_HOST=api.cocopay.app
WEB_APP_URL=https://cocopay.app
PAYMENT_PAGE_URL=https://pay.cocopay.app
FORCE_SSL=true
CORS_ORIGINS=https://cocopay.app,https://pay.cocopay.app

LOG_LEVEL=info
SENTRY_DSN=https://xxx@sentry.io/production
```

---

## Mobile App Environment

```typescript
// apps/mobile/src/config/env.ts

export const ENV = {
  // API
  API_URL: __DEV__
    ? 'http://localhost:3000/api/v1'
    : 'https://api.cocopay.app/api/v1',

  // WebSocket
  WS_URL: __DEV__
    ? 'ws://localhost:3000/cable'
    : 'wss://api.cocopay.app/cable',

  // Blockchain
  CHAIN_ENV: __DEV__ ? 'sepolia' : 'mainnet',

  // Alchemy (public, rate-limited)
  ALCHEMY_API_KEY: 'public-key-for-read-only',

  // Sentry
  SENTRY_DSN: 'https://xxx@sentry.io/mobile',
}
```

---

## Secrets Rotation

| Secret | Rotation Frequency | Procedure |
|--------|-------------------|-----------|
| `JWT_SECRET` | Quarterly | Deploy new secret, old tokens expire naturally |
| `ENCRYPTION_KEY` | Never* | Re-encrypt all signing_keys if rotated |
| `RESERVES_PRIVATE_KEY` | Never* | Requires migrating all smart accounts |
| `ALCHEMY_API_KEY` | As needed | Update in Railway, redeploy |
| `TWILIO_AUTH_TOKEN` | As needed | Update in Railway, redeploy |

*Only rotate if compromised. Requires significant migration effort.

---

## Validation

Rails initializer to validate required env vars:

```ruby
# config/initializers/env_validation.rb

REQUIRED_ENV_VARS = %w[
  DATABASE_URL
  REDIS_URL
  JWT_SECRET
  ENCRYPTION_KEY
  CHAIN_ENV
  ALCHEMY_API_KEY
  RESERVES_PRIVATE_KEY
  SIMPLE_ACCOUNT_FACTORY
  ENTRY_POINT
  RELAYR_API_URL
  APP_HOST
]

REQUIRED_ENV_VARS.each do |var|
  raise "Missing required environment variable: #{var}" if ENV[var].blank?
end

# Validate secrets are long enough
raise "JWT_SECRET must be at least 64 characters" if ENV['JWT_SECRET'].length < 64
raise "ENCRYPTION_KEY must be at least 64 characters" if ENV['ENCRYPTION_KEY'].length < 64

# Validate chain env
unless %w[sepolia mainnet].include?(ENV['CHAIN_ENV'])
  raise "CHAIN_ENV must be 'sepolia' or 'mainnet'"
end

Rails.logger.info "Environment validation passed for #{Rails.env}"
```
