import path from 'path';
import chalk from 'chalk';
import { spawnWithLogs } from '../process/spawnWithLogs.js';
import { getFirebaseBinary } from '../../utils/binary-resolver.js';

/**
 * Start Firebase emulators (Functions, Firestore, Hosting)
 * Waits for "All emulators ready!" signal before resolving
 */
export async function startEmulators({ ryzizDir, envVars = {}, logger }) {
  logger?.startStep?.('Start Firebase emulators');
  logger?.log?.(chalk.bold('\n🔥 Starting Firebase emulators...\n'));
  logger?.log?.(chalk.green('  ✓ Functions:  ') + chalk.gray('http://localhost:6602'));
  logger?.log?.(chalk.green('  ✓ Firestore:  ') + chalk.gray('http://localhost:6603'));
  logger?.log?.(chalk.green('  ✓ Hosting:    ') + chalk.gray('http://localhost:6601\n'));

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
    },
    logger,
    logName: 'firebase-emulators'
  });

  // Wait for ready signal
  logger?.verbose?.('Waiting for Firebase emulators to be ready...');

  await waitForReady(emulators, logger);

  return { process: emulators };
}

/**
 * Wait for emulators to be ready
 */
async function waitForReady(proc, logger) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Firebase emulators startup timeout (60s)'));
    }, 60000);

    const checkOutput = (data) => {
      const output = data.toString();
      if (output.includes('All emulators ready!')) {
        clearTimeout(timeout);
        logger?.verbose?.('Detected: "All emulators ready!" signal');
        logger?.log?.(chalk.green('✓ Firebase emulators ready\n'));
        logger?.endStep?.('Start Firebase emulators');
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
