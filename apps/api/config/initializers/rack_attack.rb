# frozen_string_literal: true

# Use Redis as the cache store for rack-attack so limits persist across processes
Rack::Attack.cache.store = ActiveSupport::Cache::RedisCacheStore.new(
  url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"),
  namespace: "rack_attack"
)

# --- Throttles ---

# Email send: 5 requests per minute per IP
Rack::Attack.throttle("auth/email/send", limit: 5, period: 60) do |req|
  req.ip if req.path == "/v1/auth/email/send" && req.post?
end

# Email verify: 5 requests per minute per IP
Rack::Attack.throttle("auth/email/verify", limit: 5, period: 60) do |req|
  req.ip if req.path == "/v1/auth/email/verify" && req.post?
end

# Wallet endpoints: 10 requests per minute per IP
Rack::Attack.throttle("auth/wallet", limit: 10, period: 60) do |req|
  req.ip if req.path.start_with?("/v1/auth/wallet") && req.post?
end

# --- Responses ---

Rack::Attack.throttled_responder = lambda do |_request|
  [
    429,
    { "Content-Type" => "application/json" },
    [{ error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } }.to_json]
  ]
end
