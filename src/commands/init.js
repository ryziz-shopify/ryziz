import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import logger from '../utils/logger.js';

// Import steps
import { validateDirectory } from '../steps/files/validateDirectory.js';
import { copyProjectTemplate, installProjectDependencies } from '../steps/files/copyProjectTemplate.js';
import { linkShopifyApp } from '../steps/shopify/linkShopifyApp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Initialize a new Ryziz project
 * Sets up project structure and Shopify configuration
 */
export async function initCommand() {
  const projectDir = process.cwd();
  const projectName = path.basename(projectDir);
  const templatesDir = path.join(__dirname, '../../templates/project');

  // Graceful cleanup handler
  const cleanup = (exitCode = 1) => {
    process.exit(exitCode);
  };

  process.on('SIGINT', () => {
    logger.log(chalk.yellow('\n⏹  Initialization cancelled'));
    cleanup(0);
  });
  process.on('SIGTERM', () => {
    logger.log(chalk.yellow('\n⏹  Initialization terminated'));
    cleanup(0);
  });

  try {
    logger.log(chalk.bold('\n🚀 Initializing Ryziz...\n'));

    // Step 1: Ensure directory is empty
    logger.spinner('Validating directory');
    await validateDirectory({ projectDir });
    logger.succeed();

    // Step 2: Copy project template
    logger.spinner('Copying template');
    await copyProjectTemplate({ projectDir, templatesDir, projectName });
    logger.succeed();

    // Step 3: Install npm dependencies
    logger.spinner('Installing dependencies');
    await installProjectDependencies({ projectDir });
    logger.succeed();

    // Step 4: Configure Shopify connection
    logger.spinner('Linking Shopify app');
    await linkShopifyApp({ projectDir, templatesDir });
    logger.succeed();

    // Display success message
    logger.log(chalk.green('\n✓ Ready!'));
    logger.log(chalk.white('\nNext steps:'));
    logger.log(chalk.yellow('  npm run dev') + chalk.gray('     # Start dev server'));
    logger.log(chalk.yellow('  npm run deploy') + chalk.gray('   # Deploy to production'));
    logger.log(chalk.gray('\nEdit routes:  ') + chalk.cyan('src/routes/'));

    cleanup(0);

  } catch (error) {
    // Handle initialization failures gracefully
    logger.fail('Initialization failed');
    logger.error(chalk.red('Error:'), error.message);
    cleanup(1);
  }
}