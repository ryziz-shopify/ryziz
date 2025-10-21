import fs from 'fs-extra';
import chalk from 'chalk';

/**
 * Validate that directory is empty (except .git and .DS_Store)
 * Used for init command to prevent overwriting existing projects
 */
export async function validateDirectory({ projectDir, logger }) {
  logger?.verbose?.('Checking if directory is empty...');

  const files = await fs.readdir(projectDir);
  const nonGitFiles = files.filter(f => f !== '.git' && f !== '.DS_Store');

  if (nonGitFiles.length > 0) {
    logger?.log?.(chalk.red('\n❌ Current directory is not empty!'));
    logger?.log?.(chalk.yellow('Please run this command in an empty directory.\n'));
    throw new Error('Directory is not empty');
  }

  logger?.verbose?.('Directory is empty, proceeding...');
  return { isEmpty: true };
}
