# frozen_string_literal: true

require "rails_helper"

RSpec.describe "API V1 Stores", type: :request do
  let(:user) { create(:user, :verified) }

  describe "GET /v1/stores" do
    before do
      create_list(:store, 3, :deployed, :with_location)
    end

    it "returns list of stores" do
      get "/v1/stores", headers: authenticated_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json_response[:data].length).to eq(3)
    end

    it "filters by location" do
      get "/v1/stores",
          params: { lat: -27.5969, lng: -48.5495 },
          headers: authenticated_headers(user)

      expect(response).to have_http_status(:ok)
    end

    it "searches by name" do
      create(:store, :deployed, name: "Special Store")

      get "/v1/stores",
          params: { search: "Special" },
          headers: authenticated_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json_response[:data].first[:name]).to eq("Special Store")
    end
  end

  describe "GET /v1/stores/:id" do
    let(:store) { create(:store, :deployed, :with_location) }

    it "returns store details" do
      get "/v1/stores/#{store.id}", headers: authenticated_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json_response[:data][:id]).to eq(store.id)
      expect(json_response[:data][:name]).to eq(store.name)
    end

    it "returns 404 for non-existent store" do
      get "/v1/stores/#{SecureRandom.uuid}", headers: authenticated_headers(user)

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /v1/stores" do
    let(:store_params) do
      {
        name: "New Coffee Shop",
        symbol: "COFFEE",
        category: "Coffee & Pastries",
        location: {
          lat: -27.5969,
          lng: -48.5495,
          address: "Rua das Flores, 123"
        }
      }
    end

    it "creates a new store" do
      expect {
        post "/v1/stores",
             params: store_params.to_json,
             headers: authenticated_headers(user)
      }.to change(Store, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json_response[:data][:name]).to eq("New Coffee Shop")
    end

    it "makes user the owner" do
      post "/v1/stores",
           params: store_params.to_json,
           headers: authenticated_headers(user)

      store = Store.last
      expect(store.owner).to eq(user)
    end

    it "validates required fields" do
      post "/v1/stores",
           params: { name: "" }.to_json,
           headers: authenticated_headers(user)

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
