# frozen_string_literal: true

require "rails_helper"

RSpec.describe User, type: :model do
  describe "associations" do
    it { is_expected.to have_many(:sessions).dependent(:destroy) }
    it { is_expected.to have_many(:passkeys).dependent(:destroy) }
    it { is_expected.to have_many(:smart_accounts).dependent(:destroy) }
    it { is_expected.to have_many(:signing_keys).dependent(:destroy) }
    it { is_expected.to have_many(:store_members).dependent(:destroy) }
    it { is_expected.to have_many(:stores).through(:store_members) }
    it { is_expected.to have_many(:token_balances).dependent(:destroy) }
    it { is_expected.to have_many(:loans).dependent(:destroy) }
    it { is_expected.to have_many(:sent_transactions).class_name("Transaction") }
    it { is_expected.to have_many(:received_transactions).class_name("Transaction") }
  end

  describe "validations" do
    subject { build(:user) }

    it { is_expected.to validate_uniqueness_of(:email).case_insensitive }
    it { is_expected.to allow_value("user@example.com").for(:email) }
    it { is_expected.to validate_length_of(:locale).is_at_most(10) }

    context "email user (no wallet)" do
      it "is valid with email and no wallet_address" do
        user = build(:user, wallet_address: nil)
        expect(user).to be_valid
      end

      it "validates email format" do
        user = build(:user, email: "not-an-email")
        expect(user).not_to be_valid
      end
    end

    context "wallet user (no email)" do
      it "is valid with wallet_address and no email" do
        user = build(:wallet_user)
        expect(user).to be_valid
      end

      it "validates wallet_address format" do
        user = build(:wallet_user, wallet_address: "not-an-address")
        expect(user).not_to be_valid
        expect(user.errors[:wallet_address]).to be_present
      end

      it "validates wallet_address must be 42 chars starting with 0x" do
        user = build(:wallet_user, wallet_address: "0xTOOSHORT")
        expect(user).not_to be_valid
      end
    end

    context "dual auth (both email and wallet)" do
      it "is valid with both email and wallet_address" do
        user = build(:user, wallet_address: "0x" + "a" * 40)
        expect(user).to be_valid
      end
    end

    context "neither email nor wallet" do
      it "is invalid without email or wallet_address" do
        user = build(:user, email: nil, wallet_address: nil)
        expect(user).not_to be_valid
        expect(user.errors[:base]).to include("Either email or wallet address is required")
      end
    end

    context "wallet_address uniqueness" do
      it "enforces uniqueness of wallet_address" do
        addr = "0x" + "a" * 40
        create(:wallet_user, wallet_address: addr)
        duplicate = build(:wallet_user, wallet_address: addr)
        expect(duplicate).not_to be_valid
        expect(duplicate.errors[:wallet_address]).to include("has already been taken")
      end

      it "allows multiple nil wallet_addresses" do
        create(:user, wallet_address: nil)
        user = build(:user, wallet_address: nil)
        expect(user).to be_valid
      end
    end
  end

  describe "#managed?" do
    it "returns true for email-only users" do
      user = build(:user, wallet_address: nil)
      expect(user.managed?).to be true
    end

    it "returns false for wallet users" do
      user = build(:wallet_user)
      expect(user.managed?).to be false
    end
  end

  describe "#self_custody?" do
    it "returns true for wallet users" do
      user = build(:wallet_user)
      expect(user.self_custody?).to be true
    end

    it "returns false for email-only users" do
      user = build(:user, wallet_address: nil)
      expect(user.self_custody?).to be false
    end
  end

  describe "#deposit_address" do
    it "returns wallet_address for self-custody users" do
      user = build(:wallet_user, wallet_address: "0x" + "b" * 40)
      expect(user.deposit_address).to eq("0x" + "b" * 40)
    end

    it "returns smart_account_address for managed users" do
      user = create(:user, wallet_address: nil)
      sa = user.smart_accounts.create!(address: "0x" + "c" * 40, chain_id: "8453", salt: "0x1234", owner_address: "0x" + "a" * 40)
      expect(user.deposit_address).to eq("0x" + "c" * 40)
    end
  end

  describe "scopes" do
    describe ".active" do
      it "returns users active in the last 30 days" do
        active_user = create(:user, last_active_at: 1.day.ago)
        inactive_user = create(:user, last_active_at: 60.days.ago)

        expect(User.active).to include(active_user)
        expect(User.active).not_to include(inactive_user)
      end
    end
  end

  describe "#touch_last_active" do
    it "updates last_active_at" do
      user = create(:user, last_active_at: 1.day.ago)
      user.touch_last_active
      expect(user.last_active_at).to be_within(1.second).of(Time.current)
    end
  end
end
