# CocoPay Incident Response

> Automated handling and escalation for production issues

---

## Severity Levels

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| **SEV1** | Complete outage, all users affected | 15 min | API down, DB down |
| **SEV2** | Major feature broken, many users affected | 1 hour | Payments failing, auth broken |
| **SEV3** | Minor feature broken, some users affected | 4 hours | Notifications delayed, analytics down |
| **SEV4** | Cosmetic issue, minimal impact | 24 hours | UI glitch, typo |

---

## Automated Response Flow

```
┌─────────────────┐
│  Alert Fires    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Auto-Remediate │────▶│  Notify Slack   │
│  (if possible)  │     │  #incidents     │
└────────┬────────┘     └─────────────────┘
         │
         │ Still failing?
         ▼
┌─────────────────┐
│  Escalate to    │
│  PagerDuty      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  On-call        │
│  Acknowledges   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Follow         │────▶│  Resolve or     │
│  Runbook        │     │  Escalate       │
└─────────────────┘     └─────────────────┘
```

---

## Runbooks

### RB-001: API Health Check Failing

**Severity:** SEV1
**Auto-remediate:** Yes (restart service)

#### Symptoms
- `/up` returns non-200
- `/health/ready` returns 503
- Error rate > 50%

#### Automated Actions
```bash
# 1. Auto-restart service (Railway)
railway service restart api

# 2. If still failing after 2 min, alert on-call
```

#### Manual Investigation

1. **Check recent deployments**
   ```bash
   railway logs --since 30m | grep "deploy"
   ```
   - If recent deploy, consider rollback

2. **Check application logs**
   ```bash
   railway logs --since 10m | grep -i error
   ```

3. **Check dependencies**
   - Database: `railway run bin/rails db:status`
   - Redis: `railway run redis-cli ping`
   - Alchemy: Check status.alchemy.com

4. **Check resources**
   - Memory usage in Railway dashboard
   - CPU usage
   - Connection pool exhaustion

#### Resolution Actions

| Cause | Action |
|-------|--------|
| Bad deploy | `railway rollback` |
| Memory exhaustion | Scale up instance |
| DB connection exhaustion | Restart service, investigate leaks |
| External dependency down | Enable degraded mode, notify users |

---

### RB-002: Payment Failures Spike

**Severity:** SEV2
**Auto-remediate:** No (requires investigation)

#### Symptoms
- `payment_failed` error rate > 10%
- Relayr bundle failures
- User complaints

#### Investigation Steps

1. **Identify failure type**
   ```bash
   railway logs | grep "payment_failed" | jq '.error_code' | sort | uniq -c
   ```

2. **Check Relayr status**
   ```bash
   curl https://api.relayr.ba5ed.com/health
   ```

3. **Check chain-specific issues**
   - Base: Check base.blockscout.com
   - Optimism: Check optimism.io/status
   - Arbitrum: Check arbiscan.io
   - Ethereum: Check etherscan.io

4. **Check user balances**
   - Are balance syncs up to date?
   - Are previews calculating correctly?

#### Resolution Actions

| Cause | Action |
|-------|--------|
| Relayr down | Queue payments, retry when up |
| Chain congestion | Increase gas estimates, warn users |
| Balance sync stale | Force balance refresh |
| Code bug | Rollback if recent deploy |

#### User Communication
```
We're experiencing issues with payments. Our team is actively working on it.
Payments made during this time will be processed once resolved.
```

---

### RB-003: Database Connection Issues

**Severity:** SEV1/SEV2
**Auto-remediate:** Yes (restart service)

#### Symptoms
- `PG::ConnectionBad` errors
- `ActiveRecord::ConnectionNotEstablished`
- Slow queries across all endpoints

#### Automated Actions
```bash
# 1. Clear stale connections
railway run bin/rails runner "ActiveRecord::Base.connection_pool.disconnect!"

# 2. Restart service if still failing
railway service restart api
```

#### Manual Investigation

1. **Check connection count**
   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'cocopay_production';
   ```

2. **Check for long-running queries**
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC
   LIMIT 10;
   ```

3. **Kill long queries if needed**
   ```sql
   SELECT pg_cancel_backend(pid);
   -- or force: SELECT pg_terminate_backend(pid);
   ```

4. **Check for locks**
   ```sql
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

#### Resolution Actions

| Cause | Action |
|-------|--------|
| Pool exhaustion | Increase pool size, find leak |
| Long queries | Kill query, add index |
| Lock contention | Kill blocking query |
| Railway issue | Contact Railway support |

---

### RB-004: Blockchain RPC Errors

**Severity:** SEV2/SEV3
**Auto-remediate:** Yes (failover to backup)

#### Symptoms
- `AlchemyService` errors
- Balance sync failures
- Payment preview failures

#### Automated Actions
```bash
# 1. Switch to backup RPC (if configured)
# This is automatic if RPC_OVERRIDES includes backups

# 2. Queue affected operations for retry
```

#### Manual Investigation

1. **Check Alchemy status**
   - https://status.alchemy.com

2. **Test RPC directly**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     https://base-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY
   ```

3. **Check specific chain**
   - Which chain is failing?
   - Is it all operations or specific methods?

#### Resolution Actions

| Cause | Action |
|-------|--------|
| Alchemy outage | Use backup RPC, wait |
| Rate limiting | Check usage, upgrade plan |
| Network issues | Check Railway region connectivity |

---

### RB-005: Redis Connection Issues

**Severity:** SEV2
**Auto-remediate:** Yes (reconnect)

#### Symptoms
- Session errors
- WebSocket disconnections
- Job queue issues

#### Automated Actions
```bash
# 1. Force reconnect
railway run bin/rails runner "Redis.current.reconnect"

# 2. Restart service if still failing
```

#### Manual Investigation

1. **Check Redis status**
   ```bash
   railway run redis-cli ping
   railway run redis-cli info
   ```

2. **Check memory**
   ```bash
   railway run redis-cli info memory
   ```

3. **Check connections**
   ```bash
   railway run redis-cli client list | wc -l
   ```

---

### RB-006: High Error Rate (Generic)

**Severity:** SEV2
**Auto-remediate:** No

#### Symptoms
- Error rate > 5% sustained
- Sentry alert spike
- User complaints

#### Investigation Steps

1. **Identify error patterns**
   - Check Sentry for most common errors
   - Check logs for stack traces

2. **Correlate with events**
   - Recent deploy?
   - Traffic spike?
   - External dependency issue?

3. **Check affected endpoints**
   ```bash
   railway logs | jq 'select(.level == "ERROR") | .path' | sort | uniq -c
   ```

#### Resolution
- Depends on root cause
- May require rollback, hotfix, or external resolution

---

### RB-007: Memory Leak / OOM

**Severity:** SEV2
**Auto-remediate:** Yes (restart)

#### Symptoms
- Memory usage climbing steadily
- OOM killer triggered
- Service crashes

#### Automated Actions
```bash
# 1. Restart service (releases memory)
railway service restart api

# 2. Alert for investigation
```

#### Investigation (Post-Incident)

1. **Analyze memory growth**
   - Check memory graphs in Railway
   - Identify when growth started

2. **Check recent changes**
   - New gems?
   - New background jobs?
   - Changed query patterns?

3. **Profile locally**
   ```ruby
   require 'memory_profiler'
   report = MemoryProfiler.report { SuspectCode.run }
   report.pretty_print
   ```

---

### RB-008: Reserves Wallet Low Balance

**Severity:** SEV3 (warning) → SEV2 (critical)
**Auto-remediate:** No

#### Symptoms
- Alert: Reserves wallet < $1000
- Critical: Reserves wallet < $100

#### Actions

1. **Check current balance**
   ```bash
   railway run bin/rails runner "puts ReservesWallet.balance"
   ```

2. **Top up wallet**
   - Transfer funds from treasury
   - Across all chains as needed

3. **Investigate burn rate**
   - How much gas are we using?
   - Unusual activity?

---

## Incident Communication

### Internal (Slack #incidents)

**When issue detected:**
```
🔴 INCIDENT: [Brief description]
Severity: SEV[X]
Detected: [time]
Status: Investigating
Lead: [name or "unassigned"]
```

**Updates every 15 min (SEV1/2) or 1 hour (SEV3):**
```
🟡 UPDATE: [Brief description]
Status: [Investigating/Identified/Fixing/Monitoring]
Summary: [What we know]
Next: [What we're doing]
ETA: [If known]
```

**When resolved:**
```
🟢 RESOLVED: [Brief description]
Duration: [X minutes]
Impact: [Users affected, payments delayed, etc.]
Root cause: [Brief]
Follow-up: [Link to post-mortem if needed]
```

### External (User-Facing)

**Status Page Updates:**
- Use simple language
- No technical details
- Focus on impact and ETA

```
Investigating issues with payments
We're aware of issues affecting some payments and are actively investigating.
Payments may be delayed. We'll update as soon as we have more information.

Identified - Payment processing delays
We've identified the issue causing payment delays.
Our team is implementing a fix. Payments are being queued and will process shortly.

Resolved - Payment processing restored
Payment processing is back to normal.
Any delayed payments have been processed. Thank you for your patience.
```

---

## Post-Incident

### Post-Mortem Required For:
- SEV1 incidents
- SEV2 incidents > 30 minutes
- Any incident affecting payments

### Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]

**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**Severity:** SEV[X]
**Author:** [Name]

## Summary
[2-3 sentence summary]

## Timeline
- HH:MM - [Event]
- HH:MM - [Event]
- ...

## Impact
- Users affected: [number]
- Payments affected: [number/volume]
- Revenue impact: [if known]

## Root Cause
[Technical explanation]

## Resolution
[What fixed it]

## Lessons Learned
### What went well
- [Item]

### What went poorly
- [Item]

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action] | [Name] | [Date] | [ ] |

## Prevention
[How we prevent this from happening again]
```

---

## On-Call Rotation

### Responsibilities
- Acknowledge alerts within 15 minutes
- Follow runbooks for known issues
- Escalate if needed
- Document actions taken

### Escalation Path
1. On-call engineer (primary)
2. On-call engineer (secondary)
3. Engineering lead
4. CTO

### Handoff
- End of shift: Brief next on-call on any active issues
- Update incident channels with status
- Ensure runbooks are current

---

## Tools

| Tool | Purpose | Access |
|------|---------|--------|
| Railway | Logs, metrics, restart | All engineers |
| Sentry | Error tracking | All engineers |
| PagerDuty | Alerting, on-call | On-call engineers |
| Slack #incidents | Communication | All team |
| Status Page | User communication | Engineering lead+ |
