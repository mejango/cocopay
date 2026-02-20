# frozen_string_literal: true

module Api
  module V1
    class MyStoreController < BaseController
      before_action :load_store

      def show
        today_sales = @store.transactions
                            .payments
                            .confirmed
                            .where("created_at >= ?", Time.current.beginning_of_day)
                            .sum(:amount_usd)

        render_success({
          id: @store.id,
          name: @store.name,
          role: @membership.role,
          today_sales_usd: format("%.2f", today_sales),
          deployment_status: @store.deployment_status
        })
      end

      def payments
        transactions = @store.transactions.payments.includes(:from_user).recent

        paginated, meta = paginate(transactions)

        render_success(
          paginated.map { |tx| serialize_payment(tx) },
          meta: meta
        )
      end

      def analytics
        period = params[:period] || "week"
        start_date = case period
                     when "day" then 1.day.ago
                     when "week" then 1.week.ago
                     when "month" then 1.month.ago
                     else 1.week.ago
                     end

        transactions = @store.transactions
                             .payments
                             .confirmed
                             .where("created_at >= ?", start_date)

        revenue = transactions.sum(:amount_usd)
        count = transactions.count

        render_success({
          period: period,
          revenue_usd: format("%.2f", revenue),
          transaction_count: count,
          average_transaction_usd: count > 0 ? format("%.2f", revenue / count) : "0.00",
          daily_breakdown: daily_breakdown(transactions, start_date)
        })
      end

      private

      def load_store
        @membership = current_user.store_members.accepted.first

        unless @membership
          return render_error(
            code: "NOT_FOUND",
            message: "You are not a member of any store",
            status: :not_found
          )
        end

        @store = @membership.store
      end

      def serialize_payment(tx)
        {
          id: tx.id,
          amount_usd: format("%.2f", tx.amount_usd),
          payer: tx.from_user ? {
            id: tx.from_user_id,
            name: tx.from_user.name
          } : nil,
          confirmation_code: tx.confirmation_code,
          status: tx.status,
          created_at: tx.created_at.iso8601
        }
      end

      def daily_breakdown(transactions, start_date)
        transactions
          .group("DATE(created_at)")
          .select("DATE(created_at) as date, SUM(amount_usd) as revenue_usd, COUNT(*) as count")
          .map do |row|
            {
              date: row.date.to_s,
              revenue_usd: format("%.2f", row.revenue_usd),
              count: row.count
            }
          end
      end
    end
  end
end
