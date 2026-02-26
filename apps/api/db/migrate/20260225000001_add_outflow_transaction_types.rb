# frozen_string_literal: true

class AddOutflowTransactionTypes < ActiveRecord::Migration[8.0]
  def up
    execute <<-SQL
      ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'cash_out';
      ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'withdrawal';
    SQL

    # Make loan_id_onchain nullable — we can't know the on-chain loan ID until
    # we parse event logs, so it gets backfilled later.
    change_column_null :loans, :loan_id_onchain, true
    change_column_default :loans, :loan_id_onchain, nil

    # Make origination_tx_hash nullable — set after confirmation, not at creation.
    change_column_null :loans, :origination_tx_hash, true
  end

  def down
    # PostgreSQL enum values cannot be removed; only the column nullability is reversible.
    change_column_null :loans, :loan_id_onchain, false
    change_column_null :loans, :origination_tx_hash, false
  end
end
