# frozen_string_literal: true

class StoreDeploymentJob < ApplicationJob
  queue_as :default

  def perform(store_id, user_id)
    store = Store.find(store_id)
    user = User.find(user_id)

    return unless user.managed?

    smart_account = user.smart_accounts.first
    return unless smart_account

    Rails.logger.info "Deploying revnet for store #{store.name} (#{store_id}) via Relayr balance bundle"

    # Build revnet deployment transactions for all target chains
    chain_ids = [8453, 10, 42161, 1] # Base, Optimism, Arbitrum, Ethereum
    transactions = chain_ids.map do |chain_id|
      {
        chain_id: chain_id,
        target: "0x2ca27bde7e7d33e353b44c27acfcf6c78dde251d", # REVDeployer
        data: "0x", # Encoded deployFor calldata - built by RelayrService
        value: "0"
      }
    end

    result = RelayrService.create_balance_bundle(
      transactions: transactions,
      user: user,
      smart_account_address: smart_account.address
    )

    store.update!(
      deployment_status: "deploying",
      deployment_bundle_id: result[:bundle_id]
    )

    Rails.logger.info "Relayr bundle created: #{result[:bundle_id]} for store #{store_id}"
  rescue StandardError => e
    Rails.logger.error "Store deployment failed for #{store_id}: #{e.message}"
    Store.find_by(id: store_id)&.update(deployment_status: "failed")
    raise
  end
end
