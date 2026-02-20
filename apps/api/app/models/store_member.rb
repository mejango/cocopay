# frozen_string_literal: true

class StoreMember < ApplicationRecord
  # Associations
  belongs_to :store
  belongs_to :user
  belongs_to :inviter, class_name: "User", foreign_key: :invited_by, optional: true

  # Validations
  validates :role, presence: true
  validates :user_id, uniqueness: { scope: :store_id }

  # Scopes
  scope :owners, -> { where(role: "owner") }
  scope :admins, -> { where(role: %w[owner admin]) }
  scope :staff, -> { where(role: "staff") }
  scope :accepted, -> { where.not(accepted_at: nil) }
  scope :pending_invite, -> { where(accepted_at: nil) }

  def accept!
    update!(accepted_at: Time.current)
  end

  def owner?
    role == "owner"
  end

  def admin?
    role.in?(%w[owner admin])
  end
end
