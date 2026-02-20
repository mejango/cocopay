# frozen_string_literal: true

class TokenBalance < ApplicationRecord
  # Associations
  belongs_to :user
  belongs_to :store, optional: true

  # Validations
  validates :chain_id, presence: true
  validates :token_address, presence: true
  validates :user_id, uniqueness: { scope: [:chain_id, :token_address] }
  validates :balance, numericality: { greater_than_or_equal_to: 0 }

  # Scopes
  scope :on_chain, ->(chain_id) { where(chain_id: chain_id) }
  scope :usdc, -> { where(store_id: nil) }
  scope :store_tokens, -> { where.not(store_id: nil) }
  scope :with_balance, -> { where("balance > 0") }
  scope :stale, -> { where("last_synced_at < ?", 5.minutes.ago) }

  def sync!(balance:, balance_usd:, block:)
    update!(
      balance: balance,
      balance_usd: balance_usd,
      last_synced_block: block,
      last_synced_at: Time.current
    )
  end

  def usdc?
    store_id.nil?
  end

  def store_token?
    store_id.present?
  end
end
