# CocoPay API Specification

> RESTful API for CocoPay mobile and web clients

---

## Base URLs

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:3000/api/v1` |
| Staging | `https://api-staging.cocopay.app/api/v1` |
| Production | `https://api.cocopay.app/api/v1` |

---

## Authentication

All authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
```

Tokens are obtained via `/auth/session` after phone/passkey verification.

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

---

## Endpoints

### Authentication

#### `POST /auth/phone/send`
Send OTP to phone number.

**Request:**
```json
{
  "phone": "+5548999999999"
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

#### `POST /auth/phone/verify`
Verify OTP and create session.

**Request:**
```json
{
  "verification_id": "abc123",
  "code": "123456"
}
```

**Response:**
```json
{
  "data": {
    "token": "eyJ...",
    "user": {
      "id": "user_123",
      "phone": "+5548999999999",
      "created_at": "2026-02-16T12:00:00Z"
    },
    "is_new_user": true
  }
}
```

---

#### `POST /auth/passkey/register`
Register a new passkey for the authenticated user.

**Request:**
```json
{
  "credential_id": "base64...",
  "public_key": "base64...",
  "attestation": "base64..."
}
```

**Response:**
```json
{
  "data": {
    "passkey_id": "pk_123",
    "created_at": "2026-02-16T12:00:00Z"
  }
}
```

---

#### `POST /auth/passkey/authenticate`
Authenticate with passkey.

**Request:**
```json
{
  "credential_id": "base64...",
  "signature": "base64...",
  "client_data": "base64..."
}
```

**Response:**
```json
{
  "data": {
    "token": "eyJ...",
    "user": { ... }
  }
}
```

---

#### `POST /auth/wallet/link`
Link a passkey-derived wallet to the user's smart account.

**Request:**
```json
{
  "derived_address": "0x...",
  "encrypted_signing_key": "base64..."
}
```

**Response:**
```json
{
  "data": {
    "smart_account_address": "0x...",
    "chains": [1, 10, 8453, 42161]
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
    "phone": "+5548999999999",
    "name": "João Silva",
    "smart_account_address": "0x...",
    "backup_owner_phone": "+5548888888888",
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
  "name": "João Silva",
  "backup_owner_phone": "+5548888888888"
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

#### `POST /payments`
Execute a payment.

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
      "phone": "+5548777777777",
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
  "phone": "+5548777777777",
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

Connect to: `wss://api.cocopay.app/cable`

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

| Endpoint Pattern | Limit |
|------------------|-------|
| `/auth/*` | 10/min |
| `/payments/*` | 30/min |
| `/stores/*` | 60/min |
| `/my-store/*` | 60/min |
| All others | 120/min |

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
