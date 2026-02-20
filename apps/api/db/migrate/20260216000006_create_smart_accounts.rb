# frozen_string_literal: true

class CreateSmartAccounts < ActiveRecord::Migration[8.0]
  def change
    create_table :smart_accounts, id: :uuid do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, type: :uuid

      # Account data
      t.column :chain_id, :chain_id, null: false
      t.string :address, limit: 42, null: false
      t.string :salt, limit: 66, null: false

      # Ownership
      t.string :owner_address, limit: 42, null: false
      t.column :custody_status, :custody_status, null: false, default: "managed"

      # Deployment
      t.boolean :deployed, null: false, default: false
      t.string :deploy_tx_hash, limit: 66
      t.datetime :deployed_at

      t.datetime :created_at, null: false
    end

    add_index :smart_accounts, :address
    add_index :smart_accounts, [:user_id, :chain_id], unique: true
    add_index :smart_accounts, [:chain_id, :address], unique: true
  end
end
