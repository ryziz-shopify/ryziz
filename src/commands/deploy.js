import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { buildClientBundles } from '../build/client.js';
import { selectEnvironment, showEnvInfo } from '../utils/env-selector.js';
import { loadEnvVars, fetchApiSecret } from '../utils/toml-parser.js';
import logger from '../utils/logger.js';

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
    logger.log(chalk.yellow('\n⏹  Deployment cancelled'));
    cleanup(0);
  });
  process.on('SIGTERM', () => {
    logger.log(chalk.yellow('\n⏹  Deployment terminated'));
    cleanup(0);
  });

  logger.log(chalk.bold('\n🚀 Deploying...\n'));

  try {
    // Step 1: Load Shopify configuration
    logger.spinner('Loading environment');
    const selectedToml = await selectEnvironment(projectDir, false);

    if (!selectedToml) {
      logger.fail('No configuration found');
      logger.log(chalk.gray('   Run: npm run link'));
      cleanup(1);
    }
    logger.succeed();

    // Step 2: Retrieve API secret (optional for deploy)
    logger.spinner('Fetching API secret');
    let apiSecret = null;
    const apiSecretResult = await fetchApiSecret(projectDir);

    if (apiSecretResult?.error) {
      logger.fail(apiSecretResult.error.message);
    } else if (apiSecretResult) {
      apiSecret = apiSecretResult;
      logger.succeed();
    } else {
      logger.succeed();
    }

    // Step 3: Setup environment variables
    const envVars = await loadEnvVars(projectDir, selectedToml, apiSecret);
    Object.entries(envVars).forEach(([key, value]) => {
      if (value) process.env[key] = value;
    });
    showEnvInfo(selectedToml, envVars);

    // Step 4: Get or request Firebase project ID
    logger.spinner('Getting project ID');
    let projectId = await getProjectId(configPath, ryzizDir);
    logger.succeed();

    // Step 5-9: Execute production build pipeline
    await runProductionBuild({
      ryzizDir,
      templatesDir,
      projectDir,
      projectId,
      envVars
    });

    // Step 10: Deploy to Firebase
    logger.spinner(`Deploying to ${projectId}`);
    const result = await deployToFirebase({ ryzizDir, projectId });
    logger.succeed();

    // Display success information
    logger.log(chalk.green('\n✓ Deployed!'));
    logger.log(chalk.bold('\nLive at:'));
    logger.log(chalk.cyan(`  ${result.urls.webApp}`));
    logger.log(chalk.gray('\nDashboard:'));
    logger.log(chalk.gray(`  ${result.urls.console}`));

    cleanup(0);

  } catch (error) {
    // Handle deployment failures gracefully
    logger.fail('Deploy failed');
    logger.error(chalk.red(error.message));
    logger.log(chalk.yellow('\nTips:'));
    logger.log(chalk.gray('  firebase login'));
    logger.log(chalk.gray('  firebase projects:list'));
    cleanup(1);
  }
}

/**
 * Get Firebase project ID from config or prompt user
 */
async function getProjectId(configPath, ryzizDir) {
  // Try to load from saved config
  if (fs.existsSync(configPath)) {
    const config = await fs.readJson(configPath);
    if (config.projectId) {
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
  logger.log(chalk.gray('Project ID saved for future deployments'));

  return projectId;
}

/**
 * Run production build pipeline
 */
async function runProductionBuild(config) {
  const { ryzizDir, templatesDir, projectDir, projectId, envVars } = config;

  // Set production mode
  process.env.NODE_ENV = 'production';

  const buildSteps = [
    {
      message: 'Preparing build',
      action: () => copyTemplateFiles({ ryzizDir, templatesDir, projectId })
    },
    {
      message: 'Copying source',
      action: () => copySourceFiles({ projectDir, ryzizDir, envVars })
    },
    {
      message: 'Building client bundles',
      action: () => buildClientBundles(ryzizDir)
    },
    {
      message: 'Building JSX',
      action: () => buildJSX({ ryzizDir })
    },
    {
      message: 'Installing dependencies',
      action: () => installDependencies({ ryzizDir, production: true })
    }
  ];

  // Execute each build step
  for (const buildStep of buildSteps) {
    logger.spinner(buildStep.message);
    await buildStep.action();
    logger.succeed();
  }
}