# frozen_string_literal: true

class MagicLinkService
  EXPIRY_SECONDS = ENV.fetch("OTP_EXPIRY_SECONDS", 300).to_i

  class << self
    def generate(user)
      verification_id = SecureRandom.uuid
      token = SecureRandom.random_number(10**6).to_s.rjust(6, "0")
      expires_at = Time.current + EXPIRY_SECONDS.seconds

      redis.set(
        redis_key(verification_id),
        {
          user_id: user.id,
          token_hash: Digest::SHA256.hexdigest(token)
        }.to_json,
        ex: EXPIRY_SECONDS
      )

      {
        verification_id: verification_id,
        token: token,
        expires_at: expires_at
      }
    end

    def verify(verification_id, token)
      data = redis.get(redis_key(verification_id))
      return nil unless data

      parsed = JSON.parse(data, symbolize_names: true)
      return nil unless Digest::SHA256.hexdigest(token) == parsed[:token_hash]

      user = User.find_by(id: parsed[:user_id])
      return nil unless user

      # Delete after successful verification
      redis.del(redis_key(verification_id))

      { user: user }
    end

    private

    def redis
      @redis ||= Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"))
    end

    def redis_key(verification_id)
      "magic_link:#{verification_id}"
    end
  end
end
