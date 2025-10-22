import { build } from 'esbuild';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs-extra';
import logger from '../utils/logger.js';
import { CodeTransformPipeline, SecurityError, ValidationError, TransformError } from './transforms.js';
import { securityTransformer, reactGlobalTransformer } from './transformers/index.js';
import { importValidator } from './validators/index.js';

/**
 * Runtime code that loads React and hydrates the app
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
 */
const createClientPipeline = () => {
  return new CodeTransformPipeline()
    .validate(importValidator)
    .use(reactGlobalTransformer)
    .use(securityTransformer);
};

/**
 * Transform client code plugin for esbuild
 */
const transformClientCodePlugin = {
  name: 'transform-client-code',

  setup(build) {
    const pipeline = createClientPipeline();

    build.onLoad({ filter: /src\/routes\/.*\.jsx$/ }, async (args) => {
      const source = await fs.readFile(args.path, 'utf8');

      try {
        const result = await pipeline.transform(source, args.path, {
          serverFunctions: ['loader', 'action', 'head']
        });

        logTransformResults(result.metadata, args.path);

        return {
          contents: result.code,
          loader: 'jsx'
        };

      } catch (error) {
        return handleTransformError(error, args.path, source);
      }
    });
  }
};

/**
 * Build all client bundles for browser
 * Self-managed UI: handles spinner
 */
export async function buildClientBundles(ryzizDir) {
  logger.spinner('Building client bundles');

  const publicDir = path.join(ryzizDir, 'public');
  await fs.ensureDir(publicDir);

  // Build 1: Runtime bundle
  await buildRuntimeBundle(ryzizDir, publicDir);

  // Build 2: Route bundles
  await buildRouteBundles(ryzizDir, publicDir);

  logger.succeed('Client bundles built');
}

/**
 * Build runtime bundle (React + hydration)
 */
async function buildRuntimeBundle(ryzizDir, publicDir) {
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
}

/**
 * Build route bundles from JSX source
 */
async function buildRouteBundles(ryzizDir, publicDir) {
  const srcRoutesDir = path.join(ryzizDir, 'functions/src/routes');

  if (!await fs.pathExists(srcRoutesDir)) {
    return;
  }

  const routeFiles = await glob('*.jsx', { cwd: srcRoutesDir, absolute: true });

  if (routeFiles.length === 0) {
    return;
  }

  await Promise.all(
    routeFiles.map(routeFile => buildRouteBundle(routeFile, publicDir))
  );
}

/**
 * Build single route bundle
 */
async function buildRouteBundle(routeFile, publicDir) {
  const routeName = path.basename(routeFile, '.jsx');

  return build({
    entryPoints: [routeFile],
    outfile: path.join(publicDir, `${routeName}.client.js`),
    bundle: true,
    minify: process.env.NODE_ENV === 'production',
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    jsx: 'transform',
    external: ['react', 'react-dom', 'react-dom/client'],
    plugins: [transformClientCodePlugin],
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    },
    treeShaking: true,
    logLevel: 'warning'
  });
}

/**
 * Log transform results in dev mode
 */
function logTransformResults(metadata, filepath) {
  // Transform logging disabled for clean output
  // Transformations happen silently during build
}

/**
 * Handle transform errors
 */
function handleTransformError(error, filepath, source) {
  if (error instanceof SecurityError) {
    logger.error('\n🔒 SECURITY ERROR - BUILD BLOCKED!\n');
    logger.error(error.message);
    logger.error('\nSecrets found:', error.secrets);
    throw error;
  }

  if (error instanceof ValidationError) {
    logger.error('\n❌ VALIDATION ERROR\n');
    logger.error(error.message);
    error.errors.forEach(err => {
      logger.error(`  ${err.file}:${err.line} - ${err.message}`);
    });
    throw error;
  }

  if (error instanceof TransformError) {
    logger.error('\n⚠️  TRANSFORM ERROR\n');
    logger.error(`File: ${error.filename}`);
    logger.error(`Error: ${error.message}`);
    logger.error('Cause:', error.cause);
  }

  // Unknown error - fallback
  logger.error(`[CRITICAL] Unexpected error transforming ${filepath}:`, error);
  logger.error('Falling back to original source - MAY BE UNSAFE!');

  return {
    contents: source,
    loader: 'jsx'
  };
}
