# frozen_string_literal: true

class User < ApplicationRecord
  # Associations
  has_many :sessions, dependent: :destroy
  has_many :passkeys, dependent: :destroy
  has_many :smart_accounts, dependent: :destroy
  has_many :signing_keys, dependent: :destroy
  has_many :store_members, dependent: :destroy
  has_many :stores, through: :store_members
  has_many :token_balances, dependent: :destroy
  has_many :loans, dependent: :destroy
  has_many :sent_transactions, class_name: "Transaction", foreign_key: :from_user_id
  has_many :received_transactions, class_name: "Transaction", foreign_key: :to_user_id
  has_many :analytics_events
  has_many :audit_logs

  # Validations
  validates :email, uniqueness: { case_sensitive: false }, allow_nil: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_nil: true
  validates :wallet_address, format: { with: /\A0x[0-9a-fA-F]{40}\z/ }, allow_nil: true
  validates :wallet_address, uniqueness: true, allow_nil: true
  validates :locale, length: { maximum: 10 }, allow_nil: true
  validate :email_or_wallet_required

  # Scopes
  scope :active, -> { where("last_active_at > ?", 30.days.ago) }

  # Callbacks
  before_save :normalize_email

  def touch_last_active
    update_column(:last_active_at, Time.current)
  end

  def verified?
    email_verified_at.present?
  end

  def managed?
    wallet_address.blank?
  end

  def self_custody?
    wallet_address.present?
  end

  def deposit_address
    if self_custody?
      wallet_address
    else
      smart_accounts.first&.address
    end
  end

  private

  def normalize_email
    self.email = email&.downcase&.strip
  end

  def email_or_wallet_required
    if email.blank? && wallet_address.blank?
      errors.add(:base, "Either email or wallet address is required")
    end
  end
end
