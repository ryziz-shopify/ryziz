import chalk from 'chalk';
import { spawnWithLogs } from '../process/spawnWithLogs.js';

/**
 * Start Cloudflare tunnel to expose local server
 * Extracts and returns the public tunnel URL
 */
export async function startCloudflare({ localUrl = 'http://localhost:6601', logger }) {
  logger?.startStep?.('Start Cloudflare tunnel');
  logger?.log?.(chalk.cyan('🔗 Starting Cloudflare tunnel...\n'));

  const tunnelProcess = spawnWithLogs({
    command: 'npx',
    args: ['cloudflared', 'tunnel', '--url', localUrl],
    options: { stdio: ['ignore', 'pipe', 'pipe'] },
    logger,
    logName: 'cloudflared-tunnel'
  });

  // Extract tunnel URL from output
  logger?.verbose?.('Waiting for tunnel URL...');

  const tunnelUrl = await extractTunnelUrl(tunnelProcess, logger);

  logger?.log?.(chalk.green(`✓ Tunnel started: ${tunnelUrl}\n`));
  logger?.endStep?.('Start Cloudflare tunnel');

  return { tunnelUrl, process: tunnelProcess };
}

/**
 * Extract tunnel URL from process output
 */
async function extractTunnelUrl(proc, logger) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Tunnel connection timeout (30s)'));
    }, 30000);

    const extractUrl = (data) => {
      const output = data.toString();
      const match = output.match(/(https:\/\/[^\s]+\.trycloudflare\.com)/);

      if (match) {
        clearTimeout(timeout);
        logger?.verbose?.(`Detected tunnel URL: ${match[1]}`);
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
