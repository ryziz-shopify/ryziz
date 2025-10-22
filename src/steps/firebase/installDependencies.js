import path from 'path';
import { spawnAndWait } from '../process/spawnWithLogs.js';

/**
 * Install npm dependencies in Firebase functions directory
 * Supports both dev and production modes
 */
export async function installDependencies({
  ryzizDir,
  production = false
}) {
  const args = production ? ['install', '--production'] : ['install'];
  const cwd = path.join(ryzizDir, 'functions');

  await spawnAndWait({
    command: 'npm',
    args,
    options: { cwd },
    logName: 'npm-install',
    errorMessage: `npm install failed`
  });

  return { success: true };
}
