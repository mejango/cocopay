# CocoPay API Specification

> RESTful API for CocoPay mobile and web clients

---

## Base URLs

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:3000/v1` |
| Production | `https://api.cocopay.biz/v1` |

---

## Authentication

All authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
```

Tokens are obtained via `/auth/email/verify` (email OTP) or `/auth/wallet/siwe` (wallet sign-in).

---

## Response Format

**Success:**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-16T12:00:00Z"
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Not enough funds to complete this payment",
    "details": { ... }
  }
}
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid request parameters |
| `INSUFFICIENT_BALANCE` | 422 | Not enough funds |
| `PAYMENT_FAILED` | 422 | Blockchain transaction failed |
| `STORE_NOT_FOUND` | 404 | Store does not exist |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `INVALID_CHAIN` | 422 | Unsupported chain ID |
| `BUNDLE_FAILED` | 500 | Relayr bundle submission failed |
| `RPC_ERROR` | 503 | Blockchain RPC unavailable |
| `RATE_LIMITED` | 429 | Too many requests |
| `TOO_MANY_ATTEMPTS` | 429 | Too many failed OTP attempts |

---

## Endpoints

### Authentication

#### `POST /auth/email/send`
Send magic link to email address.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "data": {
    "verification_id": "abc123",
    "expires_at": "2026-02-16T12:05:00Z"
  }
}
```

---

#### `POST /auth/email/verify`
Verify 6-digit OTP code and create session.

**Request:**
```json
{
  "verification_id": "abc123",
  "token": "482916"
}
```

**Response:**
```json
{
  "data": {
    "token": "eyJ...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "created_at": "2026-02-16T12:00:00Z"
    },
    "is_new_user": true
  }
}
```

---

#### `POST /auth/wallet/nonce`
Request a nonce for SIWE (Sign-In with Ethereum) authentication.

**Request:**
```json
{
  "address": "0x1234...abcd"
}
```

**Response:**
```json
{
  "data": {
    "nonce": "a1b2c3d4e5f6"
  }
}
```

---

#### `POST /auth/wallet/siwe`
Verify SIWE signature and create session.

**Request:**
```json
{
  "address": "0x1234...abcd",
  "message": "cocopay.biz wants you to sign in...",
  "signature": "0x..."
}
```

**Response:**
```json
{
  "data": {
    "token": "eyJ...",
    "user": {
      "id": "user_123",
      "wallet_address": "0x1234...abcd",
      "created_at": "2026-02-16T12:00:00Z"
    },
    "is_new_user": true
  }
}
```

---

#### `DELETE /auth/session`
Logout current session.

**Response:**
```json
{
  "data": {
    "logged_out": true
  }
}
```

---

### Users

#### `GET /users/me`
Get current user profile.

**Response:**
```json
{
  "data": {
    "id": "user_123",
    "email": "joao@example.com",
    "name": "João Silva",
    "smart_account_address": "0x...",
    "created_at": "2026-02-16T12:00:00Z"
  }
}
```

---

#### `PATCH /users/me`
Update user profile.

**Request:**
```json
{
  "name": "João Silva"
}
```

---

#### `GET /users/me/balance`
Get user's total balance across all chains.

**Response:**
```json
{
  "data": {
    "total_usd": "127.50",
    "breakdown": [
      {
        "type": "usdc",
        "label": "Dollars",
        "amount_usd": "50.00",
        "chain_id": 8453
      },
      {
        "type": "store_token",
        "label": "Café da Praia",
        "store_id": "store_123",
        "amount_usd": "35.00",
        "token_amount": "35000000000000000000000",
        "chain_id": 8453
      }
    ],
    "by_chain": {
      "8453": "100.00",
      "10": "20.00",
      "42161": "7.50"
    },
    "available_bonus": "12.50"
  }
}
```

---

#### `GET /users/me/transactions`
Get user's transaction history.

**Query params:**
- `page` (default: 1)
- `per_page` (default: 20, max: 100)
- `type` (optional): `payment`, `received`, `bonus`
- `store_id` (optional): Filter by store

**Response:**
```json
{
  "data": [
    {
      "id": "tx_123",
      "type": "payment",
      "amount_usd": "45.00",
      "counterparty": {
        "type": "store",
        "id": "store_456",
        "name": "Surf Shop"
      },
      "rewards_earned_usd": "2.25",
      "confirmation_code": "A7B3C9",
      "status": "confirmed",
      "chain_id": 8453,
      "created_at": "2026-02-16T14:34:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 156
  }
}
```

---

#### `GET /users/me/transactions/:id`
Get transaction details.

**Response:**
```json
{
  "data": {
    "id": "tx_123",
    "type": "payment",
    "amount_usd": "45.00",
    "counterparty": { ... },
    "tokens_used": [
      {
        "store_id": "store_456",
        "token_address": "0x...",
        "amount": "22500000000000000000000",
        "amount_usd": "22.50"
      }
    ],
    "rewards_earned": {
      "store_id": "store_456",
      "token_amount": "2250000000000000000000",
      "amount_usd": "2.25"
    },
    "bundle_id": "relayr_bundle_123",
    "tx_hash": "0x...",
    "block_number": 12345678,
    "chain_id": 8453,
    "status": "confirmed",
    "confirmation_code": "A7B3C9",
    "created_at": "2026-02-16T14:34:00Z"
  }
}
```

---

#### `GET /users/me/bonus`
Get available bonus details.

**Response:**
```json
{
  "data": {
    "total_available_usd": "12.50",
    "breakdown": {
      "refinancing_headroom": "10.00",
      "uncollateralized_tokens": "2.50"
    },
    "loans": [
      {
        "id": "loan_123",
        "original_collateral_usd": "50.00",
        "current_collateral_value_usd": "60.00",
        "headroom_usd": "10.00",
        "chain_id": 8453
      }
    ]
  }
}
```

---

#### `POST /users/me/bonus/claim`
Claim available bonus (take loan or refinance).

**Request:**
```json
{
  "amount_usd": "10.00",
  "destination": "balance"
}
```

**Response:**
```json
{
  "data": {
    "loan_id": "loan_456",
    "amount_received_usd": "9.75",
    "fee_usd": "0.25",
    "bundle_id": "relayr_bundle_456",
    "status": "pending"
  }
}
```

---

### Payments

#### `POST /payments/preview`
Preview a payment (calculate token mix, fees, rewards).

**Request:**
```json
{
  "store_id": "store_456",
  "amount_usd": "45.00",
  "chain_id": 8453
}
```

**Response:**
```json
{
  "data": {
    "amount_usd": "45.00",
    "tokens_to_use": [
      {
        "store_id": "store_456",
        "token_address": "0x...",
        "amount": "22500000000000000000000",
        "amount_usd": "22.50"
      },
      {
        "store_id": "store_123",
        "token_address": "0x...",
        "amount": "15000000000000000000000",
        "amount_usd": "15.00",
        "cash_out_fee_usd": "0.015"
      },
      {
        "type": "usdc",
        "amount": "7500000",
        "amount_usd": "7.50"
      }
    ],
    "rewards_to_earn": {
      "store_id": "store_456",
      "amount_usd": "2.25"
    },
    "expires_at": "2026-02-16T12:01:00Z"
  }
}
```

---

#### `POST /payments/execute`
Execute a payment with client-built calldata. Supports three flows:

- **Managed (email users)**: Send raw `transactions` calldata. Backend wraps in SmartAccount.execute, signs ForwardRequest server-side, submits Relayr balance bundle.
- **Self-custody (wallet users)**: Send `transactions` + `signed_forward_requests`. Client signs ForwardRequests via `signTypedData`. Backend submits pre-signed calldata to Relayr.
- **External (no CocoPay account)**: Call `CocoPayRouter.payProject()` directly on-chain (no API needed).

**Request:**
```json
{
  "store_id": "store_456",
  "amount_usd": 45.00,
  "chain_id": 8453,
  "tokens_used": [
    {
      "type": "usdc",
      "token_address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "amount_usd": "45.00",
      "amount_raw": "45000000"
    }
  ],
  "transactions": [
    {
      "chain_id": 8453,
      "target": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "data": "0x095ea7b3...",
      "value": "0"
    },
    {
      "chain_id": 8453,
      "target": "0x2dB6d704058E552DeFE415753465df8dF0361846",
      "data": "0x1ebc4c91...",
      "value": "0"
    }
  ],
  "signed_forward_requests": [
    {
      "chain_id": 8453,
      "data": "0xd5aeaba5..."
    }
  ]
}
```

The `signed_forward_requests` field is **optional**. Omit it for managed users (backend signs). Include it for self-custody users (client signs via `signTypedData`).

**Response:**
```json
{
  "data": {
    "id": "tx_123",
    "status": "pending",
    "confirmation_code": "A7B3C9"
  }
}
```

---

#### `POST /payments`
Execute a payment (legacy — use `/payments/execute` instead).

**Request:**
```json
{
  "store_id": "store_456",
  "amount_usd": "45.00",
  "chain_id": 8453,
  "preview_token": "preview_abc123"
}
```

**Response:**
```json
{
  "data": {
    "id": "tx_123",
    "status": "pending",
    "bundle_id": "relayr_bundle_789",
    "confirmation_code": "A7B3C9",
    "created_at": "2026-02-16T12:00:00Z"
  }
}
```

---

#### `GET /payments/:id/status`
Poll payment status.

**Response:**
```json
{
  "data": {
    "id": "tx_123",
    "status": "confirmed",
    "tx_hash": "0x...",
    "block_number": 12345678,
    "confirmed_at": "2026-02-16T12:00:15Z"
  }
}
```

---

### Stores

#### `GET /stores`
List stores (for explore/directory).

**Query params:**
- `lat`, `lng` (optional): User location for distance
- `page`, `per_page`
- `search` (optional): Name search

**Response:**
```json
{
  "data": [
    {
      "id": "store_123",
      "name": "Café da Praia",
      "symbol": "CAFE",
      "category": "Coffee & Pastries",
      "location": {
        "lat": -27.5969,
        "lng": -48.5495,
        "address": "Rua das Flores, 123"
      },
      "distance_km": 0.3,
      "user_rewards_usd": "35.00"
    }
  ]
}
```

---

#### `GET /stores/:id`
Get store details.

**Response:**
```json
{
  "data": {
    "id": "store_123",
    "name": "Café da Praia",
    "symbol": "CAFE",
    "category": "Coffee & Pastries",
    "location": { ... },
    "revnet": {
      "project_id": 456,
      "token_address": "0x...",
      "surplus_usd": "10000.00",
      "total_supply": "10000000000000000000000000"
    },
    "qr_code_url": "https://pay.cocopay.app/store_123",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

#### `POST /stores`
Create a new store (deploys revnet).

**Request:**
```json
{
  "name": "Café da Praia",
  "symbol": "CAFE",
  "category": "Coffee & Pastries",
  "location": {
    "lat": -27.5969,
    "lng": -48.5495,
    "address": "Rua das Flores, 123"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "store_123",
    "name": "Café da Praia",
    "symbol": "CAFE",
    "deployment_status": "pending",
    "bundle_id": "relayr_bundle_deploy_123"
  }
}
```

---

#### `GET /stores/:id/qr`
Get store QR code for payments.

**Query params:**
- `amount_usd` (optional): Pre-filled amount
- `format`: `png`, `svg` (default: svg)
- `size`: pixels (default: 300)

**Response:** Binary image or SVG

---

### My Store (Merchant)

#### `GET /my-store`
Get current user's store (if owner/admin/staff).

**Response:**
```json
{
  "data": {
    "id": "store_123",
    "name": "Café da Praia",
    "role": "owner",
    "today_sales_usd": "342.50",
    "balance_usd": "1250.00",
    "deployment_status": "deployed"
  }
}
```

---

#### `GET /my-store/payments`
Get store's payment history.

**Query params:**
- `page`, `per_page`
- `date_from`, `date_to`

**Response:**
```json
{
  "data": [
    {
      "id": "tx_789",
      "amount_usd": "25.00",
      "payer": {
        "id": "user_456",
        "name": "Maria"
      },
      "status": "confirmed",
      "created_at": "2026-02-16T14:30:00Z"
    }
  ]
}
```

---

#### `GET /my-store/analytics`
Get store analytics (owner/admin only).

**Query params:**
- `period`: `day`, `week`, `month`

**Response:**
```json
{
  "data": {
    "period": "week",
    "revenue_usd": "2450.00",
    "transaction_count": 89,
    "average_transaction_usd": "27.53",
    "repeat_customer_rate": 0.42,
    "daily_breakdown": [
      { "date": "2026-02-10", "revenue_usd": "320.00", "count": 12 }
    ]
  }
}
```

---

#### `GET /my-store/team`
Get store team members (owner/admin only).

**Response:**
```json
{
  "data": [
    {
      "id": "member_123",
      "user_id": "user_789",
      "name": "Carlos",
      "email": "carlos@example.com",
      "role": "staff",
      "added_at": "2026-02-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /my-store/team`
Add team member (owner only).

**Request:**
```json
{
  "email": "carlos@example.com",
  "role": "staff"
}
```

---

#### `PATCH /my-store/team/:id`
Update team member role (owner only).

**Request:**
```json
{
  "role": "admin"
}
```

---

#### `DELETE /my-store/team/:id`
Remove team member (owner only).

---

#### `POST /my-store/payouts`
Payout store balance (owner only).

**Request:**
```json
{
  "amount_usd": "500.00",
  "destination": {
    "type": "pix",
    "key": "email@example.com"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "payout_123",
    "amount_usd": "500.00",
    "fee_usd": "0.50",
    "status": "processing",
    "estimated_arrival": "2026-02-16T18:00:00Z"
  }
}
```

---

### Consolidation

#### `POST /consolidation/preview`
Preview cross-chain consolidation.

**Request:**
```json
{
  "from_chain_id": 10,
  "to_chain_id": 8453
}
```

**Response:**
```json
{
  "data": {
    "amount_usd": "20.00",
    "bridge_fee_usd": "0.50",
    "estimated_time_seconds": 300,
    "tokens": [
      {
        "store_id": "store_123",
        "amount_usd": "15.00"
      }
    ]
  }
}
```

---

#### `POST /consolidation`
Execute consolidation.

**Request:**
```json
{
  "from_chain_id": 10,
  "to_chain_id": 8453
}
```

---

## WebSocket Events

Connect to: `wss://api.cocopay.biz/cable`

### Channels

#### `PaymentsChannel`
Subscribe to payment notifications.

**Subscribe:**
```json
{
  "command": "subscribe",
  "identifier": "{\"channel\":\"PaymentsChannel\"}"
}
```

**Events:**

`payment_received` (for merchants):
```json
{
  "type": "payment_received",
  "data": {
    "id": "tx_123",
    "amount_usd": "25.00",
    "payer_name": "João",
    "confirmation_code": "A7B3C9"
  }
}
```

`payment_confirmed` (for payers):
```json
{
  "type": "payment_confirmed",
  "data": {
    "id": "tx_123",
    "status": "confirmed",
    "tx_hash": "0x..."
  }
}
```

`payment_failed`:
```json
{
  "type": "payment_failed",
  "data": {
    "id": "tx_123",
    "error_code": "BUNDLE_FAILED",
    "message": "Transaction reverted"
  }
}
```

#### `BalanceChannel`
Subscribe to balance updates.

`balance_updated`:
```json
{
  "type": "balance_updated",
  "data": {
    "total_usd": "127.50",
    "change_usd": "+2.25",
    "reason": "rewards_earned"
  }
}
```

---

## Rate Limits

Enforced via `rack-attack` with Redis-backed counters per IP.

| Endpoint Pattern | Limit |
|------------------|-------|
| `/auth/email/send` | 5/min per IP |
| `/auth/email/verify` | 5/min per IP |
| `/auth/wallet/*` | 10/min per IP |

Additionally, OTP verification is limited to 5 attempts per `verification_id`. After 5 wrong codes, the OTP is invalidated and the user must request a new one.

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1708088400
```

---

## Pagination

All list endpoints support:
- `page` (default: 1)
- `per_page` (default: 20, max: 100)

Response includes:
```json
{
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

---

## Idempotency

For `POST` requests that create resources or execute actions, include:
```
Idempotency-Key: <unique-string>
```

Duplicate requests with the same key within 24 hours return the original response.
