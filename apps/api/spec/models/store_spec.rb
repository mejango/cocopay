# frozen_string_literal: true

require "rails_helper"

RSpec.describe Store, type: :model do
  describe "associations" do
    it { is_expected.to have_many(:store_members).dependent(:destroy) }
    it { is_expected.to have_many(:members).through(:store_members).source(:user) }
    it { is_expected.to have_many(:store_deployments).dependent(:destroy) }
    it { is_expected.to have_many(:transactions) }
    it { is_expected.to have_many(:payouts).dependent(:destroy) }
    it { is_expected.to have_many(:token_balances) }
  end

  describe "validations" do
    subject { build(:store) }

    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_presence_of(:symbol) }
    it { is_expected.to validate_length_of(:symbol).is_at_most(10) }
    it { is_expected.to validate_uniqueness_of(:short_code).allow_nil }
  end

  describe "scopes" do
    describe ".deployed" do
      it "returns stores with deployed status" do
        deployed = create(:store, deployment_status: "deployed")
        pending = create(:store, deployment_status: "pending")

        expect(Store.deployed).to include(deployed)
        expect(Store.deployed).not_to include(pending)
      end
    end

    describe ".nearby" do
      it "returns stores within radius" do
        floripa = create(:store, latitude: -27.5969, longitude: -48.5495)
        sao_paulo = create(:store, latitude: -23.5505, longitude: -46.6333)

        # 10km radius from Florianópolis center
        nearby = Store.nearby(-27.5969, -48.5495, 10)
        expect(nearby).to include(floripa)
        expect(nearby).not_to include(sao_paulo)
      end
    end
  end

  describe "#owner" do
    it "returns the owner member" do
      store = create(:store)
      owner = create(:user)
      create(:store_member, store: store, user: owner, role: "owner")

      expect(store.owner).to eq(owner)
    end
  end
end
