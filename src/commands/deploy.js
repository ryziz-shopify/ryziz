import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
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

  // Graceful cleanup handler
  const cleanup = (exitCode = 1) => {
    process.exit(exitCode);
  };

  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n⏹  Deployment cancelled'));
    cleanup(0);
  });
  process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n⏹  Deployment terminated'));
    cleanup(0);
  });

  console.log(chalk.bold('\n🚀 Deploying...\n'));

  try {
    // Step 1: Load Shopify configuration (self-managed UI)
    const selectedToml = await selectEnvironment(projectDir, false);
    if (!selectedToml) cleanup(1);

    // Step 2: Retrieve API secret - optional for deploy (self-managed UI)
    let apiSecret = null;
    const apiSecretResult = await fetchApiSecret(projectDir);
    if (!apiSecretResult?.error && apiSecretResult) {
      apiSecret = apiSecretResult;
    }

    // Step 3: Setup environment variables
    const envVars = await loadEnvVars(projectDir, selectedToml, apiSecret);
    Object.entries(envVars).forEach(([key, value]) => {
      if (value) process.env[key] = value;
    });
    showEnvInfo(selectedToml, envVars);

    // Step 4: Get or request Firebase project ID (self-managed UI)
    let projectId = await getProjectId(configPath, ryzizDir);

    // Step 5-9: Execute production build pipeline (self-managed UI)
    await runProductionBuild({
      ryzizDir,
      templatesDir,
      projectDir,
      projectId,
      envVars
    });

    // Step 10: Deploy to Firebase (self-managed UI)
    const result = await deployToFirebase({ ryzizDir, projectId });

    // Display success information
    console.log(chalk.green('\n✓ Deployed!'));
    console.log(chalk.bold('\nLive at:'));
    console.log(chalk.cyan(`  ${result.urls.webApp}`));
    console.log(chalk.gray('\nDashboard:'));
    console.log(chalk.gray(`  ${result.urls.console}\n`));

    cleanup(0);

  } catch (error) {
    // Handle deployment failures gracefully
    console.error(chalk.red('\n❌ Deploy failed:'), error.message);
    console.log(chalk.yellow('\nTips:'));
    console.log(chalk.gray('  firebase login'));
    console.log(chalk.gray('  firebase projects:list\n'));
    cleanup(1);
  }
}

/**
 * Get Firebase project ID from config or prompt user
 * Self-managed UI: handles spinner and interactive prompts
 */
async function getProjectId(configPath, ryzizDir) {
  console.log('Getting project ID');

  // Try to load from saved config
  if (fs.existsSync(configPath)) {
    const config = await fs.readJson(configPath);
    if (config.projectId) {
      console.log(`Using project: ${chalk.cyan(config.projectId)}`);
      return config.projectId;
    }
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
  console.log(chalk.gray('✓ Project ID saved for future deployments\n'));

  return projectId;
}

/**
 * Run production build pipeline
 * All steps self-manage their UI
 */
async function runProductionBuild(config) {
  const { ryzizDir, templatesDir, projectDir, projectId, envVars } = config;

  // Set production mode
  process.env.NODE_ENV = 'production';

  // Execute each build step (self-managed UI)
  await copyTemplateFiles({ ryzizDir, templatesDir, projectId });
  await copySourceFiles({ projectDir, ryzizDir, envVars });
  await buildClientBundles(ryzizDir);
  await buildJSX({ ryzizDir });
  await installDependencies({ ryzizDir, production: true });
}