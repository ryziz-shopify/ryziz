import { build } from 'esbuild';
import { glob } from 'glob';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * Build JSX files to JS using esbuild
 * Transforms .jsx files to .js for server-side rendering
 * Removes original .jsx files after transformation
 */
export async function buildJSX({ ryzizDir, logger }) {
  logger?.startStep?.('Build JSX files');
  logger?.verbose?.('Searching for JSX files to transform...');

  const srcRoutesDir = path.join(ryzizDir, 'functions/src/routes');

  // Exit early if no routes directory
  if (!fs.existsSync(srcRoutesDir)) {
    logger?.verbose?.('No routes directory found, skipping JSX build');
    logger?.endStep?.('Build JSX files');
    return { filesBuilt: 0 };
  }

  // Find all .jsx files
  const jsxFiles = await glob('**/*.jsx', {
    cwd: srcRoutesDir,
    absolute: true
  });

  if (jsxFiles.length === 0) {
    logger?.verbose?.('No JSX files found');
    logger?.endStep?.('Build JSX files');
    return { filesBuilt: 0 };
  }

  logger?.verbose?.(`Found ${jsxFiles.length} JSX file(s) to build`);

  // Build each JSX file to JS
  for (const jsxFile of jsxFiles) {
    const outfile = jsxFile.replace(/\.jsx$/, '.js');
    const relativePath = path.relative(srcRoutesDir, jsxFile);

    logger?.verbose?.(`Building: ${relativePath}`);

    await build({
      entryPoints: [jsxFile],
      outfile,
      format: 'esm',
      platform: 'node',
      target: 'node18',
      jsx: 'transform',
      bundle: false,
      sourcemap: true,
      logLevel: 'error'
    });

    // Remove original .jsx file
    await fs.remove(jsxFile);
    logger?.verbose?.(`Transformed: ${relativePath} → ${relativePath.replace('.jsx', '.js')}`);
  }

  logger?.log?.(chalk.green(`✓ Built ${jsxFiles.length} JSX file(s)`));
  logger?.endStep?.('Build JSX files');

  return { filesBuilt: jsxFiles.length };
}
