# frozen_string_literal: true

class Session < ApplicationRecord
  # Associations
  belongs_to :user

  # Validations
  validates :token_hash, presence: true
  validates :auth_method, presence: true
  validates :expires_at, presence: true

  # Scopes
  scope :active, -> { where(revoked_at: nil).where("expires_at > ?", Time.current) }

  def revoke!
    update!(revoked_at: Time.current)
  end

  def expired?
    expires_at < Time.current
  end

  def active?
    !expired? && revoked_at.nil?
  end
end
