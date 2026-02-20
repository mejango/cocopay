# frozen_string_literal: true

class CreateStores < ActiveRecord::Migration[8.0]
  def change
    create_table :stores, id: :uuid do |t|
      # Basic info
      t.string :name, limit: 255, null: false
      t.string :symbol, limit: 10, null: false
      t.string :category, limit: 100
      t.text :description

      # Location
      t.decimal :latitude, precision: 10, scale: 8
      t.decimal :longitude, precision: 11, scale: 8
      t.text :address

      # Revnet data
      t.column :deployment_status, :deployment_status, null: false, default: "pending"

      # Links
      t.string :website, limit: 255
      t.string :instagram, limit: 100

      # QR code
      t.string :qr_code_url, limit: 255
      t.string :short_code, limit: 20

      t.timestamps
    end

    add_index :stores, :symbol
    add_index :stores, :short_code, unique: true, where: "short_code IS NOT NULL"

    # Spatial index for location queries
    execute <<-SQL
      CREATE INDEX idx_stores_location ON stores USING GIST (
        ll_to_earth(latitude, longitude)
      ) WHERE latitude IS NOT NULL;
    SQL
  end
end
