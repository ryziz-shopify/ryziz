import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { Listr } from 'listr2';
import fs from 'fs-extra';

// Import utilities
import { createTask, parallel } from '../utils/listr-helpers.js';
import { spawnAndWait } from '../steps/process/spawnWithLogs.js';
import { getShopifyBinary } from '../utils/binary-resolver.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Initialize a new Ryziz project
 * Sets up project structure and Shopify configuration
 */
export async function initCommand() {
  // Initialize configuration
  const projectDir = process.cwd();
  const projectName = path.basename(projectDir);
  const templatesDir = path.join(__dirname, '../../templates/project');

  // Graceful shutdown handler
  const shutdown = () => {
    console.log(chalk.yellow('\n⏹  Initialization cancelled'));
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    console.log(chalk.bold('\n🚀 Initializing Ryziz...\n'));

    // Step 1-3: Non-interactive tasks with Listr
    const tasks = new Listr([
      createTask('Validating directory', async () => {
        const files = await fs.readdir(projectDir);
        const nonGitFiles = files.filter(f => f !== '.git' && f !== '.DS_Store' && f !== '.ryziz');

        if (nonGitFiles.length > 0) {
          throw new Error('Directory validation failed: Please run this command in an empty directory');
        }
      }),

      createTask('Copying project template', async (_ctx, task) => {
        return parallel(task, [
          createTask('Copying package.json', async () => {
            const packageJsonTemplate = await fs.readFile(
              path.join(templatesDir, 'package.json'),
              'utf-8'
            );
            const packageJson = packageJsonTemplate.replace('PROJECT_NAME_PLACEHOLDER', projectName);
            await fs.writeFile(path.join(projectDir, 'package.json'), packageJson);
          }),
          createTask('Copying .gitignore', async () => {
            await fs.copy(
              path.join(templatesDir, 'gitignore'),
              path.join(projectDir, '.gitignore')
            );
          }),
          createTask('Copying .env.local.example', async () => {
            await fs.copy(
              path.join(templatesDir, 'env.local.example'),
              path.join(projectDir, '.env.local.example')
            );
          }),
          createTask('Copying src/ folder', async () => {
            await fs.copy(
              path.join(templatesDir, 'src'),
              path.join(projectDir, 'src')
            );
          })
        ]);
      }),

      createTask('Installing dependencies', async () => {
        await spawnAndWait({
          command: 'npm',
          args: ['install'],
          options: { cwd: projectDir },
          errorMessage: 'npm install failed'
        });
      })
    ], {
      rendererOptions: { showTimer: true }
    });

    await tasks.run();

    // Step 4: Link to Shopify app
    console.log(chalk.bold('\n📦 Shopify App Configuration\n'));
    console.log(chalk.cyan('→ Linking to Shopify app...\n'));

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

    // Success message
    console.log(chalk.bold('\n⭐ Setup complete\n'));
    console.log(chalk.white('Next steps:'));
    console.log(chalk.yellow('  npm run dev') + chalk.gray('     # Start dev server'));
    console.log(chalk.yellow('  npm run deploy') + chalk.gray('   # Deploy to production'));
    console.log(chalk.gray('\nEdit routes:  ') + chalk.cyan('src/routes/'));

    process.exit(0);

  } catch (error) {
    // Single error handler
    console.log(chalk.bold('\n❌ Error\n'));
    console.log(chalk.red('→ ' + error.message));
    process.exit(1);
  }
}