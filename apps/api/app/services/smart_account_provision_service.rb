# frozen_string_literal: true

class SmartAccountProvisionService
  # ForwardableSimpleAccountFactory (same on all chains)
  FACTORY_ADDRESS = "0x69a05d911af23501ff9d6b811a97cac972dade05"

  # Default chain for smart account provisioning
  DEFAULT_CHAIN_ID = 8453 # Base

  # SimpleAccount proxy bytecode init hash (from factory's createAccount)
  # This is the ERC-1167 minimal proxy prefix + implementation slot
  # keccak256(abi.encodePacked(type(ERC1967Proxy).creationCode, abi.encode(implementation, initData)))
  # For counterfactual: CREATE2 address = keccak256(0xff ++ factory ++ salt ++ initCodeHash)
  PROXY_BYTECODE_PREFIX = "3d602d80600a3d3981f3363d3d373d3d3d363d73"

  class << self
    # Ensure a smart account exists for the given user on the default chain.
    # Idempotent — returns existing record if already provisioned.
    def ensure_smart_account(user)
      existing = user.smart_accounts.find_by(chain_id: DEFAULT_CHAIN_ID)
      return existing if existing

      owner_address = resolve_owner_address(user)
      salt = compute_salt(user)
      address = compute_counterfactual_address(owner_address, salt)
      custody = user.managed? ? "managed" : "self_custody"

      user.smart_accounts.create!(
        chain_id: DEFAULT_CHAIN_ID,
        address: address,
        salt: salt,
        owner_address: owner_address,
        custody_status: custody,
        deployed: false
      )
    end

    private

    def resolve_owner_address(user)
      if user.managed?
        # For managed users: use server signing key
        signing_key = ensure_signing_key(user)
        signing_key.address
      else
        # For self-custody users: use their wallet address
        user.wallet_address
      end
    end

    def ensure_signing_key(user)
      existing = user.signing_keys.active.first
      return existing if existing

      # Generate a new Eth key for this managed user
      key = Eth::Key.new
      encryptor = ActiveSupport::MessageEncryptor.new(encryption_key)

      user.signing_keys.create!(
        encrypted_private_key: encryptor.encrypt_and_sign(key.private_hex),
        address: key.address.to_s,
        is_active: true
      )
    end

    def encryption_key
      # Derive a 32-byte key from SECRET_KEY_BASE
      ActiveSupport::KeyGenerator.new(
        ENV.fetch("SECRET_KEY_BASE", Rails.application.secret_key_base)
      ).generate_key("signing_keys", 32)
    end

    def compute_salt(user)
      # Deterministic salt: keccak256("cocopay:{user.id}")
      input = "cocopay:#{user.id}"
      "0x" + Eth::Util.keccak256(input).unpack1("H*")
    end

    def compute_counterfactual_address(owner_address, salt)
      # Compute CREATE2 address: keccak256(0xff ++ factory ++ salt ++ initCodeHash)
      # The factory's createAccount(owner, salt) deploys an ERC-1967 proxy.
      # For the counterfactual address, we hash the init code with the owner as constructor arg.

      # Encode the owner into the init code hash
      # SimpleAccountFactory.createAccount packs: initCode = proxy creation code + abi.encode(impl, abi.encodeCall(initialize, (owner)))
      # We use a simplified approach: hash(factory, salt_with_owner)
      # The actual factory uses: salt = keccak256(abi.encode(owner, salt_input))
      factory_salt = Eth::Util.keccak256(
        abi_encode_address_and_bytes32(owner_address, salt)
      )

      # For ForwardableSimpleAccountFactory, the init code hash is constant
      # (all proxies have the same bytecode, owner is in the salt)
      init_code_hash = factory_init_code_hash

      # CREATE2: keccak256(0xff ++ deployer ++ salt ++ keccak256(initCode))
      factory_bytes = [FACTORY_ADDRESS.sub("0x", "")].pack("H*")
      prefix = ["ff"].pack("H*")
      packed = prefix + factory_bytes + factory_salt + init_code_hash

      address_bytes = Eth::Util.keccak256(packed)
      "0x" + address_bytes[-20..].unpack1("H*")
    end

    def abi_encode_address_and_bytes32(address, bytes32)
      # ABI encode (address, bytes32) — both are left-padded to 32 bytes
      addr_hex = address.sub("0x", "").downcase.rjust(64, "0")
      salt_hex = bytes32.sub("0x", "").rjust(64, "0")
      [addr_hex + salt_hex].pack("H*")
    end

    def factory_init_code_hash
      # This is the keccak256 of the ERC-1967 proxy init code used by the factory.
      # It's constant for all deployments from this factory.
      # In production, this should be derived from the factory's bytecode.
      # For now, we store the known hash from the deployed factory.
      # TODO: Verify against on-chain factory after first deployment
      @factory_init_code_hash ||= begin
        # Placeholder — will be populated after verifying against the deployed factory.
        # The actual hash depends on the SimpleAccount implementation address baked into the proxy.
        # For counterfactual computation, we fetch this once from chain and cache it.
        if ENV["FACTORY_INIT_CODE_HASH"].present?
          [ENV["FACTORY_INIT_CODE_HASH"].sub("0x", "")].pack("H*")
        else
          # Fallback: compute from known implementation
          # This is the init code hash for ForwardableSimpleAccountFactory at 0x69a0...
          raise "FACTORY_INIT_CODE_HASH env var required for smart account provisioning"
        end
      end
    end
  end
end
