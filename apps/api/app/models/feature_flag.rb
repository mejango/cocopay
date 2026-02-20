# frozen_string_literal: true

class FeatureFlag < ApplicationRecord
  # Validations
  validates :name, presence: true, uniqueness: true

  class << self
    def enabled?(name, user: nil)
      flag = find_by(name: name)
      return false unless flag&.enabled?

      return true if flag.rules.empty?

      flag.rules.any? do |rule|
        evaluate_rule(rule, user)
      end
    end

    def enable!(name)
      find_or_create_by!(name: name).update!(enabled: true)
    end

    def disable!(name)
      find_by(name: name)&.update!(enabled: false)
    end

    private

    def evaluate_rule(rule, user)
      case rule["type"]
      when "user_id"
        user && rule["values"].include?(user.id)
      when "percentage"
        rand(100) < rule["value"].to_i
      else
        false
      end
    end
  end
end
