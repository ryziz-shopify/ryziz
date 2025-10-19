import { build } from 'esbuild';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs-extra';

/**
 * Client hydration runtime (will be written to public/runtime.js)
 * This code runs in the browser to hydrate server-rendered HTML
 */
const HYDRATION_RUNTIME = `
import React from 'react';
import { hydrateRoot } from 'react-dom/client';

// Get route name and initial data from server-rendered page
const routePath = document.body.dataset.route;
const initialData = window.__RYZIZ_DATA__ || {};

if (routePath) {
  // Dynamically import the route's client bundle
  import('/' + routePath + '.client.js').then(module => {
    const Component = module.default;

    // Hydrate the pre-rendered HTML with React
    hydrateRoot(
      document.getElementById('root'),
      React.createElement(Component, initialData)
    );
  }).catch(err => {
    console.error('Failed to hydrate:', err);
  });
}
`;

/**
 * esbuild plugin to strip server-only code (loader, action, head functions)
 * This ensures no server code ends up in client bundles
 */
const stripServerCodePlugin = {
  name: 'strip-server-code',
  setup(build) {
    build.onLoad({ filter: /routes\/.*\.(jsx|js)$/ }, async (args) => {
      const source = await fs.readFile(args.path, 'utf8');

      // Remove server-only functions
      let clientCode = source
        // Remove loader function
        .replace(/export\s+async\s+function\s+loader\s*\([^)]*\)\s*\{[\s\S]*?\n\}/gm, '')
        // Remove action function
        .replace(/export\s+async\s+function\s+action\s*\([^)]*\)\s*\{[\s\S]*?\n\}/gm, '')
        // Remove head function
        .replace(/export\s+async\s+function\s+head\s*\([^)]*\)\s*\{[\s\S]*?\n\}/gm, '');

      return {
        contents: clientCode,
        loader: 'jsx'
      };
    });
  }
};

/**
 * Build all client bundles for hydration
 * Creates:
 * - runtime.js: Shared React hydration logic
 * - [route].client.js: Per-route component bundles
 */
export async function buildClientBundles(ryzizDir) {
  const publicDir = path.join(ryzizDir, 'public');
  await fs.ensureDir(publicDir);

  // Step 1: Write hydration runtime
  const runtimePath = path.join(publicDir, 'runtime.js');
  await fs.writeFile(runtimePath, HYDRATION_RUNTIME);

  // Step 2: Build each route's client bundle
  const routesDir = path.join(ryzizDir, 'functions/src/routes');

  if (!await fs.pathExists(routesDir)) {
    return; // No routes to build
  }

  const routeFiles = await glob('*.js', { cwd: routesDir, absolute: true });

  if (routeFiles.length === 0) {
    return; // No routes found
  }

  // Build all routes in parallel
  const buildPromises = routeFiles.map(routeFile => {
    const routeName = path.basename(routeFile, '.js');

    return build({
      entryPoints: [routeFile],
      outfile: path.join(publicDir, `${routeName}.client.js`),
      bundle: true,
      minify: process.env.NODE_ENV === 'production',
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      jsx: 'automatic',
      jsxImportSource: 'react',
      plugins: [stripServerCodePlugin],
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
      },
      // Let esbuild tree-shake unused server imports
      treeShaking: true,
      logLevel: 'warning'
    });
  });

  await Promise.all(buildPromises);
}
