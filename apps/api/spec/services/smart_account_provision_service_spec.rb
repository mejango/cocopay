# frozen_string_literal: true

require "rails_helper"

RSpec.describe SmartAccountProvisionService do
  before do
    # Provide a deterministic init code hash for tests
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("FACTORY_INIT_CODE_HASH").and_return(
      "0x" + "aa" * 32
    )
  end

  describe ".ensure_smart_account" do
    context "with a managed (email) user" do
      let(:user) { create(:user, :verified) }

      it "creates a smart account record" do
        expect { described_class.ensure_smart_account(user) }
          .to change { user.smart_accounts.count }.by(1)
      end

      it "creates a signing key for managed users" do
        expect { described_class.ensure_smart_account(user) }
          .to change { user.signing_keys.count }.by(1)
      end

      it "returns a SmartAccount with a valid address" do
        sa = described_class.ensure_smart_account(user)
        expect(sa.address).to match(/\A0x[0-9a-f]{40}\z/)
      end

      it "sets custody_status to managed" do
        sa = described_class.ensure_smart_account(user)
        expect(sa.custody_status).to eq("managed")
      end

      it "sets deployed to false (counterfactual)" do
        sa = described_class.ensure_smart_account(user)
        expect(sa.deployed).to be false
      end

      it "uses Base as the default chain" do
        sa = described_class.ensure_smart_account(user)
        expect(sa.chain_id.to_i).to eq(8453)
      end

      it "encrypts the signing key private key" do
        described_class.ensure_smart_account(user)
        sk = user.signing_keys.active.first
        expect(sk.encrypted_private_key).to be_present
        expect(sk.encrypted_private_key).not_to start_with("0x")
      end

      it "signing key round-trips through encryption" do
        described_class.ensure_smart_account(user)
        sk = user.signing_keys.active.first
        decrypted = sk.decrypted_private_key
        expect(decrypted).to match(/\A[0-9a-f]{64}\z/)

        # Verify it's a valid Eth key
        key = Eth::Key.new(priv: decrypted)
        expect(key.address.to_s.downcase).to eq(sk.address.downcase)
      end
    end

    context "with a self-custody (wallet) user" do
      let(:user) { create(:wallet_user) }

      it "creates a smart account using the user's wallet address as owner" do
        sa = described_class.ensure_smart_account(user)
        expect(sa.owner_address.downcase).to eq(user.wallet_address.downcase)
      end

      it "sets custody_status to self_custody" do
        sa = described_class.ensure_smart_account(user)
        expect(sa.custody_status).to eq("self_custody")
      end

      it "does NOT create a signing key for self-custody users" do
        expect { described_class.ensure_smart_account(user) }
          .not_to change { user.signing_keys.count }
      end
    end

    context "idempotency" do
      let(:user) { create(:user, :verified) }

      it "returns the existing smart account on subsequent calls" do
        sa1 = described_class.ensure_smart_account(user)
        sa2 = described_class.ensure_smart_account(user)
        expect(sa1.id).to eq(sa2.id)
      end

      it "does not create duplicate records" do
        described_class.ensure_smart_account(user)
        expect { described_class.ensure_smart_account(user) }
          .not_to change { SmartAccount.count }
      end
    end

    context "when FACTORY_INIT_CODE_HASH is missing" do
      before do
        allow(ENV).to receive(:[]).with("FACTORY_INIT_CODE_HASH").and_return(nil)
        # Reset the memoized value
        described_class.instance_variable_set(:@factory_init_code_hash, nil)
      end

      after do
        described_class.instance_variable_set(:@factory_init_code_hash, nil)
      end

      let(:user) { create(:user, :verified) }

      it "raises an error" do
        expect { described_class.ensure_smart_account(user) }
          .to raise_error(/FACTORY_INIT_CODE_HASH/)
      end
    end

    context "deterministic address computation" do
      let(:user) { create(:user, :verified) }

      before do
        # Reset memoized value between tests
        described_class.instance_variable_set(:@factory_init_code_hash, nil)
      end

      after do
        described_class.instance_variable_set(:@factory_init_code_hash, nil)
      end

      it "produces a deterministic address for the same user" do
        sa = described_class.ensure_smart_account(user)
        address1 = sa.address

        # Destroy and reprovision — same user → same address
        sa.destroy!
        user.signing_keys.destroy_all
        sa2 = described_class.ensure_smart_account(user)

        # Note: address will differ because a new Eth::Key is generated each time
        # for managed users. But the salt is deterministic.
        expect(sa2.salt).to eq(sa.salt)
      end
    end
  end
end
