# CocoPay Monitoring & Observability

> Collect data now, build dashboards later

---

## Philosophy

**Instrument everything from day one.** We may not need dashboards immediately, but having the data lets us build them when we need to.

---

## Metrics to Collect

### Application Metrics

#### Request Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | `method`, `path`, `status` | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | `method`, `path` | Request latency |
| `http_requests_in_flight` | Gauge | - | Current concurrent requests |

#### Business Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `payments_total` | Counter | `status`, `chain_id` | Total payment attempts |
| `payments_amount_usd` | Counter | `chain_id` | Total payment volume |
| `payment_duration_seconds` | Histogram | `chain_id` | Time from confirm to complete |
| `active_users_gauge` | Gauge | - | Users active in last 5 min |
| `stores_total` | Gauge | `status` | Total stores by status |
| `loans_total` | Counter | `chain_id` | Total loans originated |
| `loans_amount_usd` | Counter | `chain_id` | Total loan volume |

#### Blockchain Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `blockchain_rpc_requests_total` | Counter | `chain_id`, `method`, `status` | RPC calls |
| `blockchain_rpc_duration_seconds` | Histogram | `chain_id`, `method` | RPC latency |
| `relayr_bundles_total` | Counter | `status` | Relayr bundle submissions |
| `relayr_bundle_duration_seconds` | Histogram | - | Time to bundle completion |
| `balance_sync_duration_seconds` | Histogram | `chain_id` | Balance sync time |

#### Background Jobs

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `jobs_enqueued_total` | Counter | `job_class` | Jobs enqueued |
| `jobs_processed_total` | Counter | `job_class`, `status` | Jobs processed |
| `jobs_duration_seconds` | Histogram | `job_class` | Job execution time |
| `jobs_queue_size` | Gauge | `queue` | Current queue depth |

### Infrastructure Metrics

#### Database

| Metric | Type | Description |
|--------|------|-------------|
| `db_connections_total` | Gauge | Total connections |
| `db_connections_active` | Gauge | Active connections |
| `db_connections_idle` | Gauge | Idle connections |
| `db_query_duration_seconds` | Histogram | Query execution time |
| `db_pool_checkout_duration_seconds` | Histogram | Connection checkout time |

#### Redis

| Metric | Type | Description |
|--------|------|-------------|
| `redis_connections_total` | Gauge | Total connections |
| `redis_commands_total` | Counter | Commands executed |
| `redis_command_duration_seconds` | Histogram | Command latency |
| `redis_memory_bytes` | Gauge | Memory usage |

#### System

| Metric | Type | Description |
|--------|------|-------------|
| `process_cpu_seconds_total` | Counter | CPU time |
| `process_memory_bytes` | Gauge | Memory usage |
| `process_open_fds` | Gauge | Open file descriptors |

---

## Implementation

### Rails Instrumentation

```ruby
# config/initializers/metrics.rb
require 'prometheus_client'

# Register metrics
METRICS = {
  http_requests: Prometheus::Client::Counter.new(
    :http_requests_total,
    docstring: 'Total HTTP requests',
    labels: [:method, :path, :status]
  ),
  http_duration: Prometheus::Client::Histogram.new(
    :http_request_duration_seconds,
    docstring: 'HTTP request duration',
    labels: [:method, :path],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  ),
  payments_total: Prometheus::Client::Counter.new(
    :payments_total,
    docstring: 'Total payments',
    labels: [:status, :chain_id]
  ),
  payments_amount: Prometheus::Client::Counter.new(
    :payments_amount_usd,
    docstring: 'Total payment volume in USD',
    labels: [:chain_id]
  ),
}

Prometheus::Client.registry.register(METRICS[:http_requests])
Prometheus::Client.registry.register(METRICS[:http_duration])
Prometheus::Client.registry.register(METRICS[:payments_total])
Prometheus::Client.registry.register(METRICS[:payments_amount])
```

```ruby
# app/middleware/metrics_middleware.rb
class MetricsMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    status, headers, response = @app.call(env)

    duration = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time
    path = normalized_path(env['PATH_INFO'])
    method = env['REQUEST_METHOD']

    METRICS[:http_requests].increment(
      labels: { method: method, path: path, status: status }
    )
    METRICS[:http_duration].observe(
      duration,
      labels: { method: method, path: path }
    )

    [status, headers, response]
  end

  private

  def normalized_path(path)
    # Normalize IDs to :id
    path.gsub(/\/[a-f0-9-]{36}/, '/:id')
        .gsub(/\/\d+/, '/:id')
  end
end
```

```ruby
# app/services/payment_service.rb
class PaymentService
  def execute(...)
    result = # ... payment logic

    METRICS[:payments_total].increment(
      labels: { status: result.status, chain_id: result.chain_id }
    )

    if result.success?
      METRICS[:payments_amount].increment(
        by: result.amount_usd,
        labels: { chain_id: result.chain_id }
      )
    end

    result
  end
end
```

### Health Check Endpoint

```ruby
# app/controllers/health_controller.rb
class HealthController < ApplicationController
  skip_before_action :authenticate!

  # GET /up - Basic liveness
  def up
    head :ok
  end

  # GET /health/ready - Full readiness
  def ready
    checks = {
      database: check_database,
      redis: check_redis,
      rpc: check_rpc,
    }

    all_healthy = checks.values.all? { |c| c[:status] == 'ok' }

    render json: {
      status: all_healthy ? 'ok' : 'degraded',
      checks: checks,
      timestamp: Time.current.iso8601
    }, status: all_healthy ? :ok : :service_unavailable
  end

  # GET /metrics - Prometheus metrics
  def metrics
    render plain: Prometheus::Client::Formats::Text.marshal(
      Prometheus::Client.registry
    ), content_type: 'text/plain'
  end

  private

  def check_database
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    ActiveRecord::Base.connection.execute('SELECT 1')
    duration = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start

    { status: 'ok', latency_ms: (duration * 1000).round(2) }
  rescue => e
    { status: 'error', error: e.message }
  end

  def check_redis
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    Redis.current.ping
    duration = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start

    { status: 'ok', latency_ms: (duration * 1000).round(2) }
  rescue => e
    { status: 'error', error: e.message }
  end

  def check_rpc
    # Check one chain as representative
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    AlchemyService.block_number(chain_id: 8453)
    duration = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start

    { status: 'ok', latency_ms: (duration * 1000).round(2) }
  rescue => e
    { status: 'error', error: e.message }
  end
end
```

---

## Logging

### Structured Logging

```ruby
# config/initializers/logging.rb
Rails.application.configure do
  config.log_formatter = proc do |severity, time, progname, msg|
    {
      timestamp: time.iso8601(3),
      level: severity,
      message: msg,
      service: 'cocopay-api',
      environment: Rails.env,
    }.to_json + "\n"
  end
end
```

### Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| `DEBUG` | Development only | SQL queries, full request bodies |
| `INFO` | Normal operations | Request completed, job processed |
| `WARN` | Recoverable issues | Retry attempted, rate limit approaching |
| `ERROR` | Failures | Payment failed, RPC error |
| `FATAL` | Critical failures | Database down, unrecoverable state |

### Request Logging

```ruby
# app/middleware/request_logger.rb
class RequestLogger
  def call(env)
    request_id = SecureRandom.uuid
    start_time = Time.current

    # Add to thread-local for use in logs
    Thread.current[:request_id] = request_id

    status, headers, response = @app.call(env)

    duration_ms = ((Time.current - start_time) * 1000).round(2)

    Rails.logger.info({
      event: 'request_completed',
      request_id: request_id,
      method: env['REQUEST_METHOD'],
      path: env['PATH_INFO'],
      status: status,
      duration_ms: duration_ms,
      user_id: env['current_user']&.id,
    }.to_json)

    headers['X-Request-ID'] = request_id
    [status, headers, response]
  end
end
```

---

## Error Tracking (Sentry)

```ruby
# config/initializers/sentry.rb
Sentry.init do |config|
  config.dsn = ENV['SENTRY_DSN']
  config.environment = Rails.env
  config.release = ENV.fetch('GIT_SHA', 'unknown')

  config.breadcrumbs_logger = [:active_support_logger, :http_logger]

  config.traces_sample_rate = Rails.env.production? ? 0.1 : 1.0

  config.before_send = lambda do |event, hint|
    # Scrub sensitive data
    event.request&.data&.delete('password')
    event.request&.data&.delete('otp')
    event
  end
end
```

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  rescue_from StandardError do |exception|
    Sentry.capture_exception(exception, extra: {
      user_id: current_user&.id,
      request_id: Thread.current[:request_id],
    })

    render json: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
           status: :internal_server_error
  end
end
```

---

## Alerting Rules

### Critical (PagerDuty)

| Alert | Condition | Action |
|-------|-----------|--------|
| API Down | Health check fails 3x in 5 min | Page on-call |
| Error Rate Spike | > 5% errors in 5 min | Page on-call |
| Payment Failures | > 10% payment failures in 5 min | Page on-call |
| Database Down | DB health check fails | Page on-call |

### Warning (Slack)

| Alert | Condition | Action |
|-------|-----------|--------|
| High Latency | p99 > 2s for 10 min | Slack #alerts |
| Queue Backup | Job queue > 1000 for 10 min | Slack #alerts |
| Low Balance | Reserves wallet < $1000 | Slack #alerts |
| RPC Errors | > 1% RPC errors in 5 min | Slack #alerts |

### Informational (Slack)

| Alert | Condition | Action |
|-------|-----------|--------|
| Deploy Completed | New version deployed | Slack #deploys |
| Daily Summary | 9am BRT daily | Slack #metrics |

---

## Dashboard Specs (Future)

### Executive Dashboard

- Daily/Weekly/Monthly GMV
- Active users (DAU/WAU/MAU)
- New users
- Payment success rate
- Average transaction value

### Operations Dashboard

- Request rate (req/s)
- Error rate (%)
- p50/p95/p99 latency
- Active database connections
- Redis memory usage
- Job queue depth

### Blockchain Dashboard

- Bundle submission rate
- Bundle success rate
- Bundle confirmation time (p50/p95)
- RPC error rate by chain
- Gas costs (if any)

### Business Dashboard

- Payments by store
- Top stores by volume
- New stores
- Payout volume
- Geographic distribution (future)

---

## Data Retention

| Data Type | Retention | Storage |
|-----------|-----------|---------|
| Metrics (Prometheus) | 15 days | Railway/Prometheus |
| Logs | 30 days | Railway logs |
| Traces (Sentry) | 90 days | Sentry |
| Analytics events | 90 days raw, aggregated forever | PostgreSQL |

---

## Runbook Integration

Each alert should link to a runbook:

```yaml
# alerts/api_down.yml
name: API Down
condition: health_check_failures >= 3
severity: critical
runbook: /docs/runbooks/api_down.md
notify:
  - pagerduty: on-call
  - slack: "#incidents"
```

See [INCIDENTS.md](./INCIDENTS.md) for runbooks.
