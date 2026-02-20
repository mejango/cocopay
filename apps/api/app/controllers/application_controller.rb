class ApplicationController < ActionController::API
  include ActionController::MimeResponds

  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity
  rescue_from ActionController::ParameterMissing, with: :bad_request

  private

  def not_found(exception)
    render json: {
      error: {
        code: "NOT_FOUND",
        message: exception.message
      }
    }, status: :not_found
  end

  def unprocessable_entity(exception)
    render json: {
      error: {
        code: "VALIDATION_ERROR",
        message: exception.message,
        details: exception.record&.errors&.to_hash
      }
    }, status: :unprocessable_entity
  end

  def bad_request(exception)
    render json: {
      error: {
        code: "BAD_REQUEST",
        message: exception.message
      }
    }, status: :bad_request
  end

  def current_user
    @current_user ||= authenticate_user_from_token
  end

  def authenticate_user!
    render_unauthorized unless current_user
  end

  def render_unauthorized
    render json: {
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authentication token"
      }
    }, status: :unauthorized
  end

  def authenticate_user_from_token
    token = request.headers["Authorization"]&.split(" ")&.last
    return nil unless token

    decoded = JwtService.decode(token)
    return nil unless decoded

    User.find_by(id: decoded["user_id"])
  rescue JWT::DecodeError, JWT::ExpiredSignature
    nil
  end

  def render_success(data, status: :ok, meta: {})
    render json: {
      data: data,
      meta: meta.merge(timestamp: Time.current.iso8601)
    }, status: status
  end

  def render_error(code:, message:, status:, details: nil)
    body = {
      error: {
        code: code,
        message: message
      }
    }
    body[:error][:details] = details if details
    render json: body, status: status
  end
end
