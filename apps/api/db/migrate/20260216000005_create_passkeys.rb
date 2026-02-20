# frozen_string_literal: true

class CreatePasskeys < ActiveRecord::Migration[8.0]
  def change
    create_table :passkeys, id: :uuid do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, type: :uuid

      # WebAuthn data
      t.string :credential_id, limit: 512, null: false
      t.binary :public_key, null: false
      t.bigint :sign_count, null: false, default: 0

      # Derived wallet
      t.string :derived_address, limit: 42

      # Metadata
      t.string :device_name, limit: 255
      t.datetime :last_used_at

      t.datetime :created_at, null: false
    end

    add_index :passkeys, :credential_id, unique: true
  end
end
