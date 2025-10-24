import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import { findShopifyTomlFiles, getEnvNameFromToml } from './toml-parser.js';

/**
 * Select environment from available shopify.app*.toml files
 * Self-managed UI: handles spinner and interactive prompts
 * @param {string} projectDir - Project directory path
 * @returns {Promise<string|null>} Selected TOML file path, or null if not found
 */
export async function selectEnvironment(projectDir) {
  const tomlFiles = await findShopifyTomlFiles(projectDir);

  if (tomlFiles.length === 0) {
    console.log(chalk.yellow('→ No configuration found'));
    console.log(chalk.gray('→ Run: npm run link\n'));
    return null;
  }

  // If only one file exists, auto-select it
  if (tomlFiles.length === 1) {
    const envName = getEnvNameFromToml(tomlFiles[0]);
    console.log(`✔  ${path.basename(tomlFiles[0])} ${chalk.gray(`(${envName})`)}`);
    return tomlFiles[0];
  }

  // Multiple files
  const choices = tomlFiles.map(filePath => {
    const basename = path.basename(filePath);
    const envName = getEnvNameFromToml(filePath);
    return {
      name: `${basename} ${chalk.gray(`(${envName})`)}`,
      value: filePath,
      short: basename
    };
  });

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'tomlFile',
      message: chalk.reset('Select environment'),
      choices,
      pageSize: 10
    }
  ]);

  if (answer.tomlFile) {
    const envName = getEnvNameFromToml(answer.tomlFile);
    console.log(`✔  ${path.basename(answer.tomlFile)} ${chalk.gray(`(${envName})`)}\n`);
  }

  return answer.tomlFile;
}
