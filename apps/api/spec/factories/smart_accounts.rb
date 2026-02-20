# frozen_string_literal: true

FactoryBot.define do
  factory :smart_account do
    user
    chain_id { "8453" }
    sequence(:address) { |n| "0x#{n.to_s.rjust(40, '0')}" }
    salt { "0x#{SecureRandom.hex(32)}" }
    owner_address { "0x#{SecureRandom.hex(20)}" }
    custody_status { "managed" }
    deployed { false }

    trait :deployed do
      deployed { true }
      deploy_tx_hash { "0x#{SecureRandom.hex(32)}" }
      deployed_at { Time.current }
    end

    trait :self_custody do
      custody_status { "self_custody" }
    end
  end
end
