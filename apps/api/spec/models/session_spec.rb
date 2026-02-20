# frozen_string_literal: true

require "rails_helper"

RSpec.describe Session, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:user) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:token_hash) }
    it { is_expected.to validate_presence_of(:auth_method) }
    it { is_expected.to validate_presence_of(:expires_at) }
  end

  describe "scopes" do
    describe ".active" do
      it "returns non-expired, non-revoked sessions" do
        active = create(:session, expires_at: 1.day.from_now)
        expired = create(:session, expires_at: 1.day.ago)
        revoked = create(:session, expires_at: 1.day.from_now, revoked_at: 1.hour.ago)

        expect(Session.active).to include(active)
        expect(Session.active).not_to include(expired, revoked)
      end
    end
  end

  describe "#revoke!" do
    it "sets revoked_at" do
      session = create(:session)
      session.revoke!
      expect(session.revoked_at).to be_present
    end
  end

  describe "#expired?" do
    it "returns true if expired" do
      session = build(:session, expires_at: 1.day.ago)
      expect(session).to be_expired
    end

    it "returns false if not expired" do
      session = build(:session, expires_at: 1.day.from_now)
      expect(session).not_to be_expired
    end
  end
end
