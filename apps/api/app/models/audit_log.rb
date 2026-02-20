# frozen_string_literal: true

class AuditLog < ApplicationRecord
  # Associations
  belongs_to :user, optional: true

  # Validations
  validates :action, presence: true

  # Scopes
  scope :recent, -> { order(created_at: :desc) }
  scope :by_action, ->(action) { where(action: action) }
  scope :for_resource, ->(type, id) { where(resource_type: type, resource_id: id) }

  class << self
    def log(action:, user: nil, resource: nil, old_values: nil, new_values: nil, metadata: nil, request: nil)
      create!(
        action: action,
        user: user,
        resource_type: resource&.class&.name,
        resource_id: resource&.id,
        old_values: old_values,
        new_values: new_values,
        metadata: metadata,
        ip_address: request&.remote_ip,
        user_agent: request&.user_agent
      )
    end
  end
end
