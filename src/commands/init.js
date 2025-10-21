import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';

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
  const spinner = ora();
  const projectDir = process.cwd();
  const projectName = path.basename(projectDir);
  const templatesDir = path.join(__dirname, '../../templates/project');

  try {
    console.log(chalk.bold('\n🚀 Initializing Ryziz project...\n'));

    // Step 1: Ensure directory is empty
    spinner.start('Validating directory...');
    await validateDirectory({ projectDir });
    spinner.succeed('Directory validated');

    // Step 2: Copy project template
    spinner.start('Copying template files...');
    await copyProjectTemplate({ projectDir, templatesDir, projectName });
    spinner.succeed('Template files copied');

    // Step 3: Install npm dependencies
    spinner.start('Installing dependencies (this may take a minute)...');
    await installProjectDependencies({ projectDir });
    spinner.succeed('Dependencies installed');

    // Step 4: Configure Shopify connection
    await linkShopifyApp({ projectDir, templatesDir });

    // Display success message
    console.log(chalk.green('\n✅ Project initialized successfully!\n'));
    console.log(chalk.cyan('📦 Ryziz v0.0.1 ready!\n'));
    console.log(chalk.white('  Next steps:\n'));
    console.log(chalk.yellow('  1. npm run dev') + chalk.gray('     # Start development server'));
    console.log(chalk.yellow('  2. npm run deploy') + chalk.gray('   # Deploy to Firebase\n'));
    console.log(chalk.gray('  Edit routes in:  ') + chalk.cyan('src/routes/\n'));

  } catch (error) {
    spinner.fail('Failed to initialize project');
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}