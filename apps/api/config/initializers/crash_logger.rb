# Log crash reason when the process exits
at_exit do
  if $!
    STDERR.puts "[CRASH] #{$!.class}: #{$!.message}"
    STDERR.puts $!.backtrace&.first(10)&.join("\n") if $!.backtrace
  end
  STDERR.flush
end
