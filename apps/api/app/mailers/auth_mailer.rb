# frozen_string_literal: true

class AuthMailer < ApplicationMailer
  def magic_link(user, token)
    @user = user
    @token = token
    @url = magic_link_url(token)

    mail(
      to: user.email,
      subject: "Sign in to CocoPay"
    )
  end

  private

  def magic_link_url(token)
    host = ENV.fetch("WEB_APP_URL", "http://localhost:5173")
    "#{host}/auth/verify?token=#{token}"
  end
end
