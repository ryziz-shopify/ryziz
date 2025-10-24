/**
 * Gracefully kill a child process and wait for it to exit
 * Sends SIGTERM first, then SIGKILL if timeout exceeded
 */
export async function killGracefully({ process: proc, name, timeout = 5000 }) {
  // Skip if process doesn't exist or already killed
  if (!proc || proc.killed) {
    return;
  }

  return new Promise((resolve) => {
    // Setup force kill timeout
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve();
    }, timeout);

    // Listen for clean exit
    proc.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });

    // Send graceful termination signal
    proc.kill('SIGTERM');
  });
}
