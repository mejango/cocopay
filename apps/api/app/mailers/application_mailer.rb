class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAILER_FROM", "noreply@cocopay.biz")
  layout "mailer"
end
