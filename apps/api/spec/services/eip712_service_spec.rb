# frozen_string_literal: true

require "rails_helper"

RSpec.describe Eip712Service do
  let(:chain_id) { 8453 }
  let(:key) { Eth::Key.new }
  let(:target) { "0x" + "ab" * 20 }
  let(:request) do
    {
      from: key.address.to_s,
      to: target,
      value: 0,
      gas: 500_000,
      nonce: 0,
      deadline: (Time.current + 1.hour).to_i,
      data: "0xb61d27f6" + "00" * 96
    }
  end

  describe ".domain_separator" do
    it "returns a 32-byte binary string" do
      result = described_class.domain_separator(chain_id)
      expect(result.bytesize).to eq(32)
    end

    it "produces different separators for different chains" do
      sep_base = described_class.domain_separator(8453)
      sep_eth = described_class.domain_separator(1)
      expect(sep_base).not_to eq(sep_eth)
    end

    it "is deterministic for the same chain" do
      a = described_class.domain_separator(chain_id)
      b = described_class.domain_separator(chain_id)
      expect(a).to eq(b)
    end
  end

  describe ".hash_forward_request" do
    it "returns a 32-byte binary hash" do
      result = described_class.hash_forward_request(request)
      expect(result.bytesize).to eq(32)
    end

    it "changes when request fields change" do
      hash1 = described_class.hash_forward_request(request)
      modified = request.merge(nonce: 1)
      hash2 = described_class.hash_forward_request(modified)
      expect(hash1).not_to eq(hash2)
    end
  end

  describe ".typed_data_hash" do
    it "returns a 32-byte binary hash" do
      result = described_class.typed_data_hash(chain_id: chain_id, request: request)
      expect(result.bytesize).to eq(32)
    end

    it "changes when chain_id changes" do
      hash1 = described_class.typed_data_hash(chain_id: 8453, request: request)
      hash2 = described_class.typed_data_hash(chain_id: 1, request: request)
      expect(hash1).not_to eq(hash2)
    end
  end

  describe ".sign_forward_request" do
    it "returns a signature and hash" do
      result = described_class.sign_forward_request(key: key, chain_id: chain_id, request: request)

      expect(result[:signature]).to start_with("0x")
      expect(result[:hash]).to start_with("0x")
      # Signature should be 65 bytes (130 hex chars + 0x prefix)
      expect(result[:signature].sub("0x", "").length).to eq(130)
    end

    it "produces a signature recoverable to the signer" do
      result = described_class.sign_forward_request(key: key, chain_id: chain_id, request: request)
      hash_bytes = [result[:hash].sub("0x", "")].pack("H*")

      # Recover public key from signature
      sig_hex = result[:signature].sub("0x", "")
      recovered = Eth::Signature.recover(hash_bytes, sig_hex)
      recovered_addr = Eth::Util.public_key_to_address(recovered)

      expect(recovered_addr.to_s.downcase).to eq(key.address.to_s.downcase)
    end

    it "different keys produce different signatures" do
      key2 = Eth::Key.new
      request2 = request.merge(from: key2.address.to_s)

      sig1 = described_class.sign_forward_request(key: key, chain_id: chain_id, request: request)
      sig2 = described_class.sign_forward_request(key: key2, chain_id: chain_id, request: request2)

      expect(sig1[:signature]).not_to eq(sig2[:signature])
    end
  end

  describe ".encode_execute_calldata" do
    it "returns hex calldata starting with the execute selector" do
      result = described_class.sign_forward_request(key: key, chain_id: chain_id, request: request)
      calldata = described_class.encode_execute_calldata(request, result[:signature])

      expect(calldata).to start_with("0x")
      # execute((address,address,uint256,uint256,uint48,bytes,bytes)) selector
      selector = Eth::Util.keccak256(
        "execute((address,address,uint256,uint256,uint48,bytes,bytes))"
      )[0, 4].unpack1("H*")
      expect(calldata[2..9]).to eq(selector)
    end

    it "produces valid ABI-encoded calldata" do
      result = described_class.sign_forward_request(key: key, chain_id: chain_id, request: request)
      calldata = described_class.encode_execute_calldata(request, result[:signature])

      # Strip selector (4 bytes = 8 hex chars) and 0x prefix
      body = calldata[10..]
      # Should be word-aligned (multiple of 64 hex chars = 32 bytes)
      expect(body.length % 64).to eq(0)
    end
  end
end
