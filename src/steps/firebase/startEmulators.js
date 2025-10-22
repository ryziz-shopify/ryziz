import path from 'path';
import chalk from 'chalk';
import { spawnWithLogs } from '../process/spawnWithLogs.js';
import { getFirebaseBinary } from '../../utils/binary-resolver.js';
import logger from '../../utils/logger.js';

/**
 * Start Firebase emulators (Functions, Firestore, Hosting)
 * Self-managed UI: handles spinner and status display
 */
export async function startEmulators({ ryzizDir, envVars = {} }) {
  logger.spinner('Starting emulators');

  // Use absolute path to firebase binary from .ryziz/functions/node_modules
  const firebaseBin = getFirebaseBinary(ryzizDir);
  const emulators = spawnWithLogs({
    command: firebaseBin,
    args: [
      'emulators:start',
      '--only', 'functions,firestore,hosting',
      '--project', 'demo-project'
    ],
    options: {
      cwd: path.join(ryzizDir, 'functions'),
      env: { ...process.env, ...envVars }
    }
  });

  await waitForReady(emulators);

  logger.succeed('Emulators started');
  logger.log(chalk.green('  ✓ Functions:  ') + chalk.gray('http://localhost:6602'));
  logger.log(chalk.green('  ✓ Firestore:  ') + chalk.gray('http://localhost:6603'));
  logger.log(chalk.green('  ✓ Hosting:    ') + chalk.gray('http://localhost:6601\n'));

  return { process: emulators };
}

/**
 * Wait for emulators to be ready
 */
async function waitForReady(proc) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Firebase emulators startup timeout (60s)'));
    }, 60000);

    const checkOutput = (data) => {
      const output = data.toString();
      if (output.includes('All emulators ready!')) {
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
        reject(new Error(`Firebase emulators exited with code ${code}`));
      }
    });
  });
}
