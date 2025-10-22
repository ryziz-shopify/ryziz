import path from 'path';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { getFirebaseBinary } from '../../utils/binary-resolver.js';
import logger from '../../utils/logger.js';

/**
 * Deploy to Firebase hosting and functions
 * Self-managed UI: handles spinner and live output
 */
export async function deployToFirebase({ ryzizDir, projectId }) {
  logger.spinner(`Deploying to ${chalk.cyan(projectId)}`);

  // Use absolute path to firebase binary from .ryziz/functions/node_modules
  const firebaseBin = getFirebaseBinary(ryzizDir);

  // Stop spinner before showing live deploy output
  logger.stop();
  console.log(chalk.cyan('\n→ Deploying to Firebase...\n'));

  const deploy = spawn(firebaseBin, [
    'deploy',
    '--only', 'hosting,functions',
    '--project', projectId
  ], {
    cwd: path.join(ryzizDir, 'functions'),
    stdio: 'inherit'
  });

  await new Promise((resolve, reject) => {
    deploy.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Firebase deploy failed with code ${code}`));
      }
    });
  });

  return {
    success: true,
    urls: {
      webApp: `https://${projectId}.web.app`,
      firebaseApp: `https://${projectId}.firebaseapp.com`,
      console: `https://console.firebase.google.com/project/${projectId}/functions`
    }
  };
}
