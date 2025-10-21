import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * Copy user's source files to .ryziz directory
 * Copies src/ → .ryziz/functions/src/ and public/ → .ryziz/public/
 */
export async function copySourceFiles({
  projectDir,
  ryzizDir,
  envVars = null,
  logger
}) {
  logger?.startStep?.('Copy source files');
  logger?.verbose?.('Copying project source files to build directory...');

  let filesCopied = 0;

  // Copy src directory
  const srcDir = path.join(projectDir, 'src');
  if (fs.existsSync(srcDir)) {
    const srcDest = path.join(ryzizDir, 'functions/src');
    await fs.copy(srcDir, srcDest);
    logger?.logFileOperation?.('COPY_DIR', `src/ → functions/src/`);
    filesCopied++;
  } else {
    logger?.verbose?.('No src/ directory found');
  }

  // Copy public directory
  const publicDir = path.join(projectDir, 'public');
  if (fs.existsSync(publicDir)) {
    const publicDest = path.join(ryzizDir, 'public');
    await fs.copy(publicDir, publicDest);
    logger?.logFileOperation?.('COPY_DIR', `public/ → public/`);
    filesCopied++;
  } else {
    logger?.verbose?.('No public/ directory found');
  }

  // Write environment variables to .env if provided (for production deploy)
  if (envVars) {
    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    await fs.writeFile(path.join(ryzizDir, 'functions/.env'), envContent);
    logger?.logFileOperation?.('WRITE', '.env file with merged environment variables');
    logger?.verbose?.(`Wrote ${Object.keys(envVars).length} environment variables to .env`);
  }

  logger?.log?.(chalk.green(`✓ Source files copied`));
  logger?.endStep?.('Copy source files');

  return { filesCopied };
}
