# frozen_string_literal: true

module Api
  module V1
    class AuthController < BaseController
      skip_before_action :authenticate_user!, only: [:send_magic_link, :verify_magic_link, :wallet_nonce, :verify_siwe]

      def send_magic_link
        email = params[:email]&.downcase&.strip

        unless email.present? && email.match?(URI::MailTo::EMAIL_REGEXP)
          return render_error(
            code: "VALIDATION_ERROR",
            message: "Invalid email address",
            status: :unprocessable_entity
          )
        end

        user = User.find_or_create_by!(email: email)
        result = MagicLinkService.generate(user)

        # In development, log the token for testing
        Rails.logger.info "Magic link token for #{email}: #{result[:token]}" if Rails.env.development?

        # Send email synchronously so we can report delivery errors
        AuthMailer.magic_link(user, result[:token]).deliver_now

        render_success({
          verification_id: result[:verification_id],
          expires_at: result[:expires_at].iso8601
        })
      rescue Mailgun::Unauthorized, Mailgun::CommunicationError => e
        Rails.logger.error "Mailgun delivery failed: #{e.message}"
        render_error(
          code: "EMAIL_DELIVERY_FAILED",
          message: "Failed to send email. Please try again later.",
          status: :service_unavailable
        )
      rescue ActiveRecord::RecordInvalid => e
        render_error(
          code: "VALIDATION_ERROR",
          message: e.message,
          status: :unprocessable_entity
        )
      end

      def verify_magic_link
        verification_id = params[:verification_id]
        token = params[:token]

        result = MagicLinkService.verify(verification_id, token)

        if result == :too_many_attempts
          return render_error(
            code: "TOO_MANY_ATTEMPTS",
            message: "Too many failed attempts. Please request a new code.",
            status: :too_many_requests
          )
        end

        unless result
          return render_error(
            code: "UNAUTHORIZED",
            message: "Invalid or expired verification code",
            status: :unauthorized
          )
        end

        user = result[:user]
        user.update!(email_verified_at: Time.current) unless user.email_verified_at
        provision_smart_account(user)

        session = create_session(user, auth_method: "email")
        jwt = JwtService.encode({ user_id: user.id, session_id: session.id })

        render_success({
          token: jwt,
          user: serialize_user(user),
          is_new_user: user.created_at > 1.minute.ago
        })
      end

      def wallet_nonce
        address = params[:address]

        unless address.present? && address.match?(/\A0x[0-9a-fA-F]{40}\z/)
          return render_error(
            code: "VALIDATION_ERROR",
            message: "Invalid wallet address",
            status: :unprocessable_entity
          )
        end

        nonce = SiweService.generate_nonce(address)

        render_success({ nonce: nonce })
      end

      def verify_siwe
        address = params[:address]
        message = params[:message]
        signature = params[:signature]

        unless address.present? && message.present? && signature.present?
          return render_error(
            code: "VALIDATION_ERROR",
            message: "Missing required parameters: address, message, signature",
            status: :unprocessable_entity
          )
        end

        result = SiweService.verify(address: address, message: message, signature: signature)

        unless result
          return render_error(
            code: "UNAUTHORIZED",
            message: "Invalid signature or expired nonce",
            status: :unauthorized
          )
        end

        verified_address = result[:address]
        user = User.find_or_create_by!(wallet_address: verified_address)
        provision_smart_account(user)

        session = create_session(user, auth_method: "wallet")
        jwt = JwtService.encode({ user_id: user.id, session_id: session.id })

        render_success({
          token: jwt,
          user: serialize_user(user),
          is_new_user: user.created_at > 1.minute.ago
        })
      end

      def logout
        # Find and revoke current session
        token = request.headers["Authorization"]&.split(" ")&.last
        return render_success({ logged_out: true }) unless token

        decoded = JwtService.decode(token)
        if decoded && decoded[:session_id]
          Session.find_by(id: decoded[:session_id])&.revoke!
        end

        render_success({ logged_out: true })
      end

      private

      def create_session(user, auth_method: "email")
        Session.create!(
          user: user,
          token_hash: Digest::SHA256.hexdigest(SecureRandom.hex(32)),
          auth_method: auth_method,
          expires_at: 30.days.from_now,
          device_info: extract_device_info,
          ip_address: request.remote_ip
        )
      end

      def extract_device_info
        {
          user_agent: request.user_agent,
          platform: request.headers["X-Platform"],
          app_version: request.headers["X-App-Version"]
        }.compact
      end

      def provision_smart_account(user)
        SmartAccountProvisionService.ensure_smart_account(user)
      rescue StandardError => e
        Rails.logger.error "Smart account provisioning failed for user #{user.id}: #{e.message}"
      end

      def serialize_user(user)
        {
          id: user.id,
          email: user.email,
          name: user.name,
          wallet_address: user.wallet_address,
          created_at: user.created_at.iso8601
        }
      end
    end
  end
end
