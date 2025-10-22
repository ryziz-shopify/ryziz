import path from 'path';
import { spawnAndWait } from '../process/spawnWithLogs.js';
import logger from '../../utils/logger.js';

/**
 * Install npm dependencies in Firebase functions directory
 * Self-managed UI: handles spinner
 */
export async function installDependencies({
  ryzizDir,
  production = false
}) {
  logger.spinner('Installing dependencies');

  const args = production ? ['install', '--production'] : ['install'];
  const cwd = path.join(ryzizDir, 'functions');

  await spawnAndWait({
    command: 'npm',
    args,
    options: { cwd },
    logName: 'npm-install',
    errorMessage: `npm install failed`
  });

  logger.succeed('Dependencies installed');
  return { success: true };
}
