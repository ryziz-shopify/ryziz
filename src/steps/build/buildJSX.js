import { build } from 'esbuild';
import { glob } from 'glob';
import fs from 'fs-extra';
import path from 'path';

/**
 * Build JSX files to JS using esbuild
 * Transforms .jsx files to .js for server-side rendering
 * Removes original .jsx files after transformation
 */
export async function buildJSX({ ryzizDir }) {
  const srcRoutesDir = path.join(ryzizDir, 'functions/src/routes');

  // Exit early if no routes directory
  if (!fs.existsSync(srcRoutesDir)) {
    return { filesBuilt: 0 };
  }

  // Find all .jsx files
  const jsxFiles = await glob('**/*.jsx', {
    cwd: srcRoutesDir,
    absolute: true
  });

  if (jsxFiles.length === 0) {
    return { filesBuilt: 0 };
  }

  // Build each JSX file to JS
  for (const jsxFile of jsxFiles) {
    const outfile = jsxFile.replace(/\.jsx$/, '.js');

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
  }

  return { filesBuilt: jsxFiles.length };
}
