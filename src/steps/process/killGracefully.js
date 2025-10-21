/**
 * Gracefully kill a child process and wait for it to exit
 * Sends SIGTERM first, then SIGKILL if timeout exceeded
 */
export async function killGracefully({ process: proc, name, logger, timeout = 5000 }) {
  // Skip if process doesn't exist or already killed
  if (!proc || proc.killed) {
    logger?.verbose?.(`${name} already stopped`);
    return;
  }

  return new Promise((resolve) => {
    // Setup force kill timeout
    const timer = setTimeout(() => {
      logger?.verbose?.(`${name} did not exit gracefully, forcing kill...`);
      proc.kill('SIGKILL');
      resolve();
    }, timeout);

    // Listen for clean exit
    proc.once('exit', () => {
      clearTimeout(timer);
      logger?.verbose?.(`${name} exited cleanly`);
      resolve();
    });

    // Send graceful termination signal
    logger?.verbose?.(`Sending SIGTERM to ${name}...`);
    proc.kill('SIGTERM');
  });
}
