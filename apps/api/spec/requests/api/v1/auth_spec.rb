# frozen_string_literal: true

require "rails_helper"

RSpec.describe "API V1 Auth", type: :request do
  describe "POST /api/v1/auth/email/send" do
    let(:email) { "user@example.com" }

    context "with valid email" do
      it "sends magic link and returns verification_id" do
        post "/api/v1/auth/email/send",
             params: { email: email }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:ok)
        expect(json_response[:data][:verification_id]).to be_present
        expect(json_response[:data][:expires_at]).to be_present
      end

      it "creates or finds user" do
        expect {
          post "/api/v1/auth/email/send",
               params: { email: email }.to_json,
               headers: json_headers
        }.to change(User, :count).by(1)
      end

      it "finds existing user" do
        create(:user, email: email)

        expect {
          post "/api/v1/auth/email/send",
               params: { email: email }.to_json,
               headers: json_headers
        }.not_to change(User, :count)
      end
    end

    context "with invalid email" do
      it "returns validation error" do
        post "/api/v1/auth/email/send",
             params: { email: "invalid" }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json_response[:error][:code]).to eq("VALIDATION_ERROR")
      end
    end
  end

  describe "POST /api/v1/auth/email/verify" do
    let(:user) { create(:user) }
    let(:magic_link_result) { MagicLinkService.generate(user) }
    let(:token) { magic_link_result[:token] }
    let(:verification_id) { magic_link_result[:verification_id] }

    context "with valid token" do
      it "returns JWT and user" do
        post "/api/v1/auth/email/verify",
             params: { verification_id: verification_id, token: token }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:ok)
        expect(json_response[:data][:token]).to be_present
        expect(json_response[:data][:user][:id]).to eq(user.id)
      end

      it "creates a session" do
        expect {
          post "/api/v1/auth/email/verify",
               params: { verification_id: verification_id, token: token }.to_json,
               headers: json_headers
        }.to change(Session, :count).by(1)
      end
    end

    context "with invalid token" do
      it "returns unauthorized" do
        post "/api/v1/auth/email/verify",
             params: { verification_id: verification_id, token: "wrong" }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with expired verification" do
      it "returns unauthorized" do
        post "/api/v1/auth/email/verify",
             params: { verification_id: "nonexistent", token: token }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "DELETE /api/v1/auth/session" do
    let(:user) { create(:user) }

    it "revokes current session" do
      delete "/api/v1/auth/session", headers: authenticated_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json_response[:data][:logged_out]).to be true
    end

    it "requires authentication" do
      delete "/api/v1/auth/session", headers: json_headers

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
