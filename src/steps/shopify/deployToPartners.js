import chalk from 'chalk';
import { spawnAndWait } from '../process/spawnWithLogs.js';

/**
 * Deploy app configuration to Shopify Partners Dashboard
 * Updates the app URLs with new tunnel/deployment URL
 */
export async function deployToPartners({ projectDir }) {
  try {
    await spawnAndWait({
      command: 'npx',
      args: ['shopify', 'app', 'deploy', '--force'],
      options: { cwd: projectDir },
      errorMessage: 'Deploy to Partners failed'
    });

    return { success: true };

  } catch (error) {
    console.log(chalk.yellow(`⚠️  Could not update Partners Dashboard: ${error.message}`));
    console.log(chalk.gray('   You can update manually later with: npx shopify app deploy --force\n'));

    return { success: false, error };
  }
}
