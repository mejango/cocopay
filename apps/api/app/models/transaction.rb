# frozen_string_literal: true

class Transaction < ApplicationRecord
  # Rails reserves 'type' for STI, so we disable it and alias to transaction_type
  self.inheritance_column = nil

  # Alias 'type' column as 'transaction_type' for clarity
  alias_attribute :transaction_type, :type

  # Associations
  belongs_to :from_user, class_name: "User", optional: true
  belongs_to :to_user, class_name: "User", optional: true
  belongs_to :store, optional: true

  # Validations
  validates :transaction_type, presence: true
  validates :chain_id, presence: true
  validates :amount_usd, presence: true, numericality: { greater_than: 0 }

  # Scopes
  scope :pending, -> { where(status: "pending") }
  scope :confirmed, -> { where(status: "confirmed") }
  scope :failed, -> { where(status: "failed") }
  scope :payments, -> { where(transaction_type: "payment") }
  scope :payouts, -> { where(transaction_type: "payout") }
  scope :cash_outs, -> { where(transaction_type: "cash_out") }
  scope :withdrawals, -> { where(transaction_type: "withdrawal") }
  scope :recent, -> { order(created_at: :desc) }

  # Callbacks
  before_create :generate_confirmation_code

  def confirm!(tx_hash:, block_number:)
    update!(
      status: "confirmed",
      tx_hash: tx_hash,
      block_number: block_number,
      confirmed_at: Time.current
    )
    create_loan_if_cash_out!(tx_hash)
  end

  def fail!(code:, message:)
    update!(
      status: "failed",
      error_code: code,
      error_message: message
    )
  end

  private

  def create_loan_if_cash_out!(confirmed_tx_hash)
    return unless transaction_type == "cash_out"

    data = tokens_used.is_a?(Hash) ? tokens_used : (tokens_used.first || {})
    Loan.create!(
      user: from_user,
      chain_id: chain_id,
      loan_id_onchain: nil,
      collateral: data["collateral"].to_i,
      collateral_usd_at_origination: amount_usd,
      borrow_amount: data["borrow_amount"].to_i,
      borrow_amount_usd: amount_usd,
      prepaid_fee_percent: 25,
      prepaid_duration_seconds: 365 * 24 * 3600,
      project_id: data["project_id"].to_i,
      token_address: "0x0000000000000000000000000000000000000000",
      origination_tx_hash: confirmed_tx_hash
    )
  end

  def generate_confirmation_code
    self.confirmation_code ||= loop do
      code = SecureRandom.alphanumeric(6).upcase.tr("0O1IL", "23456")
      break code unless Transaction.exists?(confirmation_code: code)
    end
  end
end
