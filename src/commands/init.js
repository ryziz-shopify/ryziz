import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { createLogger } from '../utils/logger.js';

// Import steps
import { validateDirectory } from '../steps/files/validateDirectory.js';
import { copyProjectTemplate, installProjectDependencies } from '../steps/files/copyProjectTemplate.js';
import { linkShopifyApp } from '../steps/shopify/linkShopifyApp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Initialize a new Ryziz project
 * Sets up project structure and Shopify configuration
 */
export async function initCommand(options = {}) {
  const spinner = ora();
  const projectDir = process.cwd();
  const projectName = path.basename(projectDir);
  const templatesDir = path.join(__dirname, '../../templates/project');
  const logger = createLogger(path.join(projectDir, '.ryziz', 'logs'), options.verbose);

  // Graceful cleanup handler (closes logger and exits cleanly)
  const cleanup = (exitCode = 1) => {
    logger.close();
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
    logger.log(chalk.bold('\n🚀 Initializing Ryziz project...\n'));

    // Step 1: Ensure directory is empty
    logger.startStep('Validate directory');
    spinner.start('Validating directory...');
    await validateDirectory({ projectDir, logger });
    spinner.succeed('Directory validated');
    logger.endStep('Validate directory');

    // Step 2: Copy project template
    logger.startStep('Copy project template');
    spinner.start('Copying template files...');
    await copyProjectTemplate({ projectDir, templatesDir, projectName, logger });
    spinner.succeed('Template files copied');
    logger.endStep('Copy project template');

    // Step 3: Install npm dependencies
    logger.startStep('Install dependencies');
    spinner.start('Installing dependencies (this may take a minute)...');
    await installProjectDependencies({ projectDir, logger });
    spinner.succeed('Dependencies installed');
    logger.endStep('Install dependencies');

    // Step 4: Configure Shopify connection
    logger.startStep('Configure Shopify connection');
    await linkShopifyApp({ projectDir, templatesDir, logger });
    logger.endStep('Configure Shopify connection');

    // Display success message
    logger.log(chalk.green('\n✅ Project initialized successfully!\n'));
    logger.log(chalk.cyan('📦 Ryziz v0.0.1 ready!\n'));
    logger.log(chalk.white('  Next steps:\n'));
    logger.log(chalk.yellow('  1. npm run dev') + chalk.gray('     # Start development server'));
    logger.log(chalk.yellow('  2. npm run deploy') + chalk.gray('   # Deploy to Firebase\n'));
    logger.log(chalk.gray('  Edit routes in:  ') + chalk.cyan('src/routes/\n'));

    cleanup(0);

  } catch (error) {
    // Handle initialization failures gracefully
    spinner.fail('Failed to initialize project');
    logger.error(chalk.red('\n❌ Error:'), error.message);
    cleanup(1);
  }
}