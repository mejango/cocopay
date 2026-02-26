# CocoPay Deployment Checklist

> Step-by-step guide for deploying to staging and production

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (`bundle exec rspec`, `npm test`)
- [ ] No linting errors (`rubocop`, `eslint`)
- [ ] Code reviewed and approved
- [ ] Branch merged to `main`

### Database

- [ ] Migrations are reversible
- [ ] Migrations tested locally
- [ ] No destructive migrations without backup plan
- [ ] Indexes added for new queries

### Environment

- [ ] All new env vars documented in ENV.md
- [ ] Secrets generated and stored in Railway
- [ ] Feature flags configured

### Mobile

- [ ] App version bumped
- [ ] Release notes written
- [ ] Screenshots updated (if UI changes)

---

## First-Time Setup

### 1. Railway Project Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Link to GitHub repo
railway link
```

### 2. Create Services

In Railway dashboard, create:

1. **API** (Rails app)
   - Source: GitHub repo, `/apps/api` directory
   - Build: Dockerfile
   - Start: `bin/rails server`

2. **PostgreSQL**
   - Railway managed PostgreSQL
   - Copy `DATABASE_URL` to API service

3. **Redis**
   - Railway managed Redis
   - Copy `REDIS_URL` to API service

### 3. Configure Environment Variables

```bash
# Set all required env vars (see ENV.md)
railway variables set JWT_SECRET="$(openssl rand -hex 32)"
railway variables set ENCRYPTION_KEY="$(openssl rand -hex 32)"
railway variables set CHAIN_ENV=sepolia
railway variables set ALCHEMY_API_KEY=your-key
# ... etc
```

### 4. Run Initial Migration

```bash
railway run bin/rails db:migrate
```

### 5. Deploy

```bash
railway up
```

### 6. Verify Deployment

```bash
# Check health endpoint
curl https://api-staging.cocopay.app/up

# Check ready endpoint
curl https://api-staging.cocopay.app/health/ready
```

---

## CocoPayRouter Contract Deployment

The `CocoPayRouter` is deployed via CREATE2 with salt `0xC0C0` for deterministic addresses across all chains.

### Prerequisites

- Foundry installed (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- Deployer private key with ETH on each target chain
- RPC URLs for target chains

### Deploy to a Chain

```bash
cd contracts

# Base mainnet
DEPLOYER_PRIVATE_KEY=0x... forge script script/DeployRouter.s.sol \
  --rpc-url https://base.publicnode.com \
  --broadcast --verify

# Optimism
DEPLOYER_PRIVATE_KEY=0x... forge script script/DeployRouter.s.sol \
  --rpc-url https://optimism.publicnode.com \
  --broadcast --verify

# Arbitrum
DEPLOYER_PRIVATE_KEY=0x... forge script script/DeployRouter.s.sol \
  --rpc-url https://arbitrum-one.publicnode.com \
  --broadcast --verify
```

### Verify Deployment

```bash
# The address should be the same on all chains
cast call $ROUTER_ADDRESS "TERMINAL()(address)" --rpc-url https://base.publicnode.com
cast call $ROUTER_ADDRESS "PERMIT2()(address)" --rpc-url https://base.publicnode.com
```

### After Deployment

1. Update `COCOPAY_ROUTER` constant in `apps/mobile/src/constants/juicebox.ts`
2. Update `docs/ENV.md` with the router address
3. Verify on block explorers for each chain

---

## Staging Deployment

### Automated (via GitHub Actions)

Push to `main` triggers:

1. Run tests
2. Build Docker image
3. Deploy to Railway staging
4. Run migrations
5. Smoke tests

### Manual Deployment

```bash
# Deploy to staging
railway environment staging
railway up

# Run migrations
railway run bin/rails db:migrate

# Verify
curl https://api-staging.cocopay.app/health/ready
```

---

## Production Deployment

### Pre-Production Checklist

- [ ] Staging tested and approved
- [ ] Load testing passed (if significant changes)
- [ ] Rollback plan documented
- [ ] On-call engineer notified
- [ ] Maintenance window scheduled (if needed)

### Deployment Steps

```bash
# 1. Switch to production environment
railway environment production

# 2. Create database backup
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Deploy
railway up

# 4. Run migrations
railway run bin/rails db:migrate

# 5. Verify health
curl https://api.cocopay.app/health/ready

# 6. Smoke test critical flows
./scripts/smoke_test_production.sh

# 7. Monitor for 15 minutes
# Watch error rates, latency, logs
```

### Rollback Procedure

If issues detected:

```bash
# 1. Rollback to previous deployment
railway rollback

# 2. If migrations need reverting
railway run bin/rails db:rollback STEP=1

# 3. Restore database (if needed)
railway run psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# 4. Notify team
```

---

## Mobile App Deployment

### Build and Submit (Expo EAS)

```bash
cd apps/mobile

# 1. Bump version in app.json
# 2. Build for production
eas build --platform all --profile production

# 3. Submit to stores
eas submit --platform ios
eas submit --platform android
```

### iOS App Store

1. Build completes on EAS
2. Auto-submitted to App Store Connect
3. Manual review required
4. Release after approval

### Google Play Store

1. Build completes on EAS
2. Auto-submitted to Play Console
3. Review (usually faster than iOS)
4. Release to production track

### Over-the-Air Updates

For non-native changes (JS/assets only):

```bash
# Push OTA update (skips store review)
eas update --branch production --message "Bug fix for payment flow"
```

---

## Web App Deployment

### Vercel (Automatic)

Push to `main` auto-deploys:
- `apps/web` → `cocopay.app`
- `apps/payment-page` → `pay.cocopay.app`

### Manual Deployment

```bash
cd apps/web
vercel --prod
```

---

## Post-Deployment

### Verification Checklist

- [ ] Health endpoints responding
- [ ] Login flow working
- [ ] Payment flow working (test transaction)
- [ ] WebSocket notifications working
- [ ] No new errors in Sentry
- [ ] Latency within acceptable range

### Monitoring

Watch these for 30 minutes after deploy:

1. **Error rate** - Should not increase
2. **Latency p99** - Should not increase significantly
3. **Database connections** - Should stabilize
4. **Memory usage** - Should not grow unbounded

### Rollback Triggers

Initiate rollback if:

- Error rate > 5%
- p99 latency > 2x baseline
- Any critical flow broken
- Database connection issues

---

## Deployment Schedule

| Day | Time (BRT) | Type | Notes |
|-----|------------|------|-------|
| Mon-Thu | 10:00-16:00 | Standard | Normal deployments |
| Fri | 10:00-12:00 | Limited | Only critical fixes |
| Sat-Sun | Emergency only | - | Requires approval |

### Freeze Periods

No deployments during:
- Black Friday week
- Christmas/New Year (Dec 24 - Jan 2)
- Major local holidays

---

## Scripts

### smoke_test_production.sh

```bash
#!/bin/bash
set -e

API_URL="https://api.cocopay.app"

echo "Running production smoke tests..."

# Health check
echo "1. Health check..."
curl -sf "$API_URL/up" > /dev/null
echo "   ✓ Health check passed"

# Ready check
echo "2. Ready check..."
curl -sf "$API_URL/health/ready" > /dev/null
echo "   ✓ Ready check passed"

# API version
echo "3. API version..."
VERSION=$(curl -sf "$API_URL/api/v1/version" | jq -r '.version')
echo "   ✓ Version: $VERSION"

# Auth endpoint (should return 401)
echo "4. Auth protection..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/users/me")
[ "$STATUS" = "401" ] && echo "   ✓ Auth protection working"

# Stores endpoint (public)
echo "5. Stores endpoint..."
curl -sf "$API_URL/api/v1/stores?page=1" > /dev/null
echo "   ✓ Stores endpoint working"

echo ""
echo "All smoke tests passed! ✓"
```

### database_backup.sh

```bash
#!/bin/bash
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="cocopay_${RAILS_ENV}_${TIMESTAMP}.sql.gz"

echo "Creating backup: $FILENAME"

pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/$FILENAME"

echo "Backup created: $BACKUP_DIR/$FILENAME"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "cocopay_*.sql.gz" -mtime +7 -delete

echo "Old backups cleaned up"
```

---

## Emergency Procedures

### Complete Service Outage

1. Check Railway status page
2. Check Alchemy status
3. Check database connectivity
4. Review recent deployments
5. Rollback if recent deployment
6. Contact Railway support if infrastructure issue

### Database Issues

1. Check connection pool exhaustion
2. Check for long-running queries
3. Check disk space
4. Scale up if needed
5. Contact DBA if data corruption

### Blockchain Issues

1. Check Alchemy RPC status
2. Switch to backup RPC if available
3. Check Relayr status
4. Queue transactions for retry
5. Notify users of delays

---

## Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| On-call Engineer | Slack #oncall | PagerDuty |
| Database Admin | - | - |
| Railway Support | support@railway.app | - |
| Alchemy Support | support@alchemy.com | - |
