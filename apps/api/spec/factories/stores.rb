# frozen_string_literal: true

FactoryBot.define do
  factory :store do
    sequence(:name) { |n| "Store #{n}" }
    sequence(:symbol) { |n| "ST#{n}" }
    category { "Coffee & Pastries" }
    description { Faker::Lorem.paragraph }
    deployment_status { "pending" }

    trait :with_location do
      latitude { -27.5969 }
      longitude { -48.5495 }
      address { "Rua das Flores, 123, Florianópolis, SC" }
    end

    trait :deployed do
      deployment_status { "deployed" }
      sequence(:short_code) { |n| "CAFE#{n}" }
    end

    trait :with_owner do
      after(:create) do |store|
        create(:store_member, store: store, role: "owner")
      end
    end
  end
end
