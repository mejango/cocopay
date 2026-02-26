# frozen_string_literal: true

class Eip712Service
  # ERC-2771 ForwarderV2 domain (same on all chains)
  FORWARDER_NAME = "ERC2771Forwarder"
  FORWARDER_VERSION = "1"
  FORWARDER_ADDRESS = "0xc29d6995ab3b0df4650ad643adeac55e7acbb566"

  # EIP-712 type hashes
  DOMAIN_TYPEHASH = Eth::Util.keccak256(
    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
  )

  FORWARD_REQUEST_TYPEHASH = Eth::Util.keccak256(
    "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint48 deadline,bytes data)"
  )

  class << self
    # Compute the EIP-712 domain separator for the forwarder on a given chain.
    def domain_separator(chain_id)
      Eth::Util.keccak256(
        abi_encode(
          DOMAIN_TYPEHASH,
          Eth::Util.keccak256(FORWARDER_NAME),
          Eth::Util.keccak256(FORWARDER_VERSION),
          uint256(chain_id),
          address(FORWARDER_ADDRESS)
        )
      )
    end

    # Hash a ForwardRequest struct per EIP-712.
    def hash_forward_request(request)
      Eth::Util.keccak256(
        abi_encode(
          FORWARD_REQUEST_TYPEHASH,
          address(request[:from]),
          address(request[:to]),
          uint256(request[:value]),
          uint256(request[:gas]),
          uint256(request[:nonce]),
          uint48(request[:deadline]),
          Eth::Util.keccak256(hex_to_bytes(request[:data]))
        )
      )
    end

    # Build the full EIP-712 signing hash: \x19\x01 + domainSeparator + structHash
    def typed_data_hash(chain_id:, request:)
      domain = domain_separator(chain_id)
      struct = hash_forward_request(request)

      Eth::Util.keccak256(
        "\x19\x01" + domain + struct
      )
    end

    # Sign a ForwardRequest with an Eth::Key.
    # Returns {v, r, s} signature components and packed signature bytes.
    def sign_forward_request(key:, chain_id:, request:)
      hash = typed_data_hash(chain_id: chain_id, request: request)
      signature = key.sign(hash)

      # Eth::Key.sign returns a hex string of 65 bytes (r + s + v)
      sig_hex = signature.sub("0x", "")
      {
        signature: "0x" + sig_hex,
        hash: "0x" + hash.unpack1("H*")
      }
    end

    # Encode the forwarder.execute(ForwardRequestData) calldata.
    # ForwardRequestData = (from, to, value, gas, deadline, data, signature)
    def encode_execute_calldata(request, signature)
      # execute((address,address,uint256,uint256,uint48,bytes,bytes))
      # Selector: keccak256("execute((address,address,uint256,uint256,uint48,bytes,bytes))")
      selector = Eth::Util.keccak256(
        "execute((address,address,uint256,uint256,uint48,bytes,bytes))"
      )[0, 4].unpack1("H*")

      # The struct is a tuple, so it gets an offset pointer
      # Offset to tuple start = 0x20
      data_bytes = hex_to_bytes(request[:data]).unpack1("H*")
      sig_bytes = signature.sub("0x", "")

      # Build the tuple encoding
      # Static fields first, then dynamic offsets
      from_enc = pad_left(request[:from].sub("0x", ""), 64)
      to_enc = pad_left(request[:to].sub("0x", ""), 64)
      value_enc = pad_left(request[:value].to_i.to_s(16), 64)
      gas_enc = pad_left(request[:gas].to_i.to_s(16), 64)
      deadline_enc = pad_left(request[:deadline].to_i.to_s(16), 64)

      # Dynamic fields: data offset, signature offset
      # 7 fields * 32 bytes = 224 = 0xe0
      data_offset = pad_left("e0", 64) # 7 * 32
      # sig offset = 0xe0 + 32 (data length) + ceil(data_bytes.length/2, 32) * 32
      data_padded_len = ((data_bytes.length / 2 + 31) / 32) * 32
      sig_offset_val = 0xe0 + 32 + data_padded_len
      sig_offset = pad_left(sig_offset_val.to_s(16), 64)

      # Encode data bytes
      data_len = pad_left((data_bytes.length / 2).to_s(16), 64)
      data_padded = data_bytes + "0" * ((data_padded_len * 2) - data_bytes.length)

      # Encode signature bytes
      sig_len = pad_left((sig_bytes.length / 2).to_s(16), 64)
      sig_padded_len = ((sig_bytes.length / 2 + 31) / 32) * 32
      sig_padded = sig_bytes + "0" * ((sig_padded_len * 2) - sig_bytes.length)

      # Combine: selector + offset_to_tuple + tuple_fields
      tuple_offset = pad_left("20", 64)

      "0x" + selector +
        tuple_offset +
        from_enc + to_enc + value_enc + gas_enc + deadline_enc +
        data_offset + sig_offset +
        data_len + data_padded +
        sig_len + sig_padded
    end

    private

    # Pack a value as bytes32
    def uint256(value)
      [value.to_i.to_s(16).rjust(64, "0")].pack("H*")
    end

    def uint48(value)
      uint256(value)
    end

    def address(addr)
      [addr.sub("0x", "").downcase.rjust(64, "0")].pack("H*")
    end

    # Concatenate binary strings (ABI encode without length prefix)
    def abi_encode(*parts)
      parts.join
    end

    def hex_to_bytes(hex)
      [hex.sub("0x", "")].pack("H*")
    end

    def pad_left(hex, length)
      hex.rjust(length, "0")
    end
  end
end
