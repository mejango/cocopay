# frozen_string_literal: true

require "rails_helper"

RSpec.describe SiweService do
  let(:address) { "0x" + "a1b2c3d4e5" * 4 }
  let(:chain_id) { 8453 }
  let(:domain) { "cocopay.app" }

  describe ".generate_nonce" do
    it "returns a hex nonce string" do
      nonce = described_class.generate_nonce(address)
      expect(nonce).to be_a(String)
      expect(nonce).to match(/\A[0-9a-f]{32}\z/)
    end

    it "stores nonce in Redis with TTL" do
      nonce = described_class.generate_nonce(address)
      stored = described_class.send(:redis).get("siwe_nonce:#{address.downcase}")
      expect(stored).to be_present
      parsed = JSON.parse(stored, symbolize_names: true)
      expect(parsed[:nonce]).to eq(nonce)
    end
  end

  describe ".build_message" do
    it "returns a SIWE-formatted message string" do
      nonce = "abc123def456abc123def456abc123de"
      message = described_class.build_message(
        address: address,
        nonce: nonce,
        chain_id: chain_id,
        domain: domain
      )

      expect(message).to include(domain)
      expect(message).to include(address)
      expect(message).to include("Nonce: #{nonce}")
      expect(message).to include("Chain ID: #{chain_id}")
      expect(message).to include("Version: 1")
    end
  end

  describe ".verify" do
    let(:nonce) { described_class.generate_nonce(address) }

    it "returns nil with expired/missing nonce" do
      result = described_class.verify(
        address: address,
        message: "fake message",
        signature: "0x" + "ff" * 65
      )
      expect(result).to be_nil
    end

    it "returns nil when nonce doesn't match message" do
      _nonce = described_class.generate_nonce(address)
      message = "some message without the right nonce"
      result = described_class.verify(
        address: address,
        message: message,
        signature: "0x" + "ff" * 65
      )
      expect(result).to be_nil
    end
  end
end
