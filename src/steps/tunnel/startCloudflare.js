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

  const tunnelUrl = await new Promise((resolve, reject) => {
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

    tunnelProcess.stdout?.on('data', extractUrl);
    tunnelProcess.stderr?.on('data', extractUrl);

    tunnelProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  logger?.log?.(chalk.green(`✓ Tunnel started: ${tunnelUrl}\n`));
  logger?.endStep?.('Start Cloudflare tunnel');

  return { tunnelUrl, process: tunnelProcess };
}
