# frozen_string_literal: true

FactoryBot.define do
  factory :transaction do
    association :from_user, factory: :user
    association :store
    transaction_type { "payment" }
    status { "pending" }
    amount_usd { Faker::Number.decimal(l_digits: 2, r_digits: 2) }
    chain_id { "8453" }

    trait :confirmed do
      status { "confirmed" }
      tx_hash { "0x#{SecureRandom.hex(32)}" }
      block_number { rand(10_000_000..20_000_000) }
      confirmed_at { Time.current }
    end

    trait :failed do
      status { "failed" }
      error_code { "BUNDLE_FAILED" }
      error_message { "Transaction reverted" }
    end

    trait :payout do
      transaction_type { "payout" }
    end

    trait :received do
      transaction_type { "received" }
      association :to_user, factory: :user
    end
  end
end
