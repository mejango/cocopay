# frozen_string_literal: true

require "rails_helper"

RSpec.describe Transaction, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:from_user).class_name("User").optional }
    it { is_expected.to belong_to(:to_user).class_name("User").optional }
    it { is_expected.to belong_to(:store).optional }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:transaction_type) }
    it { is_expected.to validate_presence_of(:chain_id) }
    it { is_expected.to validate_presence_of(:amount_usd) }
    it { is_expected.to validate_numericality_of(:amount_usd).is_greater_than(0) }
  end

  describe "scopes" do
    describe ".pending" do
      it "returns pending transactions" do
        pending = create(:transaction, status: "pending")
        confirmed = create(:transaction, status: "confirmed")

        expect(Transaction.pending).to include(pending)
        expect(Transaction.pending).not_to include(confirmed)
      end
    end

    describe ".confirmed" do
      it "returns confirmed transactions" do
        pending = create(:transaction, status: "pending")
        confirmed = create(:transaction, status: "confirmed")

        expect(Transaction.confirmed).not_to include(pending)
        expect(Transaction.confirmed).to include(confirmed)
      end
    end

    describe ".payments" do
      it "returns payment type transactions" do
        payment = create(:transaction, transaction_type: "payment")
        payout = create(:transaction, transaction_type: "payout")

        expect(Transaction.payments).to include(payment)
        expect(Transaction.payments).not_to include(payout)
      end
    end
  end

  describe "#confirm!" do
    it "updates status and sets confirmed_at" do
      transaction = create(:transaction, status: "pending")
      transaction.confirm!(tx_hash: "0x123", block_number: 12345)

      expect(transaction.status).to eq("confirmed")
      expect(transaction.tx_hash).to eq("0x123")
      expect(transaction.block_number).to eq(12345)
      expect(transaction.confirmed_at).to be_present
    end
  end

  describe "#fail!" do
    it "updates status and sets error info" do
      transaction = create(:transaction, status: "pending")
      transaction.fail!(code: "BUNDLE_FAILED", message: "Transaction reverted")

      expect(transaction.status).to eq("failed")
      expect(transaction.error_code).to eq("BUNDLE_FAILED")
      expect(transaction.error_message).to eq("Transaction reverted")
    end
  end
end
