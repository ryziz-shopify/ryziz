import chalk from 'chalk';
import { spawnAndWait } from '../process/spawnWithLogs.js';

/**
 * Deploy app configuration to Shopify Partners Dashboard
 * Updates the app URLs with new tunnel/deployment URL
 */
export async function deployToPartners({ projectDir, logger }) {
  logger?.startStep?.('Deploy to Shopify Partners Dashboard');
  logger?.log?.(chalk.cyan('⬆️  Deploying to Shopify Partners Dashboard...\n'));

  try {
    await spawnAndWait({
      command: 'npx',
      args: ['shopify', 'app', 'deploy', '--force'],
      options: { cwd: projectDir },
      logger,
      logName: 'shopify-deploy',
      errorMessage: 'Deploy to Partners failed'
    });

    logger?.log?.(chalk.green('\n✓ Partners Dashboard updated\n'));
    logger?.endStep?.('Deploy to Shopify Partners Dashboard');

    return { success: true };

  } catch (error) {
    logger?.log?.(chalk.yellow(`⚠️  Could not update Partners Dashboard: ${error.message}`));
    logger?.log?.(chalk.gray('   You can update manually later with: npx shopify app deploy --force\n'));
    logger?.verbose?.(`Error: ${error.stack}`);
    logger?.endStep?.('Deploy to Shopify Partners Dashboard', false);

    return { success: false, error };
  }
}
