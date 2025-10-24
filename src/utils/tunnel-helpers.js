/**
 * Extract tunnel URL from Cloudflare process output
 * @param {ChildProcess} proc - The Cloudflare tunnel process
 * @returns {Promise<string>} The tunnel URL
 */
export async function extractTunnelUrl(proc) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Tunnel connection timeout (30s)'));
    }, 30000);

    const extractUrl = (data) => {
      const output = data.toString();
      const match = output.match(/(https:\/\/[^\s]+\.trycloudflare\.com)/);

      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    };

    // Register single handler for both streams
    proc.stdout?.on('data', extractUrl);
    proc.stderr?.on('data', extractUrl);

    proc.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
