import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { execSync, spawn } from 'child_process';
import { askToLinkShopifyApp } from '../utils/env-selector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function initCommand() {
  const spinner = ora('Initializing Ryziz project...').start();

  try {
    const cwd = process.cwd();
    const projectName = path.basename(cwd);
    const templatesDir = path.join(__dirname, '../../templates/project');

    // Check if directory is empty (except .git)
    const files = await fs.readdir(cwd);
    const nonGitFiles = files.filter(f => f !== '.git' && f !== '.DS_Store');

    if (nonGitFiles.length > 0) {
      spinner.fail('Current directory is not empty!');
      console.log(chalk.yellow('\nPlease run this command in an empty directory.'));
      process.exit(1);
    }

    // Copy all template files
    spinner.text = 'Copying template files...';

    // Copy package.json with project name replacement
    const packageJsonTemplate = await fs.readFile(
      path.join(templatesDir, 'package.json'),
      'utf-8'
    );
    const packageJson = packageJsonTemplate.replace('PROJECT_NAME_PLACEHOLDER', projectName);
    await fs.writeFile(path.join(cwd, 'package.json'), packageJson);

    // Copy .gitignore
    await fs.copy(
      path.join(templatesDir, 'gitignore'),
      path.join(cwd, '.gitignore')
    );

    // Copy .env.local.example
    await fs.copy(
      path.join(templatesDir, 'env.local.example'),
      path.join(cwd, '.env.local.example')
    );

    // Copy src folder
    await fs.copy(
      path.join(templatesDir, 'src'),
      path.join(cwd, 'src')
    );

    spinner.succeed('Template files copied');

    // Install dependencies
    spinner.start('Installing dependencies (this may take a minute)...');
    execSync('npm install', { stdio: 'ignore' });
    spinner.succeed('Dependencies installed');

    // Shopify CLI integration
    console.log(chalk.bold('\n📦 Shopify App Configuration\n'));

    const shouldLink = await askToLinkShopifyApp();

    if (shouldLink) {
      console.log(chalk.cyan('\n→ Running: npx shopify app config link\n'));

      try {
        // Run shopify app config link
        const linkProcess = spawn('npx', ['shopify', 'app', 'config', 'link'], {
          cwd: cwd,
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

      } catch (error) {
        console.log(chalk.yellow('\n⚠️  Shopify CLI linking skipped or failed'));
        console.log(chalk.gray('  You can link your app later by running:'));
        console.log(chalk.cyan('    npx shopify app config link\n'));

        // If linking failed, copy template so user has something to work with
        await fs.copy(
          path.join(templatesDir, 'shopify.app.toml'),
          path.join(cwd, 'shopify.app.toml')
        );
      }
    } else {
      // User skipped linking - copy template for manual configuration
      await fs.copy(
        path.join(templatesDir, 'shopify.app.toml'),
        path.join(cwd, 'shopify.app.toml')
      );

      console.log(chalk.gray('\n⏭  Skipped Shopify configuration'));
      console.log(chalk.gray('  To link your app later, run:'));
      console.log(chalk.cyan('    npx shopify app config link\n'));
    }

    console.log(chalk.green('✓ Project initialized successfully!\n'));
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
