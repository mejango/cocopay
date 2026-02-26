# CocoPay

A payment platform with Rails 8 API backend and React Native mobile app.

## Structure

```
cocopay/
├── apps/
│   ├── api/          # Rails 8 API
│   └── mobile/       # React Native + Expo
├── contracts/        # Solidity (Foundry) — CocoPayRouter
├── docs/             # Documentation
└── docker-compose.yml
```

## Payment Architecture

Three payer types, all settling through Juicebox V5 terminals:

| Type | Auth | On-chain identity | Signing | Gas |
|------|------|-------------------|---------|-----|
| **Managed** (email) | Magic link | Smart account | Server signs ForwardRequest | Org pays via Relayr |
| **Self-custody** (wallet) | SIWE | Smart account | User signs ForwardRequest | Org pays via Relayr |
| **External** (no account) | None | User's EOA | User signs tx directly | User pays |

- **Smart accounts**: Both managed and wallet users get a counterfactual `ForwardableSimpleAccount` provisioned on login. Transactions are routed through the ERC-2771 forwarder with Relayr balance bundles (org-sponsored gas).
- **CocoPayRouter**: External wallets can pay any store's Juicebox project via `payProject()` (approve-based), `payProjectWithPermit2()` (single-signature), or `payProjectETH()` (native). Stateless, immutable, deployed via CREATE2 at the same address on all chains.

## Prerequisites

- Docker & Docker Compose
- Ruby 3.3+ (for local API development)
- Node.js 20+ (for mobile development)
- Expo CLI (`npm install -g expo-cli`)
- Foundry (`curl -L https://foundry.paradigm.xyz | bash`) — for contract development

## Quick Start

### Start All Services

```bash
docker compose up -d
```

This starts:
- PostgreSQL 16 on port 5432
- Redis 7 on port 6379
- Rails API on port 3000

### Run API Tests

```bash
docker compose exec api bundle exec rspec
```

### Run Migrations

```bash
docker compose exec api rails db:migrate
```

### Start Mobile App

```bash
cd apps/mobile
npm install
npx expo start
```

## Development

### API Development

```bash
cd apps/api
bundle install
rails db:setup
rails server
```

### Mobile Development

```bash
cd apps/mobile
npm install
npx expo start
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

See `docs/ENV.md` for details on all environment variables.

### Run Contract Tests

```bash
cd contracts
forge test -vv
```

### Deploy CocoPayRouter

```bash
cd contracts
DEPLOYER_PRIVATE_KEY=0x... forge script script/DeployRouter.s.sol --rpc-url $BASE_RPC_URL --broadcast
```

## Documentation

- [API Specification](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Environment Variables](docs/ENV.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
