# CocoPay Testing Strategy

> Test-Driven Development with comprehensive unit, integration, and end-to-end coverage

---

## Philosophy

**Test-Driven Development (TDD):**
1. Write failing test first
2. Write minimal code to pass
3. Refactor with confidence

**No code ships without tests.** Every PR must include tests for new functionality.

---

## Testing Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  10%  - Critical user journeys
                    │   Tests     │        - Slow, expensive
                    ├─────────────┤
                    │ Integration │  30%  - API endpoints
                    │   Tests     │        - Service interactions
                    ├─────────────┤
                    │    Unit     │  60%  - Business logic
                    │   Tests     │        - Fast, isolated
                    └─────────────┘
```

---

## Backend Testing (Rails)

### Test Stack

| Tool | Purpose |
|------|---------|
| RSpec | Test framework |
| FactoryBot | Test data factories |
| Faker | Realistic fake data |
| VCR | HTTP request recording |
| WebMock | HTTP request stubbing |
| DatabaseCleaner | Test isolation |
| SimpleCov | Code coverage |

### Directory Structure

```
spec/
├── models/              # Unit tests for ActiveRecord models
├── services/            # Unit tests for service objects
├── requests/            # Integration tests for API endpoints
├── channels/            # ActionCable WebSocket tests
├── jobs/                # Background job tests
├── lib/                 # Library code tests
├── factories/           # FactoryBot factories
├── support/             # Test helpers
│   ├── blockchain_helpers.rb
│   ├── auth_helpers.rb
│   └── vcr_setup.rb
└── fixtures/
    └── vcr_cassettes/   # Recorded HTTP responses
```

### Unit Tests

#### Models

```ruby
# spec/models/user_spec.rb
RSpec.describe User, type: :model do
  describe "validations" do
    it { should validate_presence_of(:phone) }
    it { should validate_uniqueness_of(:phone) }
    it { should have_many(:transactions) }
    it { should have_one(:store).through(:store_membership) }
  end

  describe "#total_balance_usd" do
    let(:user) { create(:user) }

    before do
      create(:token_balance, user: user, amount_usd: 50.00)
      create(:token_balance, user: user, amount_usd: 35.00)
    end

    it "returns sum of all token balances" do
      expect(user.total_balance_usd).to eq(85.00)
    end
  end

  describe "#available_bonus" do
    context "with existing loans" do
      it "calculates refinancing headroom" do
        # Test implementation
      end
    end

    context "with uncollateralized tokens" do
      it "includes borrowable amount" do
        # Test implementation
      end
    end
  end
end
```

#### Services

```ruby
# spec/services/payment_service_spec.rb
RSpec.describe PaymentService do
  describe "#preview" do
    let(:user) { create(:user, :with_balances) }
    let(:store) { create(:store) }

    subject { described_class.new(user).preview(store_id: store.id, amount_usd: 45.00) }

    it "calculates optimal token mix" do
      expect(subject.tokens_to_use).to be_present
      expect(subject.total_usd).to eq(45.00)
    end

    it "prioritizes store's own tokens" do
      create(:token_balance, user: user, store: store, amount_usd: 30.00)
      expect(subject.tokens_to_use.first.store_id).to eq(store.id)
    end

    it "estimates rewards earned" do
      expect(subject.rewards_to_earn.amount_usd).to be > 0
    end
  end

  describe "#execute" do
    let(:user) { create(:user, :with_smart_account) }
    let(:store) { create(:store, :deployed) }

    context "with sufficient balance" do
      before do
        create(:token_balance, user: user, amount_usd: 100.00)
        stub_relayr_bundle_success
      end

      it "creates a transaction record" do
        expect { described_class.new(user).execute(store_id: store.id, amount_usd: 45.00) }
          .to change(Transaction, :count).by(1)
      end

      it "submits bundle to Relayr" do
        expect(RelayrClient).to receive(:submit_bundle)
        described_class.new(user).execute(store_id: store.id, amount_usd: 45.00)
      end

      it "generates confirmation code" do
        tx = described_class.new(user).execute(store_id: store.id, amount_usd: 45.00)
        expect(tx.confirmation_code).to match(/^[A-Z0-9]{6}$/)
      end
    end

    context "with insufficient balance" do
      it "raises InsufficientBalanceError" do
        expect { described_class.new(user).execute(store_id: store.id, amount_usd: 1000.00) }
          .to raise_error(PaymentService::InsufficientBalanceError)
      end
    end
  end
end
```

#### Blockchain Services

```ruby
# spec/services/smart_account_service_spec.rb
RSpec.describe SmartAccountService do
  describe "#compute_address" do
    it "returns deterministic address for user" do
      address1 = described_class.compute_address(user_id: "user_123", chain_id: 8453)
      address2 = described_class.compute_address(user_id: "user_123", chain_id: 8453)
      expect(address1).to eq(address2)
    end

    it "returns different address for different users" do
      address1 = described_class.compute_address(user_id: "user_123", chain_id: 8453)
      address2 = described_class.compute_address(user_id: "user_456", chain_id: 8453)
      expect(address1).not_to eq(address2)
    end

    it "uses correct factory address" do
      expect(described_class).to receive(:call_factory)
        .with(hash_including(factory: SmartAccountService::FACTORY_ADDRESS))
      described_class.compute_address(user_id: "user_123", chain_id: 8453)
    end
  end
end
```

#### Token Calculations

```ruby
# spec/services/bonding_curve_service_spec.rb
RSpec.describe BondingCurveService do
  describe "#tokens_for_usd" do
    let(:service) { described_class.new(surplus: 1000, supply: 10_000_000, tax_rate: 0.1) }

    it "calculates correct token amount" do
      tokens = service.tokens_for_usd(15.00)
      # Verify with inverse calculation
      usd_back = service.usd_for_tokens(tokens)
      expect(usd_back).to be_within(0.01).of(15.00)
    end

    context "with zero tax rate" do
      let(:service) { described_class.new(surplus: 1000, supply: 10_000_000, tax_rate: 0) }

      it "uses linear formula" do
        tokens = service.tokens_for_usd(10.00)
        expect(tokens).to eq(100_000) # 10/1000 * 10_000_000
      end
    end

    context "edge cases" do
      it "handles very small amounts" do
        tokens = service.tokens_for_usd(0.01)
        expect(tokens).to be > 0
      end

      it "raises error for amount exceeding surplus" do
        expect { service.tokens_for_usd(2000.00) }
          .to raise_error(BondingCurveService::InsufficientSurplusError)
      end
    end
  end
end
```

### Integration Tests

#### API Endpoints

```ruby
# spec/requests/payments_spec.rb
RSpec.describe "Payments API", type: :request do
  let(:user) { create(:user, :with_smart_account, :with_balances) }
  let(:store) { create(:store, :deployed) }
  let(:headers) { auth_headers(user) }

  describe "POST /api/v1/payments/preview" do
    it "returns payment preview" do
      post "/api/v1/payments/preview",
        params: { store_id: store.id, amount_usd: 45.00, chain_id: 8453 },
        headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response["data"]["amount_usd"]).to eq("45.00")
      expect(json_response["data"]["tokens_to_use"]).to be_present
    end

    it "returns error for insufficient balance" do
      post "/api/v1/payments/preview",
        params: { store_id: store.id, amount_usd: 10000.00, chain_id: 8453 },
        headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response["error"]["code"]).to eq("INSUFFICIENT_BALANCE")
    end
  end

  describe "POST /api/v1/payments" do
    before { stub_relayr_bundle_success }

    it "creates payment and returns confirmation code" do
      # First get preview
      post "/api/v1/payments/preview",
        params: { store_id: store.id, amount_usd: 45.00, chain_id: 8453 },
        headers: headers
      preview_token = json_response["data"]["preview_token"]

      # Execute payment
      post "/api/v1/payments",
        params: { store_id: store.id, amount_usd: 45.00, chain_id: 8453, preview_token: preview_token },
        headers: headers

      expect(response).to have_http_status(:created)
      expect(json_response["data"]["confirmation_code"]).to match(/^[A-Z0-9]{6}$/)
      expect(json_response["data"]["status"]).to eq("pending")
    end

    it "is idempotent with same idempotency key" do
      post "/api/v1/payments/preview",
        params: { store_id: store.id, amount_usd: 45.00, chain_id: 8453 },
        headers: headers
      preview_token = json_response["data"]["preview_token"]

      2.times do
        post "/api/v1/payments",
          params: { store_id: store.id, amount_usd: 45.00, chain_id: 8453, preview_token: preview_token },
          headers: headers.merge("Idempotency-Key" => "unique-key-123")
      end

      expect(Transaction.count).to eq(1)
    end
  end
end
```

#### WebSocket Tests

```ruby
# spec/channels/payments_channel_spec.rb
RSpec.describe PaymentsChannel, type: :channel do
  let(:user) { create(:user) }
  let(:store) { create(:store, owner: user) }

  before { stub_connection current_user: user }

  describe "subscription" do
    it "subscribes to user's payment stream" do
      subscribe
      expect(subscription).to be_confirmed
    end
  end

  describe "payment_received broadcast" do
    it "receives notification when payment is made to store" do
      subscribe

      perform_enqueued_jobs do
        PaymentNotificationJob.perform_later(
          type: "payment_received",
          store_id: store.id,
          data: { amount_usd: "25.00", payer_name: "João" }
        )
      end

      expect(transmissions.last).to include(
        "type" => "payment_received",
        "data" => hash_including("amount_usd" => "25.00")
      )
    end
  end
end
```

### External Service Mocking

```ruby
# spec/support/blockchain_helpers.rb
module BlockchainHelpers
  def stub_relayr_bundle_success
    stub_request(:post, "https://api.relayr.ba5ed.com/v1/bundle/prepaid")
      .to_return(
        status: 200,
        body: {
          bundle_uuid: "test-bundle-123",
          payment_info: [{ chain: 8453, amount: "1000000000000000", target: "0x..." }]
        }.to_json
      )

    stub_request(:get, /api\.relayr\.ba5ed\.com\/v1\/bundle\//)
      .to_return(
        status: 200,
        body: {
          bundle_uuid: "test-bundle-123",
          transactions: [{ chain: 8453, status: "Success", tx_hash: "0x123..." }]
        }.to_json
      )
  end

  def stub_alchemy_rpc
    stub_request(:post, /alchemy\.com/)
      .to_return(status: 200, body: { result: "0x" }.to_json)
  end
end

RSpec.configure do |config|
  config.include BlockchainHelpers
end
```

---

## Mobile Testing (React Native)

### Test Stack

| Tool | Purpose |
|------|---------|
| Jest | Test framework |
| React Native Testing Library | Component testing |
| MSW (Mock Service Worker) | API mocking |
| Detox | E2E testing |

### Directory Structure

```
src/
├── __tests__/
│   ├── components/
│   ├── screens/
│   ├── hooks/
│   └── utils/
├── e2e/
│   ├── firstPayment.test.ts
│   ├── merchantReceive.test.ts
│   └── support/
└── mocks/
    └── handlers.ts     # MSW handlers
```

### Unit Tests

```typescript
// src/__tests__/utils/bondingCurve.test.ts
import { calculateTokensForUsd, calculateUsdForTokens } from '../../utils/bondingCurve'

describe('Bonding Curve Calculations', () => {
  const state = {
    surplus: BigInt(1000 * 10**6),  // $1000 USDC
    supply: BigInt(10_000_000 * 10**18),
    taxRate: 1000  // 0.1
  }

  it('calculates tokens for USD amount', () => {
    const tokens = calculateTokensForUsd(BigInt(15 * 10**6), state)
    expect(tokens).toBeGreaterThan(0n)
  })

  it('inverse calculation returns original USD', () => {
    const targetUsd = BigInt(15 * 10**6)
    const tokens = calculateTokensForUsd(targetUsd, state)
    const usdBack = calculateUsdForTokens(tokens, state)

    // Within 0.01 USD tolerance
    expect(Number(usdBack - targetUsd)).toBeLessThan(10000)
  })
})
```

### Component Tests

```typescript
// src/__tests__/components/BalanceCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native'
import { BalanceCard } from '../../components/BalanceCard'

describe('BalanceCard', () => {
  const mockBalance = {
    total_usd: '127.50',
    breakdown: [
      { type: 'usdc', label: 'Dollars', amount_usd: '50.00' },
      { type: 'store_token', label: 'Café da Praia', amount_usd: '35.00' }
    ]
  }

  it('displays total balance', () => {
    render(<BalanceCard balance={mockBalance} />)
    expect(screen.getByText('$127.50')).toBeTruthy()
  })

  it('expands to show breakdown on tap', () => {
    render(<BalanceCard balance={mockBalance} />)

    fireEvent.press(screen.getByText('$127.50'))

    expect(screen.getByText('Dollars')).toBeTruthy()
    expect(screen.getByText('$50.00')).toBeTruthy()
    expect(screen.getByText('Café da Praia')).toBeTruthy()
  })
})
```

### Screen Tests

```typescript
// src/__tests__/screens/PaymentScreen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import { PaymentScreen } from '../../screens/PaymentScreen'
import { server } from '../../mocks/server'
import { rest } from 'msw'

describe('PaymentScreen', () => {
  it('shows payment preview', async () => {
    render(<PaymentScreen route={{ params: { storeId: 'store_123' } }} />)

    fireEvent.changeText(screen.getByPlaceholderText('Amount'), '45.00')
    fireEvent.press(screen.getByText('Preview'))

    await waitFor(() => {
      expect(screen.getByText('You\'ll earn')).toBeTruthy()
      expect(screen.getByText('~$2.25')).toBeTruthy()
    })
  })

  it('shows error for insufficient balance', async () => {
    server.use(
      rest.post('*/payments/preview', (req, res, ctx) => {
        return res(ctx.status(422), ctx.json({
          error: { code: 'INSUFFICIENT_BALANCE', message: 'Not enough funds' }
        }))
      })
    )

    render(<PaymentScreen route={{ params: { storeId: 'store_123' } }} />)

    fireEvent.changeText(screen.getByPlaceholderText('Amount'), '10000.00')
    fireEvent.press(screen.getByText('Preview'))

    await waitFor(() => {
      expect(screen.getByText('Not enough funds')).toBeTruthy()
    })
  })
})
```

---

## End-to-End Tests

### Critical User Journeys

| Journey | Priority | Coverage |
|---------|----------|----------|
| First payment (new user) | P0 | Full |
| Merchant receives payment | P0 | Full |
| Claim bonus | P0 | Full |
| Create store | P1 | Full |
| Cross-chain consolidation | P1 | Full |
| Team management | P2 | Happy path |

### Detox E2E Tests

```typescript
// e2e/firstPayment.test.ts
describe('First Payment Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true })
  })

  it('should complete first payment as new user', async () => {
    // Onboarding
    await element(by.text('Get Started')).tap()
    await element(by.id('phone-input')).typeText('+5548999999999')
    await element(by.text('Send Code')).tap()

    // OTP verification (using test code)
    await element(by.id('otp-input')).typeText('123456')

    // Should see empty balance
    await expect(element(by.text('$0.00'))).toBeVisible()

    // Scan store QR (simulated)
    await element(by.text('Pay')).tap()
    await element(by.id('manual-entry')).tap()
    await element(by.id('store-code-input')).typeText('CAFE123')

    // Enter amount
    await element(by.id('amount-input')).typeText('25.00')
    await element(by.text('Preview')).tap()

    // Confirm payment
    await expect(element(by.text('Paying Café da Praia'))).toBeVisible()
    await expect(element(by.text('$25.00'))).toBeVisible()
    await element(by.text('Confirm Payment')).tap()

    // Biometric prompt (auto-approved in test)

    // Success screen
    await waitFor(element(by.text('Paid!')))
      .toBeVisible()
      .withTimeout(10000)
    await expect(element(by.id('confirmation-code'))).toBeVisible()
  })
})
```

```typescript
// e2e/merchantReceive.test.ts
describe('Merchant Payment Receipt', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      userDefaults: { isStoreOwner: true }
    })
  })

  it('should receive payment notification', async () => {
    // Navigate to store dashboard
    await element(by.text('More')).tap()
    await element(by.text('My Store')).tap()

    // Verify dashboard loads
    await expect(element(by.text('Today\'s Sales'))).toBeVisible()

    // Trigger test payment (via API in test helper)
    await triggerTestPayment({ storeId: 'test_store', amount: 25.00 })

    // Should receive real-time notification
    await waitFor(element(by.text('$25.00 from João')))
      .toBeVisible()
      .withTimeout(5000)

    // Should update today's sales
    await expect(element(by.text('$25.00'))).toBeVisible()
  })
})
```

### CI Pipeline E2E

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd apps/mobile
          npm ci
          cd ios && pod install

      - name: Build for testing
        run: |
          cd apps/mobile
          npx detox build --configuration ios.sim.release

      - name: Run E2E tests
        run: |
          cd apps/mobile
          npx detox test --configuration ios.sim.release

  e2e-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          java-version: '17'

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run Android emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 31
          script: |
            cd apps/mobile
            npm ci
            npx detox build --configuration android.emu.release
            npx detox test --configuration android.emu.release
```

---

## Test Data

### Factories (Backend)

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    phone { Faker::PhoneNumber.cell_phone_in_e164 }
    name { Faker::Name.name }

    trait :with_smart_account do
      after(:create) do |user|
        create(:smart_account, user: user, chain_id: 8453)
      end
    end

    trait :with_balances do
      after(:create) do |user|
        create(:token_balance, user: user, amount_usd: 50.00, type: :usdc)
        create(:token_balance, user: user, amount_usd: 35.00, store: create(:store))
      end
    end
  end
end

# spec/factories/stores.rb
FactoryBot.define do
  factory :store do
    name { Faker::Company.name }
    symbol { name.first(4).upcase }
    owner { association :user }

    trait :deployed do
      deployment_status { :deployed }
      revnet_project_id { rand(1..1000) }
      token_address { "0x#{SecureRandom.hex(20)}" }
    end
  end
end
```

### Mock Data (Mobile)

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw'

export const handlers = [
  rest.get('*/users/me/balance', (req, res, ctx) => {
    return res(ctx.json({
      data: {
        total_usd: '127.50',
        breakdown: [
          { type: 'usdc', label: 'Dollars', amount_usd: '50.00' },
          { type: 'store_token', label: 'Café da Praia', amount_usd: '35.00', store_id: 'store_123' }
        ],
        available_bonus: '12.50'
      }
    }))
  }),

  rest.post('*/payments/preview', (req, res, ctx) => {
    return res(ctx.json({
      data: {
        amount_usd: '45.00',
        tokens_to_use: [
          { store_id: 'store_123', amount_usd: '35.00' },
          { type: 'usdc', amount_usd: '10.00' }
        ],
        rewards_to_earn: { amount_usd: '2.25' },
        expires_at: new Date(Date.now() + 60000).toISOString()
      }
    }))
  })
]
```

---

## Coverage Requirements

| Layer | Minimum Coverage | Target |
|-------|------------------|--------|
| Models | 90% | 95% |
| Services | 85% | 90% |
| Controllers | 80% | 85% |
| Mobile Components | 75% | 85% |
| Mobile Screens | 70% | 80% |
| E2E Journeys | 100% critical | 100% |

### Coverage Reporting

```ruby
# spec/spec_helper.rb
require 'simplecov'

SimpleCov.start 'rails' do
  add_filter '/spec/'
  add_filter '/config/'

  add_group 'Models', 'app/models'
  add_group 'Services', 'app/services'
  add_group 'Controllers', 'app/controllers'
  add_group 'Channels', 'app/channels'

  minimum_coverage 80
  minimum_coverage_by_file 70
end
```

---

## Testnet Testing

### Blockchain Integration Tests

```ruby
# spec/integration/blockchain_spec.rb
RSpec.describe "Blockchain Integration", type: :integration do
  # These run against Sepolia testnets
  # Only in CI with BLOCKCHAIN_TESTS=true

  before(:all) do
    skip unless ENV['BLOCKCHAIN_TESTS'] == 'true'
  end

  describe "Smart Account" do
    it "computes correct address on Base Sepolia" do
      address = SmartAccountService.compute_address(
        user_id: "test_user",
        chain_id: 84532  # Base Sepolia
      )

      expect(address).to match(/^0x[a-fA-F0-9]{40}$/)
    end

    it "deploys account successfully" do
      result = SmartAccountService.deploy(
        user_id: "test_user",
        chain_id: 84532
      )

      expect(result.tx_hash).to be_present
      expect(result.deployed).to be true
    end
  end

  describe "Relayr Bundle" do
    it "submits and executes bundle" do
      bundle_id = RelayrClient.submit_bundle(
        transactions: [test_transaction],
        payment_chain: 84532
      )

      result = RelayrClient.wait_for_completion(bundle_id, timeout: 120)

      expect(result.status).to eq("Success")
      expect(result.tx_hash).to be_present
    end
  end
end
```

---

## Running Tests

### Commands

```bash
# Backend
cd apps/api

# Run all tests
bundle exec rspec

# Run specific test file
bundle exec rspec spec/services/payment_service_spec.rb

# Run with coverage
COVERAGE=true bundle exec rspec

# Run fast (skip slow integration tests)
bundle exec rspec --tag ~slow

# Run blockchain tests (requires testnet)
BLOCKCHAIN_TESTS=true bundle exec rspec spec/integration/

# Mobile
cd apps/mobile

# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run E2E (iOS)
npx detox test --configuration ios.sim.debug

# Run E2E (Android)
npx detox test --configuration android.emu.debug
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run fast tests before commit
cd apps/api && bundle exec rspec --tag ~slow --fail-fast
cd apps/mobile && npm test -- --onlyChanged
```

---

## CI Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true
          working-directory: apps/api

      - name: Setup database
        run: |
          cd apps/api
          bundle exec rails db:create db:migrate
        env:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/cocopay_test

      - name: Run tests
        run: |
          cd apps/api
          bundle exec rspec --format progress --format RspecJunitFormatter --out tmp/rspec.xml
        env:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/cocopay_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: apps/api/coverage/coverage.xml

  mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/mobile/package-lock.json

      - name: Install dependencies
        run: |
          cd apps/mobile
          npm ci

      - name: Run tests
        run: |
          cd apps/mobile
          npm test -- --coverage --ci

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: apps/mobile/coverage/lcov.info
```
