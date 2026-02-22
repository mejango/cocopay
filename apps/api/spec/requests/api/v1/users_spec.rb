# frozen_string_literal: true

require "rails_helper"

RSpec.describe "API V1 Users", type: :request do
  let(:user) { create(:user, :verified, name: "João Silva") }

  describe "GET /api/v1/user" do
    it "returns current user profile" do
      get "/api/v1/user", headers: authenticated_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json_response[:data][:id]).to eq(user.id)
      expect(json_response[:data][:name]).to eq("João Silva")
    end

    it "requires authentication" do
      get "/api/v1/user", headers: json_headers
      expect(response).to have_http_status(:unauthorized)
    end

    context "email user (managed)" do
      it "returns auth_type managed and smart_account deposit_address" do
        user.smart_accounts.create!(address: "0x" + "d" * 40, chain_id: "8453", salt: "0x1234", owner_address: "0x" + "a" * 40)
        get "/api/v1/user", headers: authenticated_headers(user)

        expect(response).to have_http_status(:ok)
        expect(json_response[:data][:auth_type]).to eq("managed")
        expect(json_response[:data][:deposit_address]).to eq("0x" + "d" * 40)
      end
    end

    context "wallet user (self_custody)" do
      let(:wallet_user) { create(:wallet_user, :verified) }

      it "returns auth_type self_custody and wallet deposit_address" do
        get "/api/v1/user", headers: authenticated_headers(wallet_user)

        expect(response).to have_http_status(:ok)
        expect(json_response[:data][:auth_type]).to eq("self_custody")
        expect(json_response[:data][:deposit_address]).to eq(wallet_user.wallet_address)
        expect(json_response[:data][:wallet_address]).to eq(wallet_user.wallet_address)
      end
    end
  end

  describe "PATCH /api/v1/user" do
    it "updates user profile" do
      patch "/api/v1/user",
            params: { name: "João Updated", locale: "en-US" }.to_json,
            headers: authenticated_headers(user)

      expect(response).to have_http_status(:ok)
      expect(user.reload.name).to eq("João Updated")
      expect(user.locale).to eq("en-US")
    end

    it "validates input" do
      patch "/api/v1/user",
            params: { locale: "invalid-locale-too-long" }.to_json,
            headers: authenticated_headers(user)

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "GET /api/v1/user/balance" do
    before do
      create(:token_balance, :usdc, user: user, balance_usd: 50.00)
      store = create(:store, :deployed)
      create(:token_balance, :store_token, user: user, store: store, balance_usd: 35.00)
    end

    it "returns user balance breakdown" do
      get "/api/v1/user/balance", headers: authenticated_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json_response[:data][:total_usd]).to eq("85.00")
      expect(json_response[:data][:breakdown]).to be_an(Array)
    end
  end

  describe "GET /api/v1/user/transactions" do
    before do
      store = create(:store)
      3.times { create(:transaction, :confirmed, from_user: user, store: store) }
    end

    it "returns paginated transactions" do
      get "/api/v1/user/transactions", headers: authenticated_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json_response[:data].length).to eq(3)
      expect(json_response[:meta][:total]).to eq(3)
    end

    it "filters by type" do
      get "/api/v1/user/transactions",
          params: { type: "payment" },
          headers: authenticated_headers(user)

      expect(response).to have_http_status(:ok)
    end
  end
end
