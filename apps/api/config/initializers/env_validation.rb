# frozen_string_literal: true

# Validate critical environment variables at boot time.
# Fail fast in production rather than crashing mid-request.

Rails.application.config.after_initialize do
  next if Rails.env.test?

  missing = []

  # Required for managed user transaction signing
  missing << "RESERVES_PRIVATE_KEY" unless ENV["RESERVES_PRIVATE_KEY"].present?

  # Required for Relayr bundle submissions in production
  if Rails.env.production?
    missing << "RELAYR_API_KEY" unless ENV["RELAYR_API_KEY"].present?
  end

  if missing.any?
    message = "Missing required environment variables: #{missing.join(', ')}"
    if Rails.env.production?
      raise message
    else
      Rails.logger.warn "[ENV] #{message}"
    end
  end

  # Warn about optional-but-important vars
  unless ENV["FACTORY_INIT_CODE_HASH"].present?
    Rails.logger.warn "[ENV] FACTORY_INIT_CODE_HASH not set — smart account provisioning will fail. " \
                      "Derive from ForwardableSimpleAccountFactory at 0x69a05d911af23501ff9d6b811a97cac972dade05."
  end
end
