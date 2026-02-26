# frozen_string_literal: true

module Api
  module V1
    class WithdrawalsController < BaseController
      def execute
        # Idempotency: return existing transaction if key matches
        if params[:idempotency_key].present?
          existing = Transaction.find_by(idempotency_key: params[:idempotency_key])
          if existing
            return render_success({
              id: existing.id,
              status: existing.status,
              confirmation_code: existing.confirmation_code
            }, status: :ok)
          end
        end

        chain_id = params[:chain_id].to_i
        amount_usd = params[:amount_usd].to_d

        transaction = Transaction.create!(
          from_user: current_user,
          transaction_type: "withdrawal",
          amount_usd: amount_usd,
          chain_id: chain_id,
          tokens_used: {
            destination_address: params[:destination_address],
            amount: params[:amount]
          },
          idempotency_key: params[:idempotency_key] || SecureRandom.uuid
        )

        signed_requests = params[:signed_forward_requests]&.map(&:to_unsafe_h)

        PaymentExecutionJob.perform_later(
          transaction.id,
          current_user.id,
          params[:transactions].map(&:to_unsafe_h),
          signed_requests
        )

        render_success({
          id: transaction.id,
          status: transaction.status,
          confirmation_code: transaction.confirmation_code
        }, status: :created)
      rescue ActiveRecord::RecordInvalid => e
        render_error(
          code: "VALIDATION_ERROR",
          message: e.message,
          status: :unprocessable_entity
        )
      end

      def status
        transaction = Transaction.find(params[:id])

        render_success({
          id: transaction.id,
          status: transaction.status,
          tx_hash: transaction.tx_hash,
          block_number: transaction.block_number,
          confirmed_at: transaction.confirmed_at&.iso8601
        })
      end
    end
  end
end
