# frozen_string_literal: true

module RequestSpecHelpers
  def json_response
    JSON.parse(response.body, symbolize_names: true)
  end

  def auth_headers(user)
    token = JwtService.encode({ user_id: user.id })
    { "Authorization" => "Bearer #{token}" }
  end

  def json_headers
    { "Content-Type" => "application/json", "Accept" => "application/json" }
  end

  def authenticated_headers(user)
    auth_headers(user).merge(json_headers)
  end
end
