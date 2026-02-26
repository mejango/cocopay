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

  def decrypted_private_key
    encryptor = ActiveSupport::MessageEncryptor.new(self.class.encryption_key)
    encryptor.decrypt_and_verify(encrypted_private_key)
  end

  def self.encryption_key
    ActiveSupport::KeyGenerator.new(
      ENV.fetch("SECRET_KEY_BASE", Rails.application.secret_key_base)
    ).generate_key("signing_keys", 32)
  end
end
