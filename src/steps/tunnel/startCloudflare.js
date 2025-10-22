import { spawnWithLogs } from '../process/spawnWithLogs.js';

/**
 * Start Cloudflare tunnel to expose local server
 * Extracts and returns the public tunnel URL
 */
export async function startCloudflare({ localUrl = 'http://localhost:6601' } = {}) {
  const tunnelProcess = spawnWithLogs({
    command: 'npx',
    args: ['cloudflared', 'tunnel', '--url', localUrl],
    options: { stdio: ['ignore', 'pipe', 'pipe'] }
  });

  const tunnelUrl = await extractTunnelUrl(tunnelProcess);

  return { tunnelUrl, process: tunnelProcess };
}

/**
 * Extract tunnel URL from process output
 */
async function extractTunnelUrl(proc) {
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
