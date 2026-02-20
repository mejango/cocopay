# frozen_string_literal: true

FactoryBot.define do
  factory :store_member do
    store
    user
    role { "staff" }
    invited_at { Time.current }
    accepted_at { Time.current }

    trait :owner do
      role { "owner" }
    end

    trait :admin do
      role { "admin" }
    end

    trait :pending do
      accepted_at { nil }
    end
  end
end
