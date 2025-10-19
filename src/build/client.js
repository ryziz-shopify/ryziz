import { build } from 'esbuild';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs-extra';
import { CodeTransformPipeline, SecurityError, ValidationError, TransformError } from './transforms.js';
import { securityTransformer, reactGlobalTransformer } from './transformers/index.js';
import { importValidator } from './validators/index.js';

/**
 * Runtime code that loads React and hydrates the app
 * React is bundled here and exposed globally for route bundles to use
 */
const RUNTIME_CODE = `
import React from 'react';
import ReactDOM from 'react-dom/client';

// Export React globally so route bundles can use it
window.React = React;
window.ReactDOM = ReactDOM;

// Get route info from server-rendered page
const routePath = document.body.dataset.route;
const initialData = window.__RYZIZ_DATA__ || {};

if (routePath) {
  // Import the route bundle and hydrate
  import('/' + routePath + '.client.js')
    .then(module => {
      const Component = module.default;
      ReactDOM.hydrateRoot(
        document.getElementById('root'),
        React.createElement(Component, initialData)
      );
    })
    .catch(err => console.error('Hydration failed:', err));
}
`;

/**
 * Create client transform pipeline
 * Validators run first, then transformers
 */
const createClientPipeline = () => {
  return new CodeTransformPipeline()
    // Validators
    .validate(importValidator)

    // Transformers
    .use(reactGlobalTransformer)
    .use(securityTransformer);
};

/**
 * SECURITY & OPTIMIZATION: Transform client code using AST pipeline
 *
 * This plugin:
 * 1. Validates no server-only imports (fs, path, etc.)
 * 2. Replaces React imports with window.React (auto-detected)
 * 3. Strips server functions (loader, action, head)
 * 4. Scans for hardcoded secrets/API keys
 */
const transformClientCodePlugin = {
  name: 'transform-client-code',

  setup(build) {
    // Create pipeline instance
    const pipeline = createClientPipeline();

    build.onLoad({ filter: /src\/routes\/.*\.jsx$/ }, async (args) => {
      const source = await fs.readFile(args.path, 'utf8');

      try {
        // Transform through pipeline
        const result = await pipeline.transform(source, args.path, {
          serverFunctions: ['loader', 'action', 'head']
        });

        // Log transform results in dev mode
        if (process.env.NODE_ENV !== 'production') {
          const { metadata } = result;

          if (metadata.security?.removedFunctions?.length > 0) {
            console.log(
              `🔒 [Security] Removed ${metadata.security.removedFunctions.length} server functions from ${path.basename(args.path)}`
            );
          }

          if (metadata['react-global']?.imports?.length > 0) {
            console.log(
              `⚛️  [React] Auto-detected ${metadata['react-global'].imports.length} React imports in ${path.basename(args.path)}`
            );
          }
        }

        return {
          contents: result.code,
          loader: 'jsx'
        };

      } catch (error) {
        // Handle different error types
        if (error instanceof SecurityError) {
          console.error('\n🔒 SECURITY ERROR - BUILD BLOCKED!\n');
          console.error(error.message);
          console.error('\nSecrets found:', error.secrets);
          throw error; // Block build!
        }

        if (error instanceof ValidationError) {
          console.error('\n❌ VALIDATION ERROR\n');
          console.error(error.message);
          error.errors.forEach(err => {
            console.error(`  ${err.file}:${err.line} - ${err.message}`);
          });
          throw error; // Block build!
        }

        if (error instanceof TransformError) {
          console.error('\n⚠️  TRANSFORM ERROR\n');
          console.error(`File: ${error.filename}`);
          console.error(`Error: ${error.message}`);
          console.error('Cause:', error.cause);
        }

        // Unknown error - log and fallback
        console.error(`[CRITICAL] Unexpected error transforming ${args.path}:`, error);
        console.error('Falling back to original source - MAY BE UNSAFE!');

        return {
          contents: source,
          loader: 'jsx'
        };
      }
    });
  }
};

/**
 * Build all client bundles for browser
 *
 * Creates two types of bundles:
 * 1. runtime.js - Contains React + hydration logic (loaded first)
 * 2. [route].client.js - Route components (uses React from runtime.js)
 */
export async function buildClientBundles(ryzizDir) {
  const publicDir = path.join(ryzizDir, 'public');
  await fs.ensureDir(publicDir);

  // Build 1: Runtime bundle (React + hydration)
  const runtimeTempPath = path.join(ryzizDir, '_runtime.temp.js');
  await fs.writeFile(runtimeTempPath, RUNTIME_CODE);

  await build({
    entryPoints: [runtimeTempPath],
    outfile: path.join(publicDir, 'runtime.js'),
    bundle: true,
    minify: process.env.NODE_ENV === 'production',
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    },
    logLevel: 'warning'
  });

  await fs.remove(runtimeTempPath);

  // Build 2: Route bundles from JSX source
  const srcRoutesDir = path.join(ryzizDir, 'functions/src/routes');

  if (!await fs.pathExists(srcRoutesDir)) {
    return;
  }

  // Find .jsx source files (NOT .js transformed files)
  const routeFiles = await glob('*.jsx', { cwd: srcRoutesDir, absolute: true });

  if (routeFiles.length === 0) {
    return;
  }

  // Build all routes in parallel
  await Promise.all(
    routeFiles.map(routeFile => {
      const routeName = path.basename(routeFile, '.jsx');

      return build({
        entryPoints: [routeFile],
        outfile: path.join(publicDir, `${routeName}.client.js`),
        bundle: true,
        minify: process.env.NODE_ENV === 'production',
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        // Use classic JSX transform (React.createElement) instead of automatic
        // This avoids react/jsx-runtime imports that browsers can't resolve
        jsx: 'transform',
        // Mark React as external - already bundled in runtime.js
        external: ['react', 'react-dom', 'react-dom/client'],
        plugins: [transformClientCodePlugin],
        define: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
        },
        treeShaking: true,
        logLevel: 'warning'
      });
    })
  );
}
