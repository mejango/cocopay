# frozen_string_literal: true

class BundleStatusJob < ApplicationJob
  queue_as :default

  MAX_ATTEMPTS = 60       # 60 * 5s = 5 minute timeout
  POLL_INTERVAL = 5.seconds

  def perform(transaction_id, bundle_id, attempt = 1)
    transaction = Transaction.find(transaction_id)

    # Skip if already terminal
    return if transaction.status.in?(%w[confirmed failed])

    Rails.logger.info "Polling bundle #{bundle_id} for payment #{transaction_id} (attempt #{attempt}/#{MAX_ATTEMPTS})"

    bundle_status = RelayrService.get_bundle_status(bundle_id)
    tx_statuses = bundle_status["transactions"] || []

    all_success = tx_statuses.all? { |tx| tx["status"] == "Success" }
    any_failed = tx_statuses.any? { |tx| tx["status"].in?(%w[Invalid Reverted Cancelled]) }

    if all_success
      # Extract tx_hash and block_number from first successful transaction
      first_tx = tx_statuses.first || {}
      transaction.confirm!(
        tx_hash: first_tx["tx_hash"],
        block_number: first_tx["block_number"]
      )
      Rails.logger.info "Payment #{transaction_id} confirmed: #{first_tx['tx_hash']}"

    elsif any_failed
      failed_tx = tx_statuses.find { |tx| tx["status"].in?(%w[Invalid Reverted Cancelled]) }
      transaction.fail!(
        code: "BUNDLE_FAILED",
        message: "Transaction #{failed_tx['status']}: #{failed_tx['error'] || 'unknown error'}"
      )
      Rails.logger.error "Payment #{transaction_id} failed: #{failed_tx['status']}"

    elsif attempt >= MAX_ATTEMPTS
      transaction.fail!(
        code: "BUNDLE_TIMEOUT",
        message: "Bundle did not complete within #{MAX_ATTEMPTS * POLL_INTERVAL.to_i}s"
      )
      Rails.logger.error "Payment #{transaction_id} timed out after #{attempt} attempts"

    else
      # Still pending — re-enqueue
      BundleStatusJob.set(wait: POLL_INTERVAL).perform_later(
        transaction_id, bundle_id, attempt + 1
      )
    end
  rescue StandardError => e
    Rails.logger.error "Bundle status check failed for #{transaction_id}: #{e.message}"

    if attempt >= MAX_ATTEMPTS
      Transaction.find_by(id: transaction_id)&.fail!(
        code: "STATUS_CHECK_FAILED",
        message: e.message
      )
    else
      # Retry on transient errors
      BundleStatusJob.set(wait: POLL_INTERVAL).perform_later(
        transaction_id, bundle_id, attempt + 1
      )
    end
  end
end
