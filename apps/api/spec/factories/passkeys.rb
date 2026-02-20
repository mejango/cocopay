# frozen_string_literal: true

FactoryBot.define do
  factory :passkey do
    user
    sequence(:credential_id) { |n| Base64.strict_encode64("credential_#{n}") }
    public_key { SecureRandom.random_bytes(65) }
    sign_count { 0 }
    device_name { "iPhone 15 Pro" }

    trait :with_derived_address do
      derived_address { "0x#{SecureRandom.hex(20)}" }
    end
  end
end
