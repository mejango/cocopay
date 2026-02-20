# frozen_string_literal: true

FactoryBot.define do
  factory :store_deployment do
    store
    chain_id { "8453" }
    status { "pending" }

    trait :deployed do
      status { "deployed" }
      project_id { rand(1..1000) }
      token_address { "0x#{SecureRandom.hex(20)}" }
      terminal_address { "0x#{SecureRandom.hex(20)}" }
      deploy_tx_hash { "0x#{SecureRandom.hex(32)}" }
      deployed_at { Time.current }
    end

    trait :failed do
      status { "failed" }
      error_message { "Deployment failed: insufficient gas" }
    end
  end
end
