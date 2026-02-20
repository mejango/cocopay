# frozen_string_literal: true

class CreateStoreDeployments < ActiveRecord::Migration[8.0]
  def change
    create_table :store_deployments, id: :uuid do |t|
      t.references :store, null: false, foreign_key: { on_delete: :cascade }, type: :uuid

      # Chain data
      t.column :chain_id, :chain_id, null: false

      # Revnet data
      t.integer :project_id
      t.string :token_address, limit: 42
      t.string :terminal_address, limit: 42

      # Deployment
      t.column :status, :deployment_status, null: false, default: "pending"
      t.string :bundle_id, limit: 255
      t.string :deploy_tx_hash, limit: 66
      t.text :error_message

      # Timestamps
      t.datetime :deployed_at
      t.datetime :created_at, null: false
    end

    add_index :store_deployments, :token_address
    add_index :store_deployments, [:store_id, :chain_id], unique: true
  end
end
