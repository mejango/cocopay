# frozen_string_literal: true

class CreatePayouts < ActiveRecord::Migration[8.0]
  def change
    create_table :payouts, id: :uuid do |t|
      t.references :store, null: false, foreign_key: { on_delete: :cascade }, type: :uuid
      t.references :requested_by, null: false, foreign_key: { to_table: :users }, type: :uuid

      # Amount
      t.decimal :amount_usd, precision: 18, scale: 6, null: false
      t.decimal :fee_usd, precision: 18, scale: 6, null: false, default: 0

      # Destination
      t.column :payout_type, :payout_type, null: false
      t.jsonb :destination, null: false

      # Status
      t.column :status, :payout_status, null: false, default: "pending"

      # Processing
      t.string :external_id, limit: 255
      t.datetime :processed_at
      t.text :error_message

      t.datetime :created_at, null: false
    end

    add_index :payouts, :status, where: "status IN ('pending', 'processing')"
  end
end
