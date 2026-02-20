# frozen_string_literal: true

class CreateTransactions < ActiveRecord::Migration[8.0]
  def change
    create_table :transactions, id: :uuid do |t|
      # Parties
      t.references :from_user, foreign_key: { to_table: :users }, type: :uuid
      t.references :to_user, foreign_key: { to_table: :users }, type: :uuid
      t.references :store, foreign_key: true, type: :uuid

      # Type and status
      t.column :type, :transaction_type, null: false
      t.column :status, :transaction_status, null: false, default: "pending"

      # Amounts
      t.decimal :amount_usd, precision: 18, scale: 6, null: false

      # Token breakdown
      t.jsonb :tokens_used
      t.jsonb :rewards_earned

      # Blockchain
      t.column :chain_id, :chain_id, null: false
      t.string :bundle_id, limit: 255
      t.string :tx_hash, limit: 66
      t.bigint :block_number

      # Confirmation
      t.string :confirmation_code, limit: 6

      # Error handling
      t.string :error_code, limit: 50
      t.text :error_message

      # Idempotency
      t.string :idempotency_key, limit: 255

      t.datetime :created_at, null: false
      t.datetime :confirmed_at
    end

    add_index :transactions, :status, where: "status = 'pending'"
    add_index :transactions, :confirmation_code
    add_index :transactions, :created_at, order: { created_at: :desc }
    add_index :transactions, :bundle_id
    add_index :transactions, :idempotency_key, unique: true, where: "idempotency_key IS NOT NULL"
  end
end
