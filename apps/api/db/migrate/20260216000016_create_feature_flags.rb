# frozen_string_literal: true

class CreateFeatureFlags < ActiveRecord::Migration[8.0]
  def change
    create_table :feature_flags, id: :uuid do |t|
      # Flag data
      t.string :name, limit: 100, null: false
      t.text :description

      # State
      t.boolean :enabled, null: false, default: false

      # Targeting
      t.jsonb :rules, null: false, default: []

      t.timestamps
    end

    add_index :feature_flags, :name, unique: true
  end
end
