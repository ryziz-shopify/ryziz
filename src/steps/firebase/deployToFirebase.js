import path from 'path';
import chalk from 'chalk';
import { spawnAndWait } from '../process/spawnWithLogs.js';
import { getFirebaseBinary } from '../../utils/binary-resolver.js';

/**
 * Deploy to Firebase hosting and functions
 * Self-managed UI: handles spinner and live output
 */
export async function deployToFirebase({ ryzizDir, projectId }) {
  console.log(`Deploying to ${chalk.cyan(projectId)}`);

  // Use absolute path to firebase binary from .ryziz/functions/node_modules
  const firebaseBin = getFirebaseBinary(ryzizDir);

  console.log(chalk.cyan('\n→ Deploying to Firebase...\n'));

  await spawnAndWait({
    command: firebaseBin,
    args: [
      'deploy',
      '--only', 'hosting,functions',
      '--project', projectId
    ],
    options: {
      cwd: path.join(ryzizDir, 'functions'),
      stdio: 'inherit'
    },
    errorMessage: 'Firebase deploy failed'
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
