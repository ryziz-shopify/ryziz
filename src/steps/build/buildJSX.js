import { build } from 'esbuild';
import { glob } from 'glob';
import fs from 'fs-extra';
import path from 'path';

/**
 * Build JSX files to JS using esbuild
 * Self-managed UI: handles spinner
 */
export async function buildJSX({ ryzizDir }) {
  console.log('Building JSX');

  const srcRoutesDir = path.join(ryzizDir, 'functions/src/routes');

  // Exit early if no routes directory
  if (!fs.existsSync(srcRoutesDir)) {
    console.log('No JSX files to build');
    return { filesBuilt: 0 };
  }

  // Find all .jsx files
  const jsxFiles = await glob('**/*.jsx', {
    cwd: srcRoutesDir,
    absolute: true
  });

  if (jsxFiles.length === 0) {
    console.log('No JSX files to build');
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
      logLevel: 'silent'
    });

    // Remove original .jsx file
    await fs.remove(jsxFile);
  }

  console.log('JSX built');
  return { filesBuilt: jsxFiles.length };
}
