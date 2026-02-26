# frozen_string_literal: true

class PaymentExecutionJob < ApplicationJob
  queue_as :default

  # @param transaction_id [String] UUID of the Transaction record
  # @param user_id [String] UUID of the User
  # @param calldata_array [Array<Hash>] Raw calldata from client ({chain_id, target, data, value})
  # @param signed_forward_requests [Array<Hash>, nil] Pre-signed forwarder.execute calldata (self-custody only)
  def perform(transaction_id, user_id, calldata_array, signed_forward_requests = nil)
    transaction = Transaction.find(transaction_id)
    user = User.find(user_id)

    Rails.logger.info "Executing payment #{transaction_id} for user #{user_id}"

    result = if signed_forward_requests.present?
               # Self-custody path: client already signed ForwardRequests
               execute_self_custody(signed_forward_requests)
             else
               # Managed path: server wraps calldata in SmartAccount.execute + signs ForwardRequest
               execute_managed(user, calldata_array)
             end

    transaction.update!(bundle_id: result[:bundle_id])

    Rails.logger.info "Relayr bundle created: #{result[:bundle_id]} for payment #{transaction_id}"

    # Queue status polling
    BundleStatusJob.perform_later(transaction_id, result[:bundle_id])
  rescue StandardError => e
    Rails.logger.error "Payment execution failed for #{transaction_id}: #{e.message}"
    Transaction.find_by(id: transaction_id)&.fail!(
      code: "EXECUTION_FAILED",
      message: e.message
    )
  end

  private

  def execute_managed(user, calldata_array)
    smart_account = user.smart_accounts.first
    unless smart_account
      raise "User has no smart account"
    end

    transactions = calldata_array.map do |tx|
      {
        chain_id: tx["chain_id"].to_i,
        target: tx["target"],
        data: tx["data"],
        value: tx["value"] || "0"
      }
    end

    RelayrService.create_balance_bundle(
      transactions: transactions,
      user: user,
      smart_account_address: smart_account.address
    )
  end

  def execute_self_custody(signed_forward_requests)
    requests = signed_forward_requests.map do |req|
      {
        chain_id: req["chain_id"].to_i,
        data: req["data"]
      }
    end

    RelayrService.create_balance_bundle_with_signed_requests(
      signed_requests: requests
    )
  end
end
