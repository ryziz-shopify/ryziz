import fs from 'fs-extra';
import chalk from 'chalk';

/**
 * Validate that directory is empty (except .git, .DS_Store, and .ryziz)
 * Shows progress steps for Listr integration
 */
export async function validateDirectory({ projectDir }) {
  console.log('Checking directory...');

  const files = await fs.readdir(projectDir);
  console.log(`Found ${files.length} items`);

  const nonGitFiles = files.filter(f => f !== '.git' && f !== '.DS_Store' && f !== '.ryziz');

  if (nonGitFiles.length > 0) {
    throw new Error('Directory validation failed: Please run this command in an empty directory');
  }

  console.log('Directory is empty ✓');
  return { isEmpty: true };
}
