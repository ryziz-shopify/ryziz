import chalk from 'chalk';
import { spawn } from 'child_process';
import { getShopifyBinary } from '../utils/binary-resolver.js';

/**
 * Shopify CLI wrapper command
 * Proxies to bundled Shopify CLI with specific flags
 */
export async function shopifyCommand(options = {}) {
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
async function runShopifyConfigLink(projectDir) {
  console.log(chalk.cyan('\n→ Linking to Shopify app...\n'));

  const shopifyBin = getShopifyBinary();
  const linkProcess = spawn(shopifyBin, ['app', 'config', 'link'], {
    cwd: projectDir,
    stdio: 'inherit'
  });

  await new Promise((resolve, reject) => {
    linkProcess.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('\n✓ Shopify app linked successfully!\n'));
        resolve();
      } else {
        reject(new Error(`Shopify CLI exited with code ${code}`));
      }
    });
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
