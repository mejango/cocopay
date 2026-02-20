# frozen_string_literal: true

class CreateUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :users, id: :uuid do |t|
      # Identity
      t.string :phone, limit: 20
      t.datetime :phone_verified_at
      t.string :email, limit: 255
      t.datetime :email_verified_at
      t.string :name, limit: 255

      # Recovery
      t.string :backup_owner_phone, limit: 20
      t.datetime :backup_owner_activated_at
      t.datetime :last_active_at, default: -> { "NOW()" }

      # Preferences
      t.column :preferred_chain_id, :chain_id, default: "8453"
      t.string :locale, limit: 10, default: "pt-BR"

      t.timestamps
    end

    add_index :users, :phone, unique: true, where: "phone IS NOT NULL"
    add_index :users, :email, unique: true, where: "email IS NOT NULL"
    add_index :users, :last_active_at
  end
end
