import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { askToLinkShopifyApp } from '../../utils/env-selector.js';
import { getShopifyBinary } from '../../utils/binary-resolver.js';
import logger from '../../utils/logger.js';

/**
 * Link Shopify app using Shopify CLI
 * Self-managed UI: handles spinner and interactive prompts
 */
export async function linkShopifyApp({ projectDir, templatesDir }) {
  logger.spinner('Linking Shopify app');
  logger.stop();  // Stop before interactive prompt

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
  console.log(chalk.cyan('\n→ Linking to Shopify app...\n'));

  try {
    const shopifyBin = getShopifyBinary();
    const linkProcess = spawn(shopifyBin, ['app', 'config', 'link'], {
      cwd: projectDir,
      stdio: 'inherit'
    });

    await new Promise((resolve, reject) => {
      linkProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Shopify CLI exited with code ${code}`));
        }
      });
    });

    console.log(chalk.green('\n✓ Shopify app linked successfully!'));
    console.log(chalk.gray('  Environment variables will be pulled when you run: npm run dev\n'));

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
