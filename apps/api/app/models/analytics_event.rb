# frozen_string_literal: true

class AnalyticsEvent < ApplicationRecord
  # Associations
  belongs_to :user, optional: true

  # Validations
  validates :event_name, presence: true

  # Scopes
  scope :recent, -> { order(created_at: :desc) }
  scope :by_event, ->(name) { where(event_name: name) }
  scope :with_user, -> { where.not(user_id: nil) }

  class << self
    def track(name, properties: {}, user: nil, session_id: nil, device_id: nil, request: nil)
      create!(
        event_name: name,
        properties: properties,
        user: user,
        session_id: session_id,
        device_id: device_id,
        ip_address: request&.remote_ip,
        user_agent: request&.user_agent
      )
    end
  end
end
