# CocoPay Security Architecture

> Protecting community commerce from threats while keeping it simple for users

---

## Threat Model

### Assets to Protect

| Asset | Value | Owner |
|-------|-------|-------|
| User USDC balances | High | Users |
| Store token balances | Medium | Users |
| Merchant revenue | High | Merchants |
| User identity (email) | Medium | Users |
| Transaction history | Low | Users |
| Signing keys (managed wallets) | Critical | CocoPay (custodial) |

### Threat Actors

| Actor | Motivation | Capability |
|-------|------------|------------|
| Opportunistic attacker | Financial gain | Low-medium |
| Sophisticated attacker | Large theft | High |
| Insider (employee) | Financial gain | High (with access) |
| Competitor | Disruption | Medium |
| State actor | Surveillance | Very high |

### Attack Vectors

1. **Account takeover** - Stealing user sessions or credentials
2. **Key theft** - Extracting managed wallet signing keys
3. **API abuse** - Unauthorized transactions, data scraping
4. **Smart contract exploitation** - Draining revnets
5. **Social engineering** - Tricking users into sending funds
6. **Denial of service** - Making the app unusable

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 1: PERIMETER                          │
│  • Cloudflare DDoS protection                                   │
│  • WAF rules for common attacks                                 │
│  • Rate limiting at edge                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 2: APPLICATION                        │
│  • Input validation on all endpoints                            │
│  • CSRF protection                                              │
│  • Content Security Policy                                      │
│  • Authentication required for sensitive ops                    │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 3: DATA                               │
│  • Encryption at rest (database)                                │
│  • Encryption in transit (TLS 1.3)                              │
│  • Key management (HSM for signing keys)                        │
│  • Audit logging                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 4: BLOCKCHAIN                         │
│  • Revnet contracts are immutable                               │
│  • Fixed parameters (no admin functions)                        │
│  • Multi-chain redundancy                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication Security

### Passkey (WebAuthn)

```typescript
// Registration
const challenge = crypto.randomBytes(32)
const options = {
  challenge,
  rp: { name: 'CocoPay', id: 'cocopay.app' },
  user: { id: userId, name: userPhone, displayName: 'CocoPay User' },
  pubKeyCredParams: [
    { alg: -7, type: 'public-key' },   // ES256
    { alg: -257, type: 'public-key' }, // RS256
  ],
  authenticatorSelection: {
    authenticatorAttachment: 'platform',
    userVerification: 'required',
    residentKey: 'required',
  },
  attestation: 'none',
}

// Verification
const verified = await verifyAuthenticationResponse({
  response: credential,
  expectedChallenge: storedChallenge,
  expectedOrigin: 'https://cocopay.app',
  expectedRPID: 'cocopay.app',
  authenticator: storedCredential,
})
```

**Protections:**
- User verification required (biometric/PIN)
- Platform authenticator preferred (device-bound)
- Challenge is single-use, expires in 5 minutes
- Origin/RPID validation prevents phishing

### Session Management

```typescript
interface Session {
  id: string
  userId: string
  token: string           // Cryptographically random
  ipAddress: string       // For anomaly detection
  userAgent: string       // For anomaly detection
  createdAt: Date
  expiresAt: Date         // 7 days for mobile, 24h for web
  lastActivityAt: Date
}

// Session creation
const session = {
  id: crypto.randomUUID(),
  userId,
  token: crypto.randomBytes(32).toString('base64url'),
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  lastActivityAt: new Date(),
}

// Session validation
const session = await db.sessions.findOne({ token: bearerToken })

if (!session || session.expiresAt < new Date()) {
  throw new UnauthorizedError()
}

// Refresh last activity
await db.sessions.update({
  id: session.id,
  lastActivityAt: new Date(),
})
```

**Protections:**
- Tokens are 256-bit cryptographically random
- Sessions stored server-side (not JWTs)
- IP/UserAgent logged for anomaly detection
- Sliding expiration with activity refresh
- All sessions revocable by user

---

## Managed Wallet Security

### Key Generation and Storage

```typescript
// Key derivation (from passkey PRF or random)
const signingKey = await deriveSigningKey(prfOutput) || crypto.randomBytes(32)

// Encryption for storage
const encryptedKey = await encrypt(signingKey, {
  algorithm: 'AES-256-GCM',
  key: await getServerEncryptionKey(),  // From HSM
  iv: crypto.randomBytes(12),
})

// Storage
await db.walletKeys.insert({
  userId,
  encryptedKey,
  address: deriveAddress(signingKey),
  createdAt: new Date(),
})
```

**Key Security:**

| Protection | Implementation |
|------------|----------------|
| Encryption at rest | AES-256-GCM with HSM-backed key |
| Key isolation | Each user has unique key |
| No plaintext logging | Keys never in logs or errors |
| Memory protection | Keys wiped after use |
| Access control | Only signing service can decrypt |

### Transaction Signing

```typescript
// Transaction signing flow
async function signTransaction(userId: string, tx: Transaction) {
  // 1. Verify user session is valid
  const session = await validateSession(request)

  // 2. Check transaction limits
  await enforceTransactionLimits(userId, tx.value)

  // 3. Decrypt signing key (in secure enclave if available)
  const key = await decryptSigningKey(userId)

  // 4. Sign transaction
  const signedTx = await signWithKey(key, tx)

  // 5. Wipe key from memory
  key.fill(0)

  // 6. Log for audit
  await auditLog.insert({
    userId,
    action: 'TRANSACTION_SIGNED',
    txHash: signedTx.hash,
    value: tx.value,
    timestamp: new Date(),
  })

  return signedTx
}
```

**Transaction Limits:**

| Limit Type | Value | Period |
|------------|-------|--------|
| Single transaction | $10,000 | Per tx |
| Daily volume | $50,000 | 24 hours |
| New account | $500 | First 7 days |

Limits can be raised with additional verification (video KYC).

### Key Export (Exit Path)

Users can export their signing key to gain full self-custody:

```typescript
async function exportKey(userId: string, verification: Verification) {
  // 1. Require recent authentication (within 5 minutes)
  await requireRecentAuth(userId)

  // 2. Require additional verification
  await verifyExportRequest(userId, verification)  // OTP + passkey

  // 3. Decrypt key
  const key = await decryptSigningKey(userId)

  // 4. Generate BIP-39 mnemonic for user
  const mnemonic = bip39.entropyToMnemonic(key)

  // 5. Log export (cannot be reversed)
  await auditLog.insert({
    userId,
    action: 'KEY_EXPORTED',
    timestamp: new Date(),
  })

  // 6. Mark account as self-custody
  await db.users.update({ id: userId, mode: 'self_custody' })

  // 7. Return mnemonic (displayed once, user must save)
  return { mnemonic, warning: 'Save this phrase securely. It cannot be recovered.' }
}
```

**Export Security:**
- Requires recent auth + additional OTP
- One-time display (not stored after display)
- Audit logged permanently
- Account flagged as exported

---

## API Security

### Rate Limiting

```typescript
const rateLimits = {
  // By IP
  'ip:global': { limit: 1000, window: '1h' },
  'ip:auth': { limit: 10, window: '1m' },

  // By user
  'user:global': { limit: 500, window: '1h' },
  'user:payments': { limit: 50, window: '1h' },
  'user:cashout': { limit: 5, window: '1h' },

}

// Implementation
const rateLimit = async (key: string, config: RateLimitConfig) => {
  const count = await redis.incr(`ratelimit:${key}`)
  if (count === 1) {
    await redis.expire(`ratelimit:${key}`, config.windowSeconds)
  }
  if (count > config.limit) {
    throw new RateLimitError(`Rate limit exceeded for ${key}`)
  }
}
```

### Input Validation

```typescript
// All inputs validated with Zod schemas
const PaymentSchema = z.object({
  storeId: z.string().uuid(),
  amountUsd: z.number().positive().max(10000),
})

const CreateStoreSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  symbol: z.string().min(3).max(5).toUpperCase().regex(/^[A-Z]+$/),
  website: z.string().url().optional(),
})

// Applied at route level
app.post('/payments', async (c) => {
  const body = PaymentSchema.parse(await c.req.json())
  // body is now typed and validated
})
```

### CORS and CSRF

```typescript
// CORS configuration
app.use('*', cors({
  origin: [
    'https://cocopay.app',
    'https://app.cocopay.app',
    /^capacitor:\/\//,  // Mobile app
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Authorization', 'Content-Type'],
  credentials: true,
}))

// CSRF protection for state-changing operations
app.use('/api/*', async (c, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
    const origin = c.req.header('origin')
    if (!allowedOrigins.includes(origin)) {
      return c.json({ error: 'Invalid origin' }, 403)
    }
  }
  await next()
})
```

### Content Security Policy (Web)

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.cocopay.app wss://api.cocopay.app;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
">
```

---

## Smart Contract Security

### Revnet Configuration (Fixed)

All CocoPay stores use identical, audited revnet parameters:

```solidity
// These parameters are FIXED and cannot be changed by merchants
struct CocoRevnetConfig {
    // Issuance reduces by 0.5% every 90 days
    uint256 issuanceReductionRate = 5_000_000;      // 0.5%
    uint256 issuanceReductionFrequency = 7_776_000; // 90 days

    // Cash out tax (0.1 on 0-1 scale, max 10000)
    uint256 cashOutTaxRate = 1000;                  // 0.1 (10% of max)

    // 95% to merchant, 5% as customer rewards
    uint256 ownerSplitPercent = 9_500_000_000;      // 95%

    // No hooks - minimal attack surface
    address payHook = address(0);
    address cashOutHook = address(0);
}
```

**Why fixed parameters?**
- Removes merchant configuration as attack vector
- Simplifies security review (one config to audit)
- Prevents rug pulls or parameter manipulation
- Matches community commerce economics

### Contract Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Revnet drain | Juicebox V5 is battle-tested, audited |
| Malicious hook | No hooks allowed in CocoPay revnets |
| Front-running | Use private mempool (Flashbots) for sensitive txs |
| Chain reorg | Wait for finality before confirming (12 blocks) |

### Multi-Chain Considerations

```typescript
// Chain-specific confirmation thresholds
const FINALITY_BLOCKS = {
  1: 12,      // Ethereum mainnet
  8453: 1,    // Base (instant finality with Optimism)
  42161: 1,   // Arbitrum (instant finality)
  10: 1,      // Optimism (instant finality)
}

// Wait for finality before showing confirmed
async function waitForFinality(chainId: number, txHash: string) {
  const blocks = FINALITY_BLOCKS[chainId]
  const receipt = await waitForTransaction(txHash)

  const currentBlock = await getBlockNumber(chainId)
  while (currentBlock - receipt.blockNumber < blocks) {
    await sleep(1000)
    currentBlock = await getBlockNumber(chainId)
  }

  return receipt
}
```

---

## Mobile Security

### Secure Storage

```typescript
// iOS: Keychain, Android: EncryptedSharedPreferences
import * as SecureStore from 'expo-secure-store'

// Store session token securely
await SecureStore.setItemAsync('session_token', token, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
})

// Never store in AsyncStorage:
// ✗ Session tokens
// ✗ User PII
// ✗ Any cryptographic material
```

### Biometric Authentication

```typescript
import * as LocalAuthentication from 'expo-local-authentication'

async function requireBiometric(reason: string): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync()
  const isEnrolled = await LocalAuthentication.isEnrolledAsync()

  if (!hasHardware || !isEnrolled) {
    // Fall back to PIN
    return requirePin()
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: false,
  })

  return result.success
}

// Required for:
// - Payments over $100
// - Cash out
// - Key export
// - Changing security settings
```

### App Security

| Protection | Implementation |
|------------|----------------|
| Certificate pinning | Pin API certificate in app |
| Root/jailbreak detection | Warn users, don't block |
| Screenshot prevention | Disable on sensitive screens |
| Clipboard clearing | Clear after 60 seconds |
| Background blur | Blur app in task switcher |

---

## Data Privacy

### Data Minimization

| Data | Collected | Reason |
|------|-----------|--------|
| Email | Yes | Authentication (primary identity) |
| Name | No | Not needed |
| Location | Optional | Nearby stores feature |
| Transaction history | Yes | User's own history |
| IP address | Yes | Fraud detection |

### Data Retention

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Session tokens | 7 days after expiry | Audit trail |
| OTP codes | 5 minutes | Single use |
| Transaction history | Forever | Blockchain is permanent |
| Audit logs | 7 years | Compliance |
| User profiles | Until account deletion | Service provision |

### Data Export (LGPD/GDPR)

```typescript
// User can export all their data
async function exportUserData(userId: string) {
  const user = await db.users.findOne({ id: userId })
  const sessions = await db.sessions.findMany({ userId })
  const payments = await db.payments.findMany({ fromUserId: userId })
  const cashouts = await db.cashouts.findMany({ userId })

  return {
    user: sanitize(user),
    sessions: sessions.map(sanitize),
    payments: payments.map(sanitize),
    cashouts: cashouts.map(sanitize),
    exportedAt: new Date().toISOString(),
  }
}
```

### Account Deletion

```typescript
async function deleteAccount(userId: string) {
  // 1. Require recent auth
  await requireRecentAuth(userId)

  // 2. Check for non-zero balance
  const balance = await getBalance(userId)
  if (balance.totalUsd > 0.01) {
    throw new Error('Please cash out your balance before deleting.')
  }

  // 3. Anonymize (keep for compliance, remove PII)
  await db.users.update({
    id: userId,
    email: null,
    deletedAt: new Date(),
  })

  // 4. Revoke all sessions
  await db.sessions.deleteMany({ userId })

  // 5. Delete wallet key (user has been warned)
  await db.walletKeys.delete({ userId })

  // 6. Log
  await auditLog.insert({
    userId: 'DELETED',  // Don't log deleted user ID
    action: 'ACCOUNT_DELETED',
    timestamp: new Date(),
  })
}
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 | Critical - Active exploitation | 15 minutes | Key theft, funds drain |
| P2 | High - Potential exploitation | 1 hour | Auth bypass, API vuln |
| P3 | Medium - Limited impact | 24 hours | Rate limit bypass |
| P4 | Low - Minimal impact | 1 week | Information disclosure |

### Response Procedures

**P1 - Critical:**
1. Page on-call engineer immediately
2. Assess scope of compromise
3. If key theft suspected: rotate all signing keys
4. If API compromise: take API offline
5. Notify affected users within 24 hours
6. Post-mortem within 72 hours

**P2 - High:**
1. Alert on-call engineer
2. Assess and patch within 1 hour
3. Monitor for exploitation
4. Post-mortem within 1 week

### Kill Switches

```typescript
// Emergency controls (admin only)
const killSwitches = {
  // Disable all payments
  paymentsEnabled: true,

  // Disable cash outs
  cashOutEnabled: true,

  // Disable new registrations
  registrationEnabled: true,

  // Disable specific chains
  chainsEnabled: {
    1: true,
    8453: true,
    42161: true,
  },
}

// Checked before every sensitive operation
async function checkKillSwitch(switch: string) {
  if (!killSwitches[switch]) {
    throw new ServiceDisabledError(`${switch} is temporarily disabled`)
  }
}
```

---

## Monitoring and Alerting

### Security Metrics

```typescript
const securityMetrics = [
  // Authentication
  'auth.otp.sent',
  'auth.otp.verified',
  'auth.otp.failed',
  'auth.passkey.created',
  'auth.passkey.used',
  'auth.session.created',
  'auth.session.revoked',

  // Transactions
  'tx.payment.initiated',
  'tx.payment.completed',
  'tx.payment.failed',
  'tx.cashout.initiated',
  'tx.cashout.completed',

  // Anomalies
  'anomaly.rate_limit_hit',
  'anomaly.invalid_signature',
  'anomaly.unusual_amount',
  'anomaly.new_device',
]
```

### Alert Rules

| Alert | Condition | Action |
|-------|-----------|--------|
| High failure rate | >10% auth failures in 5 min | Page on-call |
| Large transaction | >$5,000 single tx | Slack notification |
| Unusual pattern | >$10,000 in 1 hour from new account | Review + possible hold |
| Rate limit abuse | >100 limit hits from single IP | Block IP |
| Key export | Any export | Slack notification |

### Audit Logging

```typescript
// Every security-relevant action is logged
interface AuditLog {
  id: string
  timestamp: Date
  userId: string | null
  action: string
  resource: string
  outcome: 'success' | 'failure'
  ip: string
  userAgent: string
  metadata: Record<string, unknown>
}

// Examples:
// { action: 'AUTH_OTP_VERIFIED', outcome: 'success', userId: '...' }
// { action: 'PAYMENT_INITIATED', outcome: 'success', metadata: { amount: 45.00 } }
// { action: 'KEY_EXPORT', outcome: 'success', userId: '...' }
// { action: 'RATE_LIMIT_HIT', outcome: 'failure', ip: '...' }
```

---

## Compliance Considerations

### Brazil (LGPD)

- **Data minimization**: Only collect necessary data
- **Consent**: Clear consent for data processing
- **Data portability**: Users can export their data
- **Right to deletion**: Users can delete accounts
- **Data breach notification**: Within 72 hours

### Crypto Regulations

- **Not a bank**: CocoPay does not hold fiat, only facilitates crypto payments
- **Not a money transmitter**: Users custody their own funds (even managed wallets are user-controlled)
- **KYC thresholds**: Consider KYC for large volumes (>$10k/month)

### Payment Card Industry (PCI)

- **Not applicable**: CocoPay does not handle card payments
- **Stripe integration** (if any): Handled by Stripe's PCI compliance

---

## Security Checklist

### Before Launch

- [ ] Penetration test by third party
- [ ] Smart contract audit (Juicebox V5 already audited)
- [ ] Rate limiting tested under load
- [ ] All secrets in environment variables
- [ ] No secrets in code or logs
- [ ] HTTPS everywhere
- [ ] Backup and recovery tested
- [ ] Incident response runbook documented

### Ongoing

- [ ] Weekly security metric review
- [ ] Monthly dependency updates
- [ ] Quarterly penetration test
- [ ] Annual security audit
- [ ] Continuous monitoring active
