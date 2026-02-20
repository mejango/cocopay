# frozen_string_literal: true

class CreateAuditLogs < ActiveRecord::Migration[8.0]
  def change
    create_table :audit_logs, id: :uuid do |t|
      # Actor
      t.references :user, foreign_key: true, type: :uuid
      t.inet :ip_address
      t.text :user_agent

      # Action
      t.string :action, limit: 100, null: false
      t.string :resource_type, limit: 50
      t.uuid :resource_id

      # Data
      t.jsonb :old_values
      t.jsonb :new_values
      t.jsonb :metadata

      t.datetime :created_at, null: false
    end

    add_index :audit_logs, :action
    add_index :audit_logs, [:resource_type, :resource_id]
    add_index :audit_logs, :created_at, order: { created_at: :desc }
  end
end
