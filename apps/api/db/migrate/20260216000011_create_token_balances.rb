# frozen_string_literal: true

class CreateTokenBalances < ActiveRecord::Migration[8.0]
  def change
    create_table :token_balances, id: :uuid do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, type: :uuid

      # Token data
      t.column :chain_id, :chain_id, null: false
      t.string :token_address, limit: 42, null: false
      t.references :store, foreign_key: true, type: :uuid

      # Balance
      t.decimal :balance, precision: 78, scale: 0, null: false, default: 0
      t.decimal :balance_usd, precision: 18, scale: 6, null: false, default: 0

      # Last update
      t.datetime :last_synced_at, null: false, default: -> { "NOW()" }
      t.bigint :last_synced_block

      t.timestamps
    end

    add_index :token_balances, :store_id, where: "store_id IS NOT NULL", name: "index_token_balances_on_store_id_present"
    add_index :token_balances, :last_synced_at
    add_index :token_balances, [:user_id, :chain_id, :token_address], unique: true
  end
end
