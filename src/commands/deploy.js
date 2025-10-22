import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { buildClientBundles } from '../build/client.js';
import { selectEnvironment, showEnvInfo } from '../utils/env-selector.js';
import { loadEnvVars, fetchApiSecret } from '../utils/toml-parser.js';
import { createLogger } from '../utils/logger.js';

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
export async function deployCommand(options = {}) {
  // Initialize configuration
  const projectDir = process.cwd();
  const ryzizDir = path.join(projectDir, '.ryziz');
  const templatesDir = path.join(__dirname, '../../templates/ryziz');
  const configPath = path.join(ryzizDir, 'config.json');
  const spinner = ora();
  const logger = createLogger(path.join(projectDir, '.ryziz', 'logs'), options.verbose);

  // Graceful cleanup handler (closes logger and exits cleanly)
  const cleanup = (exitCode = 1) => {
    logger.close();
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

  logger.log(chalk.bold('\n🚀 Deploying to Firebase...\n'));

  try {
    // Step 1: Load Shopify configuration
    logger.startStep('Load Shopify configuration');
    logger.log(chalk.cyan('🔍 Scanning environments...\n'));
    const selectedToml = await selectEnvironment(projectDir, false);

    if (!selectedToml) {
      logger.log(chalk.red('\n❌ No Shopify configuration found'));
      logger.log(chalk.gray('   Run: npm run link\n'));
      cleanup(1);
    }
    logger.endStep('Load Shopify configuration');

    // Step 2: Retrieve API secret (optional for deploy)
    logger.startStep('Retrieve API secret');
    logger.log(chalk.cyan('\n🔐 Fetching API secret...\n'));
    let apiSecret = null;
    const apiSecretResult = await fetchApiSecret(projectDir);

    if (apiSecretResult?.error) {
      logger.log('\n' + apiSecretResult.error.message + '\n');
    } else if (apiSecretResult) {
      apiSecret = apiSecretResult;
      logger.log(chalk.green('\n✓ API secret retrieved'));
    } else {
      logger.log(chalk.yellow('\n⚠️  API secret not found (continuing)'));
    }
    logger.endStep('Retrieve API secret');

    // Step 3: Setup environment variables
    logger.startStep('Setup environment variables');
    const envVars = await loadEnvVars(projectDir, selectedToml, apiSecret);
    Object.entries(envVars).forEach(([key, value]) => {
      if (value) {
        process.env[key] = value;
        logger.logEnvVar(key, value, 'deploy');
      }
    });
    showEnvInfo(selectedToml, envVars);
    logger.endStep('Setup environment variables');

    // Step 4: Get or request Firebase project ID
    logger.startStep('Get Firebase project ID');
    let projectId = await getProjectId(configPath, ryzizDir, logger);
    logger.endStep('Get Firebase project ID');

    // Step 5: Execute production build pipeline
    await runProductionBuild(spinner, {
      ryzizDir,
      templatesDir,
      projectDir,
      projectId,
      envVars,
      logger
    });

    // Step 6: Deploy to Firebase
    logger.startStep('Deploy to Firebase');
    spinner.start(`Deploying to Firebase project: ${projectId}...`);
    const result = await deployToFirebase({ ryzizDir, projectId, logger });
    spinner.succeed('Deployment completed');
    logger.endStep('Deploy to Firebase');

    // Display success information
    logger.log(chalk.green('\n✅ Deployment successful!\n'));
    logger.log(chalk.bold('Your app is live at:'));
    logger.log(chalk.cyan(`  ${result.urls.webApp}`));
    logger.log(chalk.cyan(`  ${result.urls.firebaseApp}\n`));
    logger.log(chalk.gray('Functions dashboard:'));
    logger.log(chalk.gray(`  ${result.urls.console}\n`));

    cleanup(0);

  } catch (error) {
    // Handle deployment failures gracefully
    spinner.fail('Deployment failed');
    logger.error(chalk.red(error.message));
    logger.log(chalk.yellow('\nTroubleshooting tips:'));
    logger.log(chalk.gray('  1. Ensure you are logged in: firebase login'));
    logger.log(chalk.gray('  2. Verify project exists: firebase projects:list'));
    logger.log(chalk.gray('  3. Check .env.production has valid credentials\n'));
    cleanup(1);
  }
}

/**
 * Get Firebase project ID from config or prompt user
 */
async function getProjectId(configPath, ryzizDir, logger) {
  // Try to load from saved config
  if (fs.existsSync(configPath)) {
    const config = await fs.readJson(configPath);
    if (config.projectId) {
      logger.verbose(`Found saved project ID: ${config.projectId}`);
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
  logger.log(chalk.gray('Project ID saved for future deployments\n'));
  logger.logFileOperation('write', configPath);

  return projectId;
}

/**
 * Run production build pipeline
 */
async function runProductionBuild(spinner, config) {
  const { ryzizDir, templatesDir, projectDir, projectId, envVars, logger } = config;

  // Set production mode
  process.env.NODE_ENV = 'production';
  logger.logEnvVar('NODE_ENV', 'production', 'deploy');

  const buildSteps = [
    {
      name: 'Prepare production build',
      message: 'Preparing production build...',
      action: () => copyTemplateFiles({ ryzizDir, templatesDir, projectId, logger })
    },
    {
      name: 'Copy source files',
      message: 'Copying source files...',
      action: () => copySourceFiles({ projectDir, ryzizDir, envVars, logger })
    },
    {
      name: 'Build client bundles',
      message: 'Building client bundles for hydration...',
      action: () => buildClientBundles(ryzizDir)
    },
    {
      name: 'Build JSX files',
      message: 'Building JSX files...',
      action: () => buildJSX({ ryzizDir, logger })
    },
    {
      name: 'Install production dependencies',
      message: 'Installing production dependencies...',
      action: () => installDependencies({ ryzizDir, production: true, logger })
    }
  ];

  // Execute each build step
  for (const step of buildSteps) {
    logger.startStep(step.name);
    spinner.start(step.message);
    await step.action();
    spinner.succeed(step.message.replace('...', ''));
    logger.endStep(step.name);
  }
}