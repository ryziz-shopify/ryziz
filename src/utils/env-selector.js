import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import { findShopifyTomlFiles, getEnvNameFromToml } from './toml-parser.js';
import logger from './logger.js';

/**
 * Select environment from available shopify.app*.toml files
 * @param {string} projectDir - Project directory path
 * @param {boolean} allowSkip - Allow "Skip" option
 * @returns {Promise<string|null>} Selected TOML file path, or null if skipped
 */
export async function selectEnvironment(projectDir, allowSkip = false) {
  const tomlFiles = await findShopifyTomlFiles(projectDir);

  if (tomlFiles.length === 0) {
    logger.log(chalk.yellow('\n⚠️  No shopify.app*.toml files found'));
    logger.log(chalk.gray('   Run: npm run link\n'));
    return null;
  }

  // If only one file exists, auto-select it
  if (tomlFiles.length === 1) {
    const envName = getEnvNameFromToml(tomlFiles[0]);
    logger.log(chalk.green(`\n✓ Auto-detected: ${chalk.cyan(path.basename(tomlFiles[0]))} (${envName})`));
    return tomlFiles[0];
  }

  // Multiple files - show selection prompt
  logger.log(chalk.cyan('\n🔍 Found multiple environments:'));

  const choices = tomlFiles.map(filePath => {
    const basename = path.basename(filePath);
    const envName = getEnvNameFromToml(filePath);
    return {
      name: `${basename} ${chalk.gray(`(${envName})`)}`,
      value: filePath,
      short: basename
    };
  });

  if (allowSkip) {
    choices.push({
      name: chalk.gray('Skip configuration'),
      value: null,
      short: 'Skip'
    });
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'tomlFile',
      message: 'Which environment?',
      choices,
      pageSize: 10
    }
  ]);

  if (answer.tomlFile) {
    const envName = getEnvNameFromToml(answer.tomlFile);
    logger.log(chalk.green(`✓ Using: ${chalk.cyan(path.basename(answer.tomlFile))} (${envName})`));
  }

  return answer.tomlFile;
}

/**
 * Ask user if they want to link Shopify app during init
 * @returns {Promise<boolean>} True if user wants to link
 */
export async function askToLinkShopifyApp() {
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldLink',
      message: 'Link this project to a Shopify app?',
      default: true
    }
  ]);

  return answer.shouldLink;
}

/**
 * Show environment info
 * @param {string} tomlPath - Path to TOML file
 * @param {object} envVars - Environment variables
 */
export function showEnvInfo(tomlPath, envVars) {
  const basename = path.basename(tomlPath);
  const envName = getEnvNameFromToml(tomlPath);

  logger.log(chalk.bold(`\n📋 Environment: ${chalk.cyan(envName)}`));
  logger.log(chalk.gray(`   Config: ${basename}`));

  if (envVars.SHOPIFY_APP_NAME) {
    logger.log(chalk.gray(`   App: ${envVars.SHOPIFY_APP_NAME}`));
  }

  if (envVars.SHOPIFY_APPLICATION_URL) {
    logger.log(chalk.gray(`   URL: ${envVars.SHOPIFY_APPLICATION_URL}`));
  }

  logger.log('');
}
