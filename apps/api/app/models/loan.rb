# frozen_string_literal: true

class Loan < ApplicationRecord
  # Associations
  belongs_to :user

  # Validations
  validates :chain_id, presence: true
  validates :collateral, presence: true, numericality: { greater_than: 0 }
  validates :borrow_amount, presence: true, numericality: { greater_than: 0 }
  validates :prepaid_fee_percent, presence: true
  validates :prepaid_duration_seconds, presence: true
  validates :project_id, presence: true
  validates :token_address, presence: true

  # Scopes
  scope :active, -> { where(is_active: true) }
  scope :repaid, -> { where(is_active: false) }
  scope :on_chain, ->(chain_id) { where(chain_id: chain_id) }

  def repay!(tx_hash:)
    update!(
      is_active: false,
      repayment_tx_hash: tx_hash,
      repaid_at: Time.current
    )
  end

  def current_value_usd
    # This would be calculated based on current token price
    # Placeholder for now
    collateral_usd_at_origination
  end

  def headroom_usd
    [current_value_usd - borrow_amount_usd, 0].max
  end
end
