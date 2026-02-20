# frozen_string_literal: true

class CreateAnalyticsEvents < ActiveRecord::Migration[8.0]
  def change
    create_table :analytics_events, id: :uuid do |t|
      # Event data
      t.string :event_name, limit: 100, null: false
      t.jsonb :properties, null: false, default: {}

      # Context
      t.references :user, foreign_key: true, type: :uuid
      t.uuid :session_id
      t.string :device_id, limit: 255

      # Request context
      t.inet :ip_address
      t.text :user_agent

      t.datetime :created_at, null: false
    end

    add_index :analytics_events, :event_name
    add_index :analytics_events, :user_id, where: "user_id IS NOT NULL", name: "index_analytics_events_on_user_id_present"
    add_index :analytics_events, :created_at, order: { created_at: :desc }
  end
end
