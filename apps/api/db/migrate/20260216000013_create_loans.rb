# frozen_string_literal: true

class CreateLoans < ActiveRecord::Migration[8.0]
  def change
    create_table :loans, id: :uuid do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, type: :uuid

      # Loan data
      t.column :chain_id, :chain_id, null: false
      t.decimal :loan_id_onchain, precision: 78, scale: 0, null: false

      # Amounts
      t.decimal :collateral, precision: 78, scale: 0, null: false
      t.decimal :collateral_usd_at_origination, precision: 18, scale: 6, null: false
      t.decimal :borrow_amount, precision: 78, scale: 0, null: false
      t.decimal :borrow_amount_usd, precision: 18, scale: 6, null: false

      # Terms
      t.integer :prepaid_fee_percent, null: false
      t.bigint :prepaid_duration_seconds, null: false

      # Project
      t.integer :project_id, null: false
      t.string :token_address, limit: 42, null: false

      # Status
      t.boolean :is_active, null: false, default: true
      t.datetime :repaid_at

      # Blockchain
      t.string :origination_tx_hash, limit: 66, null: false
      t.string :repayment_tx_hash, limit: 66

      t.datetime :created_at, null: false
    end

    add_index :loans, :user_id, where: "is_active = TRUE", name: "index_loans_on_user_id_active"
    add_index :loans, :project_id
    add_index :loans, [:chain_id, :loan_id_onchain], unique: true
  end
end
