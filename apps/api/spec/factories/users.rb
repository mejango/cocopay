# frozen_string_literal: true

FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    name { Faker::Name.name }
    last_active_at { Time.current }
    preferred_chain_id { "8453" }
    locale { "pt-BR" }

    trait :verified do
      email_verified_at { Time.current }
    end

    trait :wallet_user do
      email { nil }
      wallet_address { "0x" + SecureRandom.hex(20) }
    end

    factory :wallet_user, traits: [:wallet_user]
  end
end
