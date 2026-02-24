# frozen_string_literal: true

require "rails_helper"

RSpec.describe "API V1 Auth", type: :request do
  describe "POST /v1/auth/email/send" do
    let(:email) { "user@example.com" }

    context "with valid email" do
      it "sends magic link and returns verification_id" do
        post "/v1/auth/email/send",
             params: { email: email }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:ok)
        expect(json_response[:data][:verification_id]).to be_present
        expect(json_response[:data][:expires_at]).to be_present
      end

      it "creates or finds user" do
        expect {
          post "/v1/auth/email/send",
               params: { email: email }.to_json,
               headers: json_headers
        }.to change(User, :count).by(1)
      end

      it "finds existing user" do
        create(:user, email: email)

        expect {
          post "/v1/auth/email/send",
               params: { email: email }.to_json,
               headers: json_headers
        }.not_to change(User, :count)
      end
    end

    context "with invalid email" do
      it "returns validation error" do
        post "/v1/auth/email/send",
             params: { email: "invalid" }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json_response[:error][:code]).to eq("VALIDATION_ERROR")
      end
    end
  end

  describe "POST /v1/auth/email/verify" do
    let(:user) { create(:user) }
    let(:magic_link_result) { MagicLinkService.generate(user) }
    let(:token) { magic_link_result[:token] }
    let(:verification_id) { magic_link_result[:verification_id] }

    context "with valid token" do
      it "returns JWT and user" do
        post "/v1/auth/email/verify",
             params: { verification_id: verification_id, token: token }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:ok)
        expect(json_response[:data][:token]).to be_present
        expect(json_response[:data][:user][:id]).to eq(user.id)
      end

      it "creates a session" do
        expect {
          post "/v1/auth/email/verify",
               params: { verification_id: verification_id, token: token }.to_json,
               headers: json_headers
        }.to change(Session, :count).by(1)
      end
    end

    context "with invalid token" do
      it "returns unauthorized" do
        post "/v1/auth/email/verify",
             params: { verification_id: verification_id, token: "wrong" }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with expired verification" do
      it "returns unauthorized" do
        post "/v1/auth/email/verify",
             params: { verification_id: "nonexistent", token: token }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "POST /v1/auth/wallet/nonce" do
    let(:address) { "0x" + "a1b2c3d4e5" * 4 }

    it "returns a nonce" do
      post "/v1/auth/wallet/nonce",
           params: { address: address }.to_json,
           headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json_response[:data][:nonce]).to be_present
    end

    it "returns 422 without address" do
      post "/v1/auth/wallet/nonce",
           params: {}.to_json,
           headers: json_headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "POST /v1/auth/wallet/siwe" do
    let(:address) { "0x" + "a1b2c3d4e5" * 4 }

    context "with valid signature" do
      before do
        allow(SiweService).to receive(:verify).and_return({ address: address.downcase })
      end

      it "returns JWT and user for new wallet" do
        post "/v1/auth/wallet/siwe",
             params: { address: address, message: "test message", signature: "0xsig" }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:ok)
        expect(json_response[:data][:token]).to be_present
        expect(json_response[:data][:user][:wallet_address]).to eq(address.downcase)
      end

      it "creates a new user for unknown wallet" do
        expect {
          post "/v1/auth/wallet/siwe",
               params: { address: address, message: "test message", signature: "0xsig" }.to_json,
               headers: json_headers
        }.to change(User, :count).by(1)
      end

      it "finds existing wallet user" do
        create(:wallet_user, wallet_address: address.downcase)

        expect {
          post "/v1/auth/wallet/siwe",
               params: { address: address, message: "test message", signature: "0xsig" }.to_json,
               headers: json_headers
        }.not_to change(User, :count)
      end

      it "creates session with wallet auth method" do
        expect {
          post "/v1/auth/wallet/siwe",
               params: { address: address, message: "test message", signature: "0xsig" }.to_json,
               headers: json_headers
        }.to change(Session, :count).by(1)

        session = Session.last
        expect(session.auth_method).to eq("wallet")
      end
    end

    context "with invalid signature" do
      before do
        allow(SiweService).to receive(:verify).and_return(nil)
      end

      it "returns 401" do
        post "/v1/auth/wallet/siwe",
             params: { address: address, message: "test message", signature: "0xbadsig" }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with missing params" do
      it "returns 422" do
        post "/v1/auth/wallet/siwe",
             params: { address: address }.to_json,
             headers: json_headers

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe "DELETE /v1/auth/session" do
    let(:user) { create(:user) }

    it "revokes current session" do
      delete "/v1/auth/session", headers: authenticated_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json_response[:data][:logged_out]).to be true
    end

    it "requires authentication" do
      delete "/v1/auth/session", headers: json_headers

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
