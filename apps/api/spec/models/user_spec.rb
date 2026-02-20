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

    it { is_expected.to validate_uniqueness_of(:phone).case_insensitive.allow_nil }
    it { is_expected.to validate_uniqueness_of(:email).case_insensitive.allow_nil }
    it { is_expected.to allow_value("+5548999999999").for(:phone) }
    it { is_expected.to allow_value("user@example.com").for(:email) }
    it { is_expected.to validate_length_of(:locale).is_at_most(10) }

    it "requires at least phone or email" do
      user = build(:user, phone: nil, email: nil)
      expect(user).not_to be_valid
      expect(user.errors[:base]).to include("Phone or email is required")
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
