# frozen_string_literal: true

FactoryBot.define do
  factory :session do
    user
    token_hash { Digest::SHA256.hexdigest(SecureRandom.hex(32)) }
    auth_method { "email" }
    expires_at { 30.days.from_now }
    device_info { { platform: "ios", os: "17.0", app_version: "1.0.0" } }
    ip_address { Faker::Internet.ip_v4_address }

    trait :expired do
      expires_at { 1.day.ago }
    end

    trait :revoked do
      revoked_at { 1.hour.ago }
    end
  end
end
