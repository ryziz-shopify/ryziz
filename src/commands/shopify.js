import chalk from 'chalk';
import { spawnAndWait } from '../steps/process/spawnWithLogs.js';
import { getShopifyBinary } from '../utils/binary-resolver.js';

/**
 * Shopify CLI wrapper command
 * Proxies to bundled Shopify CLI with specific flags
 */
export async function shopifyCommand(options) {
  const projectDir = process.cwd();

  try {
    // Step 1: Determine which Shopify command to run
    if (options.link) {
      await runShopifyConfigLink(projectDir);
    } else {
      showShopifyHelp();
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Error:', error.message));
    process.exit(1);
  }
}

/**
 * Run shopify app config link
 */
export async function runShopifyConfigLink(projectDir) {
  const shopifyBin = getShopifyBinary();
  await spawnAndWait({
    command: shopifyBin,
    args: ['app', 'config', 'link'],
    options: {
      cwd: projectDir,
      stdio: 'inherit'
    },
    errorMessage: 'Shopify CLI linking failed'
  });
}

/**
 * Show available Shopify command options
 */
function showShopifyHelp() {
  console.log(chalk.bold('\n📦 Ryziz Shopify Commands\n'));
  console.log(chalk.cyan('Available options:\n'));
  console.log(chalk.white('  --link') + chalk.gray('     Link project to Shopify app\n'));
}
