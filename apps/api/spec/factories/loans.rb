# frozen_string_literal: true

FactoryBot.define do
  factory :loan do
    user
    chain_id { "8453" }
    sequence(:loan_id_onchain) { |n| n }
    collateral { 100_000_000_000_000_000_000 }
    collateral_usd_at_origination { 100.00 }
    borrow_amount { 50_000_000 }
    borrow_amount_usd { 50.00 }
    prepaid_fee_percent { 500 }
    prepaid_duration_seconds { 86_400 * 30 }
    project_id { rand(1..1000) }
    token_address { "0x#{SecureRandom.hex(20)}" }
    origination_tx_hash { "0x#{SecureRandom.hex(32)}" }
    is_active { true }

    trait :repaid do
      is_active { false }
      repaid_at { Time.current }
      repayment_tx_hash { "0x#{SecureRandom.hex(32)}" }
    end
  end
end
