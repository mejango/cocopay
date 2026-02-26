# frozen_string_literal: true

module Api
  module V1
    class PaymentsController < BaseController
      def preview
        store = Store.find(params[:store_id])
        amount_usd = params[:amount_usd].to_d
        chain_id = params[:chain_id] || current_user.preferred_chain_id

        # Calculate optimal token mix
        tokens_to_use = calculate_token_mix(
          user: current_user,
          store: store,
          amount_usd: amount_usd,
          chain_id: chain_id
        )

        rewards = calculate_rewards(store, amount_usd)

        render_success({
          amount_usd: format("%.2f", amount_usd),
          tokens_to_use: tokens_to_use,
          rewards_to_earn: rewards,
          expires_at: 1.minute.from_now.iso8601
        })
      end

      def create
        store = Store.find(params[:store_id])
        amount_usd = params[:amount_usd].to_d
        chain_id = params[:chain_id] || current_user.preferred_chain_id

        transaction = Transaction.create!(
          from_user: current_user,
          store: store,
          transaction_type: "payment",
          amount_usd: amount_usd,
          chain_id: chain_id,
          idempotency_key: params[:idempotency_key]
        )

        # Queue payment execution job
        # PaymentExecutionJob.perform_later(transaction.id)

        render_success({
          id: transaction.id,
          status: transaction.status,
          confirmation_code: transaction.confirmation_code,
          created_at: transaction.created_at.iso8601
        }, status: :created)
      rescue ActiveRecord::RecordInvalid => e
        render_error(
          code: "VALIDATION_ERROR",
          message: e.message,
          status: :unprocessable_entity
        )
      end

      def execute
        store = Store.find(params[:store_id])
        amount_usd = params[:amount_usd].to_d
        chain_id = params[:chain_id].to_i

        transaction = Transaction.create!(
          from_user: current_user,
          store: store,
          transaction_type: "payment",
          amount_usd: amount_usd,
          chain_id: chain_id,
          tokens_used: params[:tokens_used]&.map(&:to_unsafe_h),
          idempotency_key: SecureRandom.uuid
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

      def show
        transaction = Transaction.find(params[:id])

        # Verify user has access
        unless [transaction.from_user_id, transaction.to_user_id].include?(current_user.id)
          return render_error(
            code: "FORBIDDEN",
            message: "You don't have access to this transaction",
            status: :forbidden
          )
        end

        render_success(serialize_transaction(transaction))
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

      private

      def calculate_token_mix(user:, store:, amount_usd:, chain_id:)
        balances = user.token_balances.on_chain(chain_id).with_balance

        tokens = []
        remaining = amount_usd

        # 1. Use store's own tokens first (no fee)
        store_balance = balances.find_by(store_id: store.id)
        if store_balance && store_balance.balance_usd > 0
          use_amount = [store_balance.balance_usd, remaining].min
          tokens << {
            store_id: store.id,
            token_address: store_balance.token_address,
            amount_usd: format("%.2f", use_amount)
          }
          remaining -= use_amount
        end

        # 2. Use other store tokens (small cash-out fee)
        balances.store_tokens.where.not(store_id: store.id).each do |balance|
          break if remaining <= 0

          use_amount = [balance.balance_usd, remaining].min
          tokens << {
            store_id: balance.store_id,
            token_address: balance.token_address,
            amount_usd: format("%.2f", use_amount),
            cash_out_fee_usd: format("%.3f", use_amount * 0.001) # 0.1% fee
          }
          remaining -= use_amount
        end

        # 3. Use USDC for remaining
        if remaining > 0
          usdc_balance = balances.usdc.first
          if usdc_balance && usdc_balance.balance_usd >= remaining
            tokens << {
              type: "usdc",
              amount_usd: format("%.2f", remaining)
            }
            remaining = 0
          end
        end

        tokens
      end

      def calculate_rewards(store, amount_usd)
        # 5% rewards in store tokens
        reward_rate = 0.05

        {
          store_id: store.id,
          amount_usd: format("%.2f", amount_usd * reward_rate)
        }
      end

      def serialize_transaction(transaction)
        {
          id: transaction.id,
          type: transaction.transaction_type,
          amount_usd: format("%.2f", transaction.amount_usd),
          counterparty: transaction.store ? {
            type: "store",
            id: transaction.store_id,
            name: transaction.store.name
          } : nil,
          tokens_used: transaction.tokens_used,
          rewards_earned: transaction.rewards_earned,
          bundle_id: transaction.bundle_id,
          tx_hash: transaction.tx_hash,
          block_number: transaction.block_number,
          chain_id: transaction.chain_id,
          status: transaction.status,
          confirmation_code: transaction.confirmation_code,
          created_at: transaction.created_at.iso8601,
          confirmed_at: transaction.confirmed_at&.iso8601
        }
      end
    end
  end
end
