# frozen_string_literal: true

require "rails_helper"

RSpec.describe SigningKey, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:user) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:encrypted_private_key) }
    it { is_expected.to validate_presence_of(:address) }
  end

  describe "scopes" do
    let(:user) { create(:user) }
    let!(:active_key) { create(:signing_key, user: user, is_active: true) }
    let!(:revoked_key) { create(:signing_key, user: user, is_active: false) }

    it ".active returns only active keys" do
      expect(described_class.active).to include(active_key)
      expect(described_class.active).not_to include(revoked_key)
    end
  end

  describe "#revoke!" do
    let(:key) { create(:signing_key, user: create(:user), is_active: true) }

    it "sets is_active to false and records revoked_at" do
      key.revoke!
      expect(key.is_active).to be false
      expect(key.revoked_at).to be_present
    end
  end

  describe "encryption round-trip" do
    let(:user) { create(:user) }

    it "encrypts and decrypts the private key correctly" do
      eth_key = Eth::Key.new
      encryptor = ActiveSupport::MessageEncryptor.new(described_class.encryption_key)

      sk = described_class.create!(
        user: user,
        encrypted_private_key: encryptor.encrypt_and_sign(eth_key.private_hex),
        address: eth_key.address.to_s,
        is_active: true
      )

      decrypted = sk.decrypted_private_key
      expect(decrypted).to eq(eth_key.private_hex)

      # Verify we can reconstruct the same Eth key
      restored = Eth::Key.new(priv: decrypted)
      expect(restored.address.to_s.downcase).to eq(eth_key.address.to_s.downcase)
    end
  end
end
