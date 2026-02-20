# frozen_string_literal: true

class CreateSigningKeys < ActiveRecord::Migration[8.0]
  def change
    create_table :signing_keys, id: :uuid do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, type: :uuid

      # Key data (encrypted)
      t.text :encrypted_private_key, null: false
      t.string :address, limit: 42, null: false

      # Status
      t.boolean :is_active, null: false, default: true
      t.datetime :revoked_at

      t.datetime :created_at, null: false
    end

    # Create unique partial index for active signing key per user
    execute <<-SQL
      CREATE UNIQUE INDEX idx_signing_keys_user_active ON signing_keys (user_id) WHERE is_active = TRUE;
    SQL
  end
end
