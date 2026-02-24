at_exit do
  if $! # There's an exception causing the exit
    STDERR.puts "[CRASH] Process exiting with exception: #{$!.class}: #{$!.message}"
    STDERR.puts $!.backtrace&.first(20)&.join("\n") if $!.backtrace
  else
    STDERR.puts "[EXIT] Process exiting normally (exit code: #{$?.inspect})"
  end
  STDERR.flush
end

# Heartbeat logger — logs memory usage every 15s so we can see when the process dies
if ENV["RAILS_ENV"] == "production"
  Thread.new do
    loop do
      sleep 15
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
end
