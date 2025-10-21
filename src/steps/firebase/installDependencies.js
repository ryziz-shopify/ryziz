import path from 'path';
import chalk from 'chalk';
import { spawnAndWait } from '../process/spawnWithLogs.js';

/**
 * Install npm dependencies in Firebase functions directory
 * Supports both dev and production modes
 */
export async function installDependencies({
  ryzizDir,
  production = false,
  logger
}) {
  logger?.startStep?.('Install function dependencies');
  logger?.verbose?.(`Installing ${production ? 'production' : 'all'} dependencies...`);

  const args = production ? ['install', '--production'] : ['install'];
  const cwd = path.join(ryzizDir, 'functions');

  await spawnAndWait({
    command: 'npm',
    args,
    options: { cwd },
    logger,
    logName: 'npm-install',
    errorMessage: `npm install failed`
  });

  logger?.log?.(chalk.green(`✓ Dependencies installed`));
  logger?.endStep?.('Install function dependencies');

  return { success: true };
}
