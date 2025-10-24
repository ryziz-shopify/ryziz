import chalk from 'chalk';
import { spawnWithLogs } from '../process/spawnWithLogs.js';
import logger from '../../utils/logger.js';

/**
 * Start Cloudflare tunnel to expose local server
 * Self-managed UI: handles spinner and status display
 */
export async function startCloudflare({ localUrl = 'http://localhost:6601' } = {}) {
  logger.spinner('Starting tunnel');

  const tunnelProcess = spawnWithLogs({
    command: 'npx',
    args: ['cloudflared', 'tunnel', '--url', localUrl],
    options: { stdio: ['ignore', 'pipe', 'pipe'] }
  });

  const tunnelUrl = await extractTunnelUrl(tunnelProcess);

  logger.succeed(`Tunnel started: ${chalk.cyan(tunnelUrl)}`);

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
