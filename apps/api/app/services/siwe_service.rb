# frozen_string_literal: true

class SiweService
  NONCE_EXPIRY_SECONDS = 300 # 5 minutes

  class << self
    def generate_nonce(address)
      nonce = SecureRandom.hex(16)
      normalized = address.downcase

      redis.set(
        redis_key(normalized),
        { nonce: nonce }.to_json,
        ex: NONCE_EXPIRY_SECONDS
      )

      nonce
    end

    def build_message(address:, nonce:, chain_id:, domain:, uri: nil, statement: nil)
      uri ||= "https://#{domain}"
      statement ||= "Sign in to CocoPay to manage your account."
      issued_at = Time.current.iso8601

      "#{domain} wants you to sign in with your Ethereum account:\n" \
        "#{address}\n" \
        "\n" \
        "#{statement}\n" \
        "\n" \
        "URI: #{uri}\n" \
        "Version: 1\n" \
        "Chain ID: #{chain_id}\n" \
        "Nonce: #{nonce}\n" \
        "Issued At: #{issued_at}"
    end

    def verify(address:, message:, signature:)
      normalized = address.downcase

      # Fetch and validate stored nonce
      data = redis.get(redis_key(normalized))
      return nil unless data

      parsed = JSON.parse(data, symbolize_names: true)
      stored_nonce = parsed[:nonce]

      # Verify nonce is in message
      return nil unless message.include?("Nonce: #{stored_nonce}")

      # Verify signature using eth gem
      begin
        sig_bytes = [signature.sub(/\A0x/, "")].pack("H*")
        recovered = Eth::Signature.personal_recover(message, sig_bytes)
        recovered_address = Eth::Util.public_key_to_address(recovered)

        return nil unless recovered_address.to_s.downcase == normalized
      rescue StandardError => e
        Rails.logger.error "SIWE signature verification failed: #{e.message}"
        return nil
      end

      # Delete nonce after successful verification
      redis.del(redis_key(normalized))

      { address: normalized }
    end

    private

    def redis
      @redis ||= Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"))
    end

    def redis_key(address)
      "siwe_nonce:#{address}"
    end
  end
end
