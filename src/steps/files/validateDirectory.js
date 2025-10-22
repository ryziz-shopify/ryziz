import fs from 'fs-extra';
import chalk from 'chalk';
import logger from '../../utils/logger.js';

/**
 * Validate that directory is empty (except .git, .DS_Store, and .ryziz)
 * Self-managed UI: handles spinner and error display
 */
export async function validateDirectory({ projectDir }) {
  logger.spinner('Validating directory');

  const files = await fs.readdir(projectDir);
  const nonGitFiles = files.filter(f => f !== '.git' && f !== '.DS_Store' && f !== '.ryziz');

  if (nonGitFiles.length > 0) {
    logger.fail('Directory is not empty');
    logger.log(chalk.yellow('   Please run this command in an empty directory.\n'));
    throw new Error('Directory is not empty');
  }

  logger.succeed('Directory validated');
  return { isEmpty: true };
}
