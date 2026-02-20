# frozen_string_literal: true

class SmartAccount < ApplicationRecord
  # Associations
  belongs_to :user

  # Validations
  validates :chain_id, presence: true
  validates :address, presence: true
  validates :salt, presence: true
  validates :owner_address, presence: true
  validates :user_id, uniqueness: { scope: :chain_id }

  # Scopes
  scope :deployed, -> { where(deployed: true) }
  scope :on_chain, ->(chain_id) { where(chain_id: chain_id) }

  def deploy!(tx_hash:)
    update!(
      deployed: true,
      deploy_tx_hash: tx_hash,
      deployed_at: Time.current
    )
  end
end
