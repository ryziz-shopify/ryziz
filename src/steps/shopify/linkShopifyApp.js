import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { spawnAndWait } from '../process/spawnWithLogs.js';
import { askToLinkShopifyApp } from '../../utils/env-selector.js';
import { getShopifyBinary } from '../../utils/binary-resolver.js';

/**
 * Link Shopify app using Shopify CLI
 * Self-managed UI: handles spinner and interactive prompts
 */
export async function linkShopifyApp({ projectDir, templatesDir }) {
  console.log(chalk.bold('\n📦 Shopify App Configuration\n'));
  const shouldLink = await askToLinkShopifyApp();

  if (!shouldLink) {
    // User skipped - copy template for manual configuration
    await fs.copy(
      path.join(templatesDir, 'shopify.app.toml'),
      path.join(projectDir, 'shopify.app.toml')
    );

    console.log(chalk.gray('\n⏭  Skipped Shopify configuration'));
    console.log(chalk.gray('  To link your app later, run:'));
    console.log(chalk.cyan('    npm run link\n'));

    return { linked: false };
  }

  // Run Shopify CLI link
  console.log(chalk.cyan('→ Linking to Shopify app...\n'));

  try {
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

    return { linked: true };

  } catch (error) {
    console.log(chalk.yellow('\n⚠️  Shopify CLI linking skipped or failed'));
    console.log(chalk.gray('  You can link your app later by running:'));
    console.log(chalk.cyan('    npm run link\n'));

    // If linking failed, copy template so user has something to work with
    await fs.copy(
      path.join(templatesDir, 'shopify.app.toml'),
      path.join(projectDir, 'shopify.app.toml')
    );

    return { linked: false, error };
  }
}
