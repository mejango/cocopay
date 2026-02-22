# frozen_string_literal: true

class RelayrService
  RELAYR_API_URL = ENV.fetch("RELAYR_API_URL", "https://api.relayr.ba5ed.com")
  RELAYR_STAGING_API_URL = ENV.fetch("RELAYR_STAGING_API_URL", "https://relayr-api-staging.up.railway.app")
  RELAYR_APP_ID = ENV.fetch("RELAYR_APP_ID", "43a6827c-3407-43c1-89c6-deeb8994696d")
  RELAYR_API_KEY = ENV["RELAYR_API_KEY"]
  RELAYR_STAGING_API_KEY = ENV.fetch("RELAYR_STAGING_API_KEY", "0717579b-c72a-4da8-a7ba-c95944db4e7f")

  # ERC-2771 ForwarderV2 (same on all chains)
  ERC2771_FORWARDER = "0xc29d6995ab3b0df4650ad643adeac55e7acbb566"

  # SimpleAccount execute function selector
  SIMPLE_ACCOUNT_EXECUTE_SELECTOR = "b61d27f6" # execute(address,uint256,bytes)

  # EIP-712 ForwardRequest type hash
  FORWARD_REQUEST_TYPEHASH = Eth::Util.keccak256(
    "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint48 deadline,bytes data)"
  )

  class << self
    # Create a balance-sponsored bundle (org pays gas).
    # Used for managed (email) users' store deployments.
    def create_balance_bundle(transactions:, user: nil, smart_account_address: nil)
      validate_config!

      # For managed users with smart accounts, wrap through ERC-2771
      bundle_transactions = if smart_account_address && user
                              build_erc2771_transactions(
                                transactions: transactions,
                                user: user,
                                smart_account_address: smart_account_address
                              )
                            else
                              transactions.map do |tx|
                                {
                                  chain: tx[:chain_id],
                                  target: tx[:target],
                                  data: tx[:data],
                                  value: tx[:value] || "0"
                                }
                              end
                            end

      response = post_to_relayr("/v1/bundle/balance", {
        app_id: RELAYR_APP_ID,
        transactions: bundle_transactions,
        perform_simulation: true,
        virtual_nonce_mode: "Disabled"
      })

      { bundle_id: response["bundle_uuid"], tx_uuids: response["tx_uuids"] }
    end

    # Create a balance bundle on the staging API (for testnet deploys).
    def create_staging_balance_bundle(transactions:, signer_address: nil)
      validate_staging_config!

      body = {
        app_id: RELAYR_APP_ID,
        transactions: transactions.map { |tx|
          {
            chain: tx[:chain],
            target: tx[:target],
            data: tx[:data],
            value: tx[:value] || "0"
          }
        },
        perform_simulation: true,
        virtual_nonce_mode: "Disabled"
      }
      body[:signer_address] = signer_address if signer_address.present?

      post_to_relayr("/v1/bundle/balance", body, staging: true)
    end

    # Get bundle status from the staging API.
    def get_staging_bundle_status(bundle_id)
      get_from_relayr("/v1/bundle/#{bundle_id}", staging: true)
    end

    # Get bundle status
    def get_bundle_status(bundle_id)
      get_from_relayr("/v1/bundle/#{bundle_id}")
    end

    private

    def validate_config!
      raise "RELAYR_APP_ID not configured" unless RELAYR_APP_ID.present?
      raise "RELAYR_API_KEY not configured" unless RELAYR_API_KEY.present?
    end

    def validate_staging_config!
      raise "RELAYR_APP_ID not configured" unless RELAYR_APP_ID.present?
      raise "RELAYR_STAGING_API_KEY not configured" unless RELAYR_STAGING_API_KEY.present?
    end

    def build_erc2771_transactions(transactions:, user:, smart_account_address:)
      signing_key = resolve_signing_key(user)
      account = Eth::Key.new(priv: signing_key)

      transactions.map do |tx|
        # Wrap through SmartAccount.execute(target, value, data)
        execute_data = encode_smart_account_execute(
          tx[:target],
          tx[:value] || "0",
          tx[:data]
        )

        # Sign ERC-2771 forward request
        sign_forward_request(
          account: account,
          chain_id: tx[:chain_id],
          target: smart_account_address,
          data: execute_data,
          value: "0"
        )
      end
    end

    def resolve_signing_key(user)
      # Prefer user's stored signing key, fall back to reserves
      user_key = user.signing_keys.first
      if user_key
        user_key.decrypted_private_key
      else
        ENV.fetch("RESERVES_PRIVATE_KEY")
      end
    end

    def encode_smart_account_execute(target, value, data)
      # ABI encode: execute(address dest, uint256 value, bytes func)
      padded_target = target.sub("0x", "").rjust(64, "0")
      padded_value = value.to_i.to_s(16).rjust(64, "0")
      data_bytes = data.sub("0x", "")
      data_offset = "0000000000000000000000000000000000000000000000000000000000000060"
      data_length = (data_bytes.length / 2).to_s(16).rjust(64, "0")
      padded_data = data_bytes + ("0" * ((64 - (data_bytes.length % 64)) % 64))

      "0x#{SIMPLE_ACCOUNT_EXECUTE_SELECTOR}#{padded_target}#{padded_value}#{data_offset}#{data_length}#{padded_data}"
    end

    def sign_forward_request(account:, chain_id:, target:, data:, value:)
      # This is a simplified version - in production, would need to:
      # 1. Query forwarder nonce on-chain
      # 2. Build EIP-712 typed data
      # 3. Sign with account
      # For now, we build the transaction targeting the forwarder directly

      {
        chain: chain_id,
        target: ERC2771_FORWARDER,
        data: data,
        value: value
      }
    end

    def post_to_relayr(path, body, staging: false)
      base_url = staging ? RELAYR_STAGING_API_URL : RELAYR_API_URL
      api_key = staging ? RELAYR_STAGING_API_KEY : RELAYR_API_KEY

      conn = Faraday.new(url: base_url) do |f|
        f.request :json
        f.response :json
        f.adapter Faraday.default_adapter
      end

      response = conn.post(path) do |req|
        req.headers["Content-Type"] = "application/json"
        req.headers["x-api-key"] = api_key if api_key.present?
        req.body = body.to_json
      end

      unless response.success?
        Rails.logger.error "Relayr API error: #{response.status} - #{response.body}"
        raise "Relayr API error: #{response.status} - #{response.body}"
      end

      response.body
    end

    def get_from_relayr(path, staging: false)
      base_url = staging ? RELAYR_STAGING_API_URL : RELAYR_API_URL
      api_key = staging ? RELAYR_STAGING_API_KEY : RELAYR_API_KEY

      conn = Faraday.new(url: base_url) do |f|
        f.response :json
        f.adapter Faraday.default_adapter
      end

      response = conn.get(path) do |req|
        req.headers["x-api-key"] = api_key if api_key.present?
      end

      unless response.success?
        Rails.logger.error "Relayr API error: #{response.status} - #{response.body}"
        raise "Relayr API error: #{response.status} - #{response.body}"
      end

      response.body
    end
  end
end
