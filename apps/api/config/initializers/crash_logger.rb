at_exit do
  if $! # There's an exception causing the exit
    STDERR.puts "[CRASH] Process exiting with exception: #{$!.class}: #{$!.message}"
    STDERR.puts $!.backtrace&.first(20)&.join("\n") if $!.backtrace
  else
    STDERR.puts "[EXIT] Process exiting normally (exit code: #{$?.inspect})"
  end
  STDERR.flush
end
