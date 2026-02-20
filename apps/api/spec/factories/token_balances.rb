# frozen_string_literal: true

FactoryBot.define do
  factory :token_balance do
    user
    chain_id { "8453" }
    sequence(:token_address) { |n| "0x#{n.to_s.rjust(40, '0')}" }
    balance { 1_000_000_000_000_000_000 }
    balance_usd { 100.00 }
    last_synced_at { Time.current }
    last_synced_block { rand(10_000_000..20_000_000) }

    trait :usdc do
      token_address { "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" }
      store { nil }
    end

    trait :store_token do
      association :store
    end
  end
end
