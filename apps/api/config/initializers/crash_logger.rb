at_exit do
  if $! # There's an exception causing the exit
    STDERR.puts "[CRASH] Process exiting with exception: #{$!.class}: #{$!.message}"
    STDERR.puts $!.backtrace&.first(20)&.join("\n") if $!.backtrace
  else
    STDERR.puts "[EXIT] Process exiting normally (exit code: #{$?.inspect})"
  end
  STDERR.flush
end

if ENV["RAILS_ENV"] == "production"
  # Heartbeat every 5s with memory tracking
  Thread.new do
    loop do
      sleep 5
      rss = begin
        File.read("/proc/#{Process.pid}/status").match(/VmRSS:\s+(\d+)/)[1].to_i / 1024
      rescue
        "unknown"
      end
      STDOUT.puts "[HEARTBEAT] pid=#{Process.pid} rss=#{rss}MB at #{Time.now.utc.iso8601}"
      STDOUT.flush
    rescue => e
      STDERR.puts "[HEARTBEAT ERROR] #{e.message}"
    end
  end

  # Self-ping to keep the container active (in case Railway sleeps idle containers)
  Thread.new do
    sleep 10 # Wait for server to be ready
    port = ENV.fetch("PORT", "3000")
    loop do
      sleep 25
      begin
        require "net/http"
        response = Net::HTTP.get_response(URI("http://127.0.0.1:#{port}/up"))
        STDOUT.puts "[SELF-PING] /up returned #{response.code} at #{Time.now.utc.iso8601}"
      rescue => e
        STDOUT.puts "[SELF-PING] failed: #{e.message} at #{Time.now.utc.iso8601}"
      end
      STDOUT.flush
    rescue => e
      STDERR.puts "[SELF-PING ERROR] #{e.message}"
    end
  end
end
