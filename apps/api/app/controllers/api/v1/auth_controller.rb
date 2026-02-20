# frozen_string_literal: true

module Api
  module V1
    class AuthController < BaseController
      skip_before_action :authenticate_user!, only: [:send_magic_link, :verify_magic_link]

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

        # Send email (would be async in production)
        AuthMailer.magic_link(user, result[:token]).deliver_later

        render_success({
          verification_id: result[:verification_id],
          expires_at: result[:expires_at].iso8601
        })
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

        unless result
          return render_error(
            code: "UNAUTHORIZED",
            message: "Invalid or expired verification link",
            status: :unauthorized
          )
        end

        user = result[:user]
        user.update!(email_verified_at: Time.current) unless user.email_verified_at

        session = create_session(user)
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

      def create_session(user)
        Session.create!(
          user: user,
          token_hash: Digest::SHA256.hexdigest(SecureRandom.hex(32)),
          auth_method: "email",
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

      def serialize_user(user)
        {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          created_at: user.created_at.iso8601
        }
      end
    end
  end
end
