import fs from 'fs-extra';
import path from 'path';
import { build } from 'esbuild';
import { glob } from 'glob';
import { createTask, sequential, parallel } from '../../utils/listr-helpers.js';
import { spawnWithLogs, spawnAndWait } from '../process/spawnWithLogs.js';
import { extractApiSecret } from '../../utils/shopify-helpers.js';
import { getShopifyBinary } from '../../utils/binary-resolver.js';
import { buildRuntimeBundle, buildRouteBundle } from '../../build/client.js';

/**
 * Create build route file task
 * This is the SINGLE SOURCE OF TRUTH for route file building
 * Used by both initial build and watch rebuild
 *
 * CRITICAL ORDER:
 * 1. Build client bundle (.client.js) - needs .jsx file
 * 2. Build server JS (.js) - transforms JSX syntax
 * 3. Clean up .jsx file - MUST be last
 */
export function createBuildRouteFileTask(jsxFile, publicDir, srcRoutesDir) {
  const jsFile = jsxFile.replace(/\.jsx$/, '.js');
  // Show relative path from src/routes instead of just basename to avoid duplicates
  const relativePath = srcRoutesDir ? path.relative(srcRoutesDir, jsxFile) : path.basename(jsxFile);

  return createTask(relativePath, (ctx, task) => {
    return sequential(task, [
      createTask('Building client bundle', () =>
        buildRouteBundle(jsxFile, publicDir)
      ),

      createTask('Building server JS', () =>
        build({
          entryPoints: [jsxFile],
          outfile: jsFile,
          format: 'esm',
          platform: 'node',
          target: 'node18',
          jsx: 'transform',
          bundle: false,
          sourcemap: true,
          logLevel: 'silent'
        })
      ),

      createTask('Cleaning up JSX file', () =>
        fs.remove(jsxFile)
      )
    ]);
  }, {
    // Don't exit entire build if this file fails - continue with other files
    exitOnError: false
  });
}

/**
 * Create build project tasks
 * Returns array of tasks for building the project
 */
export function createBuildProjectTasks({ projectDir, ryzizDir, templatesDir }) {
  return [
    createTask('Fetching API secret', async (ctx) => {
      const shopifyBin = getShopifyBinary();
      const proc = spawnWithLogs({
        command: shopifyBin,
        args: ['app', 'env', 'show'],
        options: {
          cwd: projectDir,
          stdio: ['ignore', 'pipe', 'pipe']
        }
      });

      ctx.apiSecret = await extractApiSecret(proc);
    }),

    createTask('Preparing project files', (ctx, task) => {
      return sequential(task, [
        createTask('Creating directories', (ctx, task) => {
          fs.ensureDirSync(path.join(ryzizDir, 'functions'));
          fs.ensureDirSync(path.join(ryzizDir, 'public'));

          return parallel(task, [
            createTask('Copying functions/index.js', async () => {
              await fs.copy(
                path.join(templatesDir, 'functions/index.js'),
                path.join(ryzizDir, 'functions/index.js')
              );
            }),

            createTask('Copying functions/package.json', async () => {
              const template = await fs.readFile(
                path.join(templatesDir, 'functions/package.json'),
                'utf-8'
              );
              await fs.writeFile(
                path.join(ryzizDir, 'functions/package.json'),
                template
              );
            }),

            createTask('Copying src directory', async () => {
              const srcDir = path.join(projectDir, 'src');
              if (fs.existsSync(srcDir)) {
                await fs.copy(srcDir, path.join(ryzizDir, 'functions/src'));
              }
            }),

            createTask('Copying public directory', async () => {
              const publicDir = path.join(projectDir, 'public');
              if (fs.existsSync(publicDir)) {
                await fs.copy(publicDir, path.join(ryzizDir, 'public'));
              }
            })
          ]);
        }),

        createTask('Copying firebase.json', async () => {
          await fs.copy(
            path.join(templatesDir, 'firebase.json'),
            path.join(ryzizDir, 'firebase.json')
          );
        }),

        createTask('Generating .firebaserc', async () => {
          const template = await fs.readFile(
            path.join(templatesDir, 'firebaserc'),
            'utf-8'
          );
          const content = template.replace('PROJECT_ID_PLACEHOLDER', 'demo-project');
          await fs.writeFile(path.join(ryzizDir, '.firebaserc'), content);
        })
      ]);
    }),

    createTask('Building bundles', (ctx, task) => {
      const publicDir = path.join(ryzizDir, 'public');
      const srcRoutesDir = path.join(ryzizDir, 'functions/src/routes');

      fs.ensureDirSync(publicDir);

      return sequential(task, [
        // Step 1: Build runtime bundle (shared React/ReactDOM)
        createTask('Building runtime bundle', () =>
          buildRuntimeBundle(ryzizDir, publicDir)
        ),

        // Step 2: Build route files (client bundles + server JS)
        // Individual files may fail, but build continues thanks to exitOnError: false
        createTask('Building route files', (ctx, task) => {
          if (!fs.existsSync(srcRoutesDir)) {
            task.skip('No route files');
            return;
          }

          const jsxFiles = glob.sync('**/*.jsx', { cwd: srcRoutesDir, absolute: true });

          if (jsxFiles.length === 0) {
            task.skip('No route files');
            return;
          }

          // Build all route files in parallel
          // Failed files are marked with ✖ but don't stop the build
          return parallel(task, jsxFiles.map(jsxFile =>
            createBuildRouteFileTask(jsxFile, publicDir, srcRoutesDir)
          ));
        })
      ]);
    }),

    createTask('Installing dependencies', async () => {
      await spawnAndWait({
        command: 'npm',
        args: ['install'],
        options: { cwd: path.join(ryzizDir, 'functions') },
        logName: 'npm-install',
        errorMessage: 'npm install failed'
      });
    })
  ];
}
