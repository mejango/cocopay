# frozen_string_literal: true

FactoryBot.define do
  factory :user do
    sequence(:phone) { |n| "+5548999#{n.to_s.rjust(6, '0')}" }
    sequence(:email) { |n| "user#{n}@example.com" }
    name { Faker::Name.name }
    last_active_at { Time.current }
    preferred_chain_id { "8453" }
    locale { "pt-BR" }

    trait :verified do
      phone_verified_at { Time.current }
      email_verified_at { Time.current }
    end

    trait :phone_only do
      email { nil }
    end

    trait :email_only do
      phone { nil }
    end

    trait :with_backup do
      backup_owner_phone { "+5548988888888" }
    end
  end
end
