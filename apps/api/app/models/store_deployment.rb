# frozen_string_literal: true

class StoreDeployment < ApplicationRecord
  # Associations
  belongs_to :store

  # Validations
  validates :chain_id, presence: true
  validates :store_id, uniqueness: { scope: :chain_id }

  # Scopes
  scope :deployed, -> { where(status: "deployed") }
  scope :pending, -> { where(status: "pending") }
  scope :failed, -> { where(status: "failed") }
  scope :on_chain, ->(chain_id) { where(chain_id: chain_id) }

  def deploy!(tx_hash:, project_id:, token_address:, terminal_address:)
    update!(
      status: "deployed",
      deploy_tx_hash: tx_hash,
      project_id: project_id,
      token_address: token_address,
      terminal_address: terminal_address,
      deployed_at: Time.current
    )
  end

  def fail!(message:)
    update!(status: "failed", error_message: message)
  end
end
