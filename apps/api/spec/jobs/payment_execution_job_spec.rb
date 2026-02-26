# frozen_string_literal: true

require "rails_helper"

RSpec.describe PaymentExecutionJob, type: :job do
  let(:user) { create(:user, :verified) }
  let(:store) { create(:store) }
  let(:transaction) do
    create(:transaction, from_user: user, store: store, status: "pending")
  end
  let(:smart_account) { create(:smart_account, user: user) }
  let(:calldata_array) do
    [
      {
        "chain_id" => "8453",
        "target" => "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "data" => "0x095ea7b3" + "00" * 64,
        "value" => "0"
      }
    ]
  end
  let(:bundle_response) do
    { bundle_id: "bundle-uuid-123", tx_uuids: ["tx-uuid-1"] }
  end

  before do
    smart_account # ensure it's created
  end

  describe "#perform - managed path" do
    before do
      allow(RelayrService).to receive(:create_balance_bundle).and_return(bundle_response)
      allow(BundleStatusJob).to receive(:perform_later)
    end

    it "calls RelayrService.create_balance_bundle with smart account" do
      described_class.perform_now(transaction.id, user.id, calldata_array)

      expect(RelayrService).to have_received(:create_balance_bundle).with(
        transactions: array_including(
          hash_including(chain_id: 8453, target: calldata_array.first["target"])
        ),
        user: user,
        smart_account_address: smart_account.address
      )
    end

    it "updates the transaction with bundle_id" do
      described_class.perform_now(transaction.id, user.id, calldata_array)
      transaction.reload
      expect(transaction.bundle_id).to eq("bundle-uuid-123")
    end

    it "enqueues a BundleStatusJob" do
      described_class.perform_now(transaction.id, user.id, calldata_array)
      expect(BundleStatusJob).to have_received(:perform_later)
        .with(transaction.id, "bundle-uuid-123")
    end
  end

  describe "#perform - self-custody path" do
    let(:signed_forward_requests) do
      [
        {
          "chain_id" => "8453",
          "data" => "0xd5aeaba5" + "00" * 256
        }
      ]
    end

    before do
      allow(RelayrService).to receive(:create_balance_bundle_with_signed_requests)
        .and_return(bundle_response)
      allow(BundleStatusJob).to receive(:perform_later)
    end

    it "calls RelayrService.create_balance_bundle_with_signed_requests" do
      described_class.perform_now(
        transaction.id, user.id, calldata_array, signed_forward_requests
      )

      expect(RelayrService).to have_received(:create_balance_bundle_with_signed_requests)
        .with(signed_requests: array_including(
          hash_including(chain_id: 8453)
        ))
    end

    it "updates the transaction with bundle_id" do
      described_class.perform_now(
        transaction.id, user.id, calldata_array, signed_forward_requests
      )
      transaction.reload
      expect(transaction.bundle_id).to eq("bundle-uuid-123")
    end
  end

  describe "#perform - error handling" do
    before do
      allow(RelayrService).to receive(:create_balance_bundle)
        .and_raise(StandardError, "Relayr API error: 500")
    end

    it "marks the transaction as failed on error" do
      described_class.perform_now(transaction.id, user.id, calldata_array)
      transaction.reload
      expect(transaction.status).to eq("failed")
      expect(transaction.error_code).to eq("EXECUTION_FAILED")
      expect(transaction.error_message).to include("Relayr API error")
    end
  end

  describe "#perform - missing smart account" do
    before do
      smart_account.destroy!
    end

    it "marks the transaction as failed" do
      described_class.perform_now(transaction.id, user.id, calldata_array)
      transaction.reload
      expect(transaction.status).to eq("failed")
      expect(transaction.error_message).to include("no smart account")
    end
  end
end
