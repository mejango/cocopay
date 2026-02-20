# frozen_string_literal: true

FactoryBot.define do
  factory :payout do
    store
    association :requester, factory: :user
    amount_usd { Faker::Number.decimal(l_digits: 3, r_digits: 2) }
    fee_usd { 0.50 }
    payout_type { "pix" }
    destination { { pix_key: Faker::Internet.email } }
    status { "pending" }

    trait :processing do
      status { "processing" }
    end

    trait :completed do
      status { "completed" }
      external_id { SecureRandom.uuid }
      processed_at { Time.current }
    end

    trait :failed do
      status { "failed" }
      error_message { "PIX transfer failed" }
    end

    trait :bank do
      payout_type { "bank" }
      destination { { bank_code: "001", account: "12345-6", agency: "1234" } }
    end
  end
end
