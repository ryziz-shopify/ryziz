import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';

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

    // Copy env files
    await fs.copy(
      path.join(templatesDir, 'env.development'),
      path.join(cwd, '.env.development')
    );
    await fs.copy(
      path.join(templatesDir, 'env.production'),
      path.join(cwd, '.env.production')
    );
    await fs.copy(
      path.join(templatesDir, 'env.example'),
      path.join(cwd, '.env.example')
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

    spinner.succeed(chalk.green('Project initialized successfully!'));

    console.log(chalk.cyan('\n📦 Ryziz v0.0.1 ready!\n'));
    console.log(chalk.white('  Next steps:\n'));
    console.log(chalk.yellow('  1. Edit .env.development') + chalk.gray(' # Add your Shopify credentials'));
    console.log(chalk.yellow('  2. npm run dev') + chalk.gray('           # Start development server'));
    console.log(chalk.yellow('  3. npm run deploy') + chalk.gray('        # Deploy to Firebase\n'));
    console.log(chalk.gray('  Edit routes in:  ') + chalk.cyan('src/routes/\n'));

  } catch (error) {
    spinner.fail('Failed to initialize project');
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}
