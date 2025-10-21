import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { buildClientBundles } from '../build/client.js';
import { selectEnvironment, showEnvInfo } from '../utils/env-selector.js';
import { loadEnvVars, fetchApiSecret } from '../utils/toml-parser.js';

// Import steps
import { copyTemplateFiles } from '../steps/files/copyTemplateFiles.js';
import { copySourceFiles } from '../steps/files/copySourceFiles.js';
import { buildJSX } from '../steps/build/buildJSX.js';
import { installDependencies } from '../steps/firebase/installDependencies.js';
import { deployToFirebase } from '../steps/firebase/deployToFirebase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Deploy application to Firebase hosting and functions
 * Handles production builds and environment configuration
 */
export async function deployCommand() {
  // Initialize configuration
  const projectDir = process.cwd();
  const ryzizDir = path.join(projectDir, '.ryziz');
  const templatesDir = path.join(__dirname, '../../templates/ryziz');
  const configPath = path.join(ryzizDir, 'config.json');
  const spinner = ora();

  console.log(chalk.bold('\n🚀 Deploying to Firebase...\n'));

  try {
    // Step 1: Load Shopify configuration
    console.log(chalk.cyan('🔍 Scanning environments...\n'));
    const selectedToml = await selectEnvironment(projectDir, false);

    if (!selectedToml) {
      console.log(chalk.red('\n❌ No Shopify configuration found'));
      console.log(chalk.gray('   Run: npx shopify app config link\n'));
      process.exit(1);
    }

    // Step 2: Retrieve API secret (optional for deploy)
    console.log(chalk.cyan('\n🔐 Fetching API secret...\n'));
    let apiSecret = null;
    try {
      apiSecret = await fetchApiSecret(projectDir);
      if (apiSecret) {
        console.log(chalk.green('\n✓ API secret retrieved'));
      } else {
        console.log(chalk.yellow('\n⚠️  API secret not found (continuing)'));
      }
    } catch {
      console.log(chalk.yellow('\n⚠️  API secret not found (continuing)'));
    }

    // Step 3: Setup environment variables
    const envVars = await loadEnvVars(projectDir, selectedToml, apiSecret);
    Object.entries(envVars).forEach(([key, value]) => {
      if (value) process.env[key] = value;
    });
    showEnvInfo(selectedToml, envVars);

    // Step 4: Get or request Firebase project ID
    let projectId = await getProjectId(configPath, ryzizDir);

    // Step 5: Execute production build pipeline
    await runProductionBuild(spinner, {
      ryzizDir,
      templatesDir,
      projectDir,
      projectId,
      envVars
    });

    // Step 6: Deploy to Firebase
    spinner.start(`Deploying to Firebase project: ${projectId}...`);
    const result = await deployToFirebase({ ryzizDir, projectId, logger: null });
    spinner.succeed('Deployment completed');

    // Display success information
    console.log(chalk.green('\n✅ Deployment successful!\n'));
    console.log(chalk.bold('Your app is live at:'));
    console.log(chalk.cyan(`  ${result.urls.webApp}`));
    console.log(chalk.cyan(`  ${result.urls.firebaseApp}\n`));
    console.log(chalk.gray('Functions dashboard:'));
    console.log(chalk.gray(`  ${result.urls.console}\n`));

  } catch (error) {
    spinner.fail('Deployment failed');
    console.error(chalk.red(error.message));
    console.log(chalk.yellow('\nTroubleshooting tips:'));
    console.log(chalk.gray('  1. Ensure you are logged in: firebase login'));
    console.log(chalk.gray('  2. Verify project exists: firebase projects:list'));
    console.log(chalk.gray('  3. Check .env.production has valid credentials'));
    process.exit(1);
  }
}

/**
 * Get Firebase project ID from config or prompt user
 */
async function getProjectId(configPath, ryzizDir) {
  // Try to load from saved config
  if (fs.existsSync(configPath)) {
    const config = await fs.readJson(configPath);
    if (config.projectId) return config.projectId;
  }

  // Prompt user for project ID
  const { projectId } = await inquirer.prompt([{
    type: 'input',
    name: 'projectId',
    message: 'Enter your Firebase project ID:',
    validate: input => input.length > 0 || 'Project ID is required'
  }]);

  // Save for future deployments
  await fs.ensureDir(ryzizDir);
  await fs.writeJson(configPath, { projectId }, { spaces: 2 });
  console.log(chalk.gray('Project ID saved for future deployments\n'));

  return projectId;
}

/**
 * Run production build pipeline
 */
async function runProductionBuild(spinner, config) {
  const { ryzizDir, templatesDir, projectDir, projectId, envVars } = config;

  // Set production mode
  process.env.NODE_ENV = 'production';

  const buildSteps = [
    {
      message: 'Preparing production build...',
      action: () => copyTemplateFiles({ ryzizDir, templatesDir, projectId, logger: null })
    },
    {
      message: 'Copying source files...',
      action: () => copySourceFiles({ projectDir, ryzizDir, envVars, logger: null })
    },
    {
      message: 'Building client bundles for hydration...',
      action: () => buildClientBundles(ryzizDir)
    },
    {
      message: 'Building JSX files...',
      action: () => buildJSX({ ryzizDir, logger: null })
    },
    {
      message: 'Installing production dependencies...',
      action: () => installDependencies({ ryzizDir, production: true, logger: null })
    }
  ];

  // Execute each build step
  for (const step of buildSteps) {
    spinner.start(step.message);
    await step.action();
    spinner.succeed(step.message.replace('...', ''));
  }
}