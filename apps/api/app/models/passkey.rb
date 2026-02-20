# frozen_string_literal: true

class Passkey < ApplicationRecord
  # Associations
  belongs_to :user

  # Validations
  validates :credential_id, presence: true, uniqueness: true
  validates :public_key, presence: true

  def touch_last_used
    update_column(:last_used_at, Time.current)
  end

  def increment_sign_count!
    increment!(:sign_count)
  end
end
