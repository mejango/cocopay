# frozen_string_literal: true

FactoryBot.define do
  factory :signing_key do
    user
    address { "0x" + SecureRandom.hex(20) }
    encrypted_private_key { "encrypted_placeholder" }
    is_active { true }
  end
end
