# frozen_string_literal: true

class CreateSessions < ActiveRecord::Migration[8.0]
  def change
    create_table :sessions, id: :uuid do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, type: :uuid

      # Session data
      t.string :token_hash, limit: 64, null: false
      t.column :auth_method, :auth_method, null: false
      t.jsonb :device_info
      t.inet :ip_address

      # Expiry
      t.datetime :expires_at, null: false
      t.datetime :revoked_at

      t.datetime :created_at, null: false
    end

    add_index :sessions, :token_hash
    add_index :sessions, :expires_at, where: "revoked_at IS NULL"
  end
end
