import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { askToLinkShopifyApp } from '../../utils/env-selector.js';
import { getShopifyBinary } from '../../utils/binary-resolver.js';

/**
 * Link Shopify app using Shopify CLI
 * Prompts user first, then runs shopify app config link
 */
export async function linkShopifyApp({ projectDir, templatesDir, logger }) {
  logger?.log?.(chalk.bold('\n📦 Shopify App Configuration\n'));

  const shouldLink = await askToLinkShopifyApp();

  if (!shouldLink) {
    // User skipped - copy template for manual configuration
    await fs.copy(
      path.join(templatesDir, 'shopify.app.toml'),
      path.join(projectDir, 'shopify.app.toml')
    );

    logger?.log?.(chalk.gray('\n⏭  Skipped Shopify configuration'));
    logger?.log?.(chalk.gray('  To link your app later, run:'));
    logger?.log?.(chalk.cyan('    npx shopify app config link\n'));

    return { linked: false };
  }

  // Run Shopify CLI link using absolute path to shopify binary
  logger?.log?.(chalk.cyan('\n→ Running: shopify app config link\n'));

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

    logger?.log?.(chalk.green('\n✓ Shopify app linked successfully!'));
    logger?.log?.(chalk.gray('  Environment variables will be pulled when you run: npm run dev\n'));

    return { linked: true };

  } catch (error) {
    logger?.log?.(chalk.yellow('\n⚠️  Shopify CLI linking skipped or failed'));
    logger?.log?.(chalk.gray('  You can link your app later by running:'));
    logger?.log?.(chalk.cyan('    npx shopify app config link\n'));

    // If linking failed, copy template so user has something to work with
    await fs.copy(
      path.join(templatesDir, 'shopify.app.toml'),
      path.join(projectDir, 'shopify.app.toml')
    );

    return { linked: false, error };
  }
}
