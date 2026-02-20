class HealthController < ApplicationController
  def show
    render plain: "OK"
  end

  def ready
    checks = {
      database: database_connected?,
      redis: redis_connected?
    }

    all_healthy = checks.values.all?

    render json: {
      status: all_healthy ? "healthy" : "unhealthy",
      checks: checks,
      timestamp: Time.current.iso8601
    }, status: all_healthy ? :ok : :service_unavailable
  end

  private

  def database_connected?
    ActiveRecord::Base.connection.execute("SELECT 1")
    true
  rescue StandardError
    false
  end

  def redis_connected?
    redis = Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"))
    redis.ping == "PONG"
  rescue StandardError
    false
  ensure
    redis&.close
  end
end
