# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Health Endpoints", type: :request do
  describe "GET /up" do
    it "returns OK" do
      get "/up"
      expect(response).to have_http_status(:ok)
      expect(response.body).to eq("OK")
    end
  end

  describe "GET /health/ready" do
    it "returns healthy when all checks pass" do
      allow(Redis).to receive(:new).and_return(
        instance_double(Redis, ping: "PONG", close: nil)
      )

      get "/health/ready"
      expect(response).to have_http_status(:ok)
      expect(json_response[:status]).to eq("healthy")
    end
  end
end
