# frozen_string_literal: true

class AuthMailer < ApplicationMailer
  def magic_link(user, token)
    @user = user
    @code = token

    mail(
      to: user.email,
      subject: "#{token} — CocoPay sign-in code"
    )
  end
end
