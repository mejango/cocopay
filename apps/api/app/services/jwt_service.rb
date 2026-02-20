class JwtService
  SECRET_KEY = ENV.fetch("JWT_SECRET") { Rails.application.credentials.secret_key_base }
  ALGORITHM = "HS256"

  class << self
    def encode(payload, exp: nil)
      payload[:exp] = exp || ENV.fetch("JWT_EXPIRY_SECONDS", 30.days.to_i).to_i.seconds.from_now.to_i
      payload[:iat] = Time.current.to_i
      JWT.encode(payload, SECRET_KEY, ALGORITHM)
    end

    def decode(token)
      decoded = JWT.decode(token, SECRET_KEY, true, algorithm: ALGORITHM)
      HashWithIndifferentAccess.new(decoded.first)
    rescue JWT::DecodeError, JWT::ExpiredSignature => e
      Rails.logger.warn "JWT decode failed: #{e.message}"
      nil
    end
  end
end
