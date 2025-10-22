import fs from 'fs-extra';
import chalk from 'chalk';

/**
 * Validate that directory is empty (except .git, .DS_Store, and .ryziz)
 * Used for init command to prevent overwriting existing projects
 */
export async function validateDirectory({ projectDir }) {
  const files = await fs.readdir(projectDir);
  const nonGitFiles = files.filter(f => f !== '.git' && f !== '.DS_Store' && f !== '.ryziz');

  if (nonGitFiles.length > 0) {
    console.log(chalk.red('\n❌ Current directory is not empty!'));
    console.log(chalk.yellow('Please run this command in an empty directory.\n'));
    throw new Error('Directory is not empty');
  }

  return { isEmpty: true };
}
