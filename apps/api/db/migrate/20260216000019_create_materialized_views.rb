# frozen_string_literal: true

class CreateMaterializedViews < ActiveRecord::Migration[8.0]
  def up
    execute <<-SQL
      CREATE MATERIALIZED VIEW store_daily_stats AS
      SELECT
        store_id,
        DATE(created_at) AS date,
        COUNT(*) AS transaction_count,
        SUM(amount_usd) AS revenue_usd,
        COUNT(DISTINCT from_user_id) AS unique_customers,
        AVG(amount_usd) AS avg_transaction_usd
      FROM transactions
      WHERE type = 'payment'
        AND status = 'confirmed'
        AND store_id IS NOT NULL
      GROUP BY store_id, DATE(created_at);

      CREATE UNIQUE INDEX idx_store_daily_stats ON store_daily_stats(store_id, date);
    SQL
  end

  def down
    execute <<-SQL
      DROP MATERIALIZED VIEW IF EXISTS store_daily_stats;
    SQL
  end
end
