# CocoPay

A payment platform with Rails 8 API backend and React Native mobile app.

## Structure

```
cocopay/
├── apps/
│   ├── api/          # Rails 8 API
│   └── mobile/       # React Native + Expo
├── docs/             # Documentation
└── docker-compose.yml
```

## Prerequisites

- Docker & Docker Compose
- Ruby 3.3+ (for local API development)
- Node.js 20+ (for mobile development)
- Expo CLI (`npm install -g expo-cli`)

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

## Documentation

- [API Specification](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Environment Variables](docs/ENV.md)
