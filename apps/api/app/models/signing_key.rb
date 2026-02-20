# frozen_string_literal: true

class SigningKey < ApplicationRecord
  # Associations
  belongs_to :user

  # Validations
  validates :encrypted_private_key, presence: true
  validates :address, presence: true

  # Scopes
  scope :active, -> { where(is_active: true) }

  def revoke!
    update!(is_active: false, revoked_at: Time.current)
  end
end
