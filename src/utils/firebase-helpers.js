/**
 * Wait for Firebase emulators to be ready
 * @param {ChildProcess} proc - The Firebase emulators process
 * @returns {Promise<void>}
 */
export async function waitForEmulators(proc) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Firebase emulators startup timeout (60s)'));
    }, 60000);

    let output = '';

    const checkOutput = (data) => {
      const chunk = data.toString();
      output += chunk;

      if (chunk.includes('All emulators ready!')) {
        clearTimeout(timeout);
        resolve();
      }
    };

    // Register single handler for both streams
    proc.stdout?.on('data', checkOutput);
    proc.stderr?.on('data', checkOutput);

    proc.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0 && code !== null) {
        // Check for port conflict errors
        if (output.includes('port taken') || output.includes('Port') && output.includes('is not open')) {
          reject(new Error('Firebase ports busy (6601, 6603). Kill processes: pkill -f firebase'));
        } else {
          reject(new Error(`Firebase emulators exited with code ${code}`));
        }
      }
    });
  });
}
