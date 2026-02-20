# frozen_string_literal: true

class CreateStoreMembers < ActiveRecord::Migration[8.0]
  def change
    create_table :store_members, id: :uuid do |t|
      t.references :store, null: false, foreign_key: { on_delete: :cascade }, type: :uuid
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, type: :uuid

      # Role
      t.column :role, :store_role, null: false

      # Invitation
      t.uuid :invited_by
      t.datetime :invited_at, null: false, default: -> { "NOW()" }
      t.datetime :accepted_at

      t.datetime :created_at, null: false
    end

    add_foreign_key :store_members, :users, column: :invited_by, on_delete: :nullify

    add_index :store_members, [:store_id, :user_id], unique: true
  end
end
