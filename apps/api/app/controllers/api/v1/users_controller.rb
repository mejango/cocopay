# frozen_string_literal: true

module Api
  module V1
    class UsersController < BaseController
      def show
        render_success(serialize_user(current_user))
      end

      def update
        if current_user.update(user_params)
          render_success(serialize_user(current_user))
        else
          render_error(
            code: "VALIDATION_ERROR",
            message: "Invalid user data",
            details: current_user.errors.to_hash,
            status: :unprocessable_entity
          )
        end
      end

      def balance
        balances = current_user.token_balances.includes(:store).with_balance
        total_usd = balances.sum(:balance_usd)

        breakdown = balances.map do |tb|
          if tb.usdc?
            {
              type: "usdc",
              label: "Dollars",
              amount_usd: format_usd(tb.balance_usd),
              chain_id: tb.chain_id
            }
          else
            {
              type: "store_token",
              label: tb.store.name,
              store_id: tb.store_id,
              amount_usd: format_usd(tb.balance_usd),
              token_amount: tb.balance.to_s,
              chain_id: tb.chain_id
            }
          end
        end

        render_success({
          total_usd: format_usd(total_usd),
          breakdown: breakdown,
          by_chain: balances_by_chain(balances),
          available_bonus: format_usd(calculate_bonus(current_user))
        })
      end

      def transactions
        transactions = current_user.sent_transactions
                                   .or(current_user.received_transactions)
                                   .includes(:store, :from_user, :to_user)
                                   .recent

        transactions = transactions.where(transaction_type: params[:type]) if params[:type].present?
        transactions = transactions.where(store_id: params[:store_id]) if params[:store_id].present?

        paginated, meta = paginate(transactions)

        render_success(
          paginated.map { |tx| serialize_transaction(tx) },
          meta: meta
        )
      end

      def bonus
        loans = current_user.loans.active.includes(:user)
        total_headroom = loans.sum(&:headroom_usd)

        render_success({
          total_available_usd: format_usd(total_headroom),
          breakdown: {
            refinancing_headroom: format_usd(total_headroom),
            uncollateralized_tokens: "0.00"
          },
          loans: loans.map { |loan| serialize_loan(loan) }
        })
      end

      def claim_bonus
        # Placeholder for bonus claim implementation
        render_success({
          message: "Bonus claim not yet implemented"
        })
      end

      private

      def user_params
        params.permit(:name, :backup_owner_phone, :locale, :preferred_chain_id)
      end

      def serialize_user(user)
        {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          smart_account_address: user.smart_accounts.first&.address,
          backup_owner_phone: user.backup_owner_phone,
          locale: user.locale,
          preferred_chain_id: user.preferred_chain_id,
          created_at: user.created_at.iso8601
        }
      end

      def serialize_transaction(tx)
        {
          id: tx.id,
          type: tx.transaction_type,
          amount_usd: format_usd(tx.amount_usd),
          counterparty: counterparty_info(tx),
          rewards_earned_usd: tx.rewards_earned&.dig("amount_usd"),
          confirmation_code: tx.confirmation_code,
          status: tx.status,
          chain_id: tx.chain_id,
          created_at: tx.created_at.iso8601
        }
      end

      def serialize_loan(loan)
        {
          id: loan.id,
          original_collateral_usd: format_usd(loan.collateral_usd_at_origination),
          current_collateral_value_usd: format_usd(loan.current_value_usd),
          headroom_usd: format_usd(loan.headroom_usd),
          chain_id: loan.chain_id
        }
      end

      def counterparty_info(tx)
        if tx.store
          { type: "store", id: tx.store_id, name: tx.store.name }
        elsif tx.to_user
          { type: "user", id: tx.to_user_id, name: tx.to_user.name }
        end
      end

      def balances_by_chain(balances)
        balances.group_by(&:chain_id).transform_values do |chain_balances|
          format_usd(chain_balances.sum(&:balance_usd))
        end
      end

      def calculate_bonus(user)
        user.loans.active.sum(&:headroom_usd)
      end

      def format_usd(amount)
        format("%.2f", amount || 0)
      end
    end
  end
end
