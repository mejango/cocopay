# frozen_string_literal: true

class Payout < ApplicationRecord
  # Associations
  belongs_to :store
  belongs_to :requester, class_name: "User", foreign_key: :requested_by

  # Validations
  validates :amount_usd, presence: true, numericality: { greater_than: 0 }
  validates :payout_type, presence: true
  validates :destination, presence: true

  # Scopes
  scope :pending, -> { where(status: "pending") }
  scope :processing, -> { where(status: "processing") }
  scope :completed, -> { where(status: "completed") }
  scope :failed, -> { where(status: "failed") }
  scope :in_progress, -> { where(status: %w[pending processing]) }

  def process!
    update!(status: "processing")
  end

  def complete!(external_id:)
    update!(
      status: "completed",
      external_id: external_id,
      processed_at: Time.current
    )
  end

  def fail!(message:)
    update!(
      status: "failed",
      error_message: message
    )
  end

  def net_amount_usd
    amount_usd - fee_usd
  end
end
