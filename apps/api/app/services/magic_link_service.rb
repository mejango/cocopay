# frozen_string_literal: true

class MagicLinkService
  EXPIRY_SECONDS = ENV.fetch("OTP_EXPIRY_SECONDS", 300).to_i
  MAX_ATTEMPTS = 5

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

    # Returns:
    #   { user: User }  on success
    #   :too_many_attempts  when locked out
    #   nil  on wrong code or expired
    def verify(verification_id, token)
      data = redis.get(redis_key(verification_id))
      return nil unless data

      # Check if already locked out
      attempts = redis.get(attempts_key(verification_id)).to_i
      return :too_many_attempts if attempts >= MAX_ATTEMPTS

      parsed = JSON.parse(data, symbolize_names: true)

      unless Digest::SHA256.hexdigest(token) == parsed[:token_hash]
        # Track the failed attempt
        new_count = redis.incr(attempts_key(verification_id))
        redis.expire(attempts_key(verification_id), EXPIRY_SECONDS)

        if new_count >= MAX_ATTEMPTS
          # Lock out: delete the OTP so it can't be used even if guessed later
          redis.del(redis_key(verification_id))
          return :too_many_attempts
        end

        return nil
      end

      user = User.find_by(id: parsed[:user_id])
      return nil unless user

      # Delete OTP and attempts after successful verification
      redis.del(redis_key(verification_id), attempts_key(verification_id))

      { user: user }
    end

    private

    def redis
      @redis ||= Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"))
    end

    def redis_key(verification_id)
      "magic_link:#{verification_id}"
    end

    def attempts_key(verification_id)
      "magic_link_attempts:#{verification_id}"
    end
  end
end
