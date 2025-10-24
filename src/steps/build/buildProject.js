import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { build } from 'esbuild';
import { glob } from 'glob';
import { createTask, sequential, parallel } from '../../utils/listr-helpers.js';
import { spawnWithLogs, spawnAndWait } from '../process/spawnWithLogs.js';
import { extractApiSecret } from '../../utils/shopify-helpers.js';
import { getShopifyBinary } from '../../utils/binary-resolver.js';
import { buildRuntimeBundle, buildRouteBundles } from '../../build/client.js';

/**
 * Create JSX build task for a single file
 */
export function createJsxBuildTask(jsxFile) {
  return createTask(path.basename(jsxFile), async () => {
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
    await fs.remove(jsxFile);
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
        createTask('Creating directories', async (ctx, task) => {
          await fs.ensureDir(path.join(ryzizDir, 'functions'));
          await fs.ensureDir(path.join(ryzizDir, 'public'));

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

    createTask('Building client bundles', async (ctx, task) => {
      try {
        const publicDir = path.join(ryzizDir, 'public');
        await fs.ensureDir(publicDir);

        return parallel(task, [
          createTask('Building runtime bundle', () =>
            buildRuntimeBundle(ryzizDir, publicDir)
          ),
          createTask('Building route bundles', () =>
            buildRouteBundles(ryzizDir, publicDir)
          )
        ]);
      } catch (error) {
        console.log(chalk.yellow('  Will retry on file save'));
      }
    }),

    createTask('Building JSX files', async (ctx, task) => {
      const srcRoutesDir = path.join(ryzizDir, 'functions/src/routes');

      if (!fs.existsSync(srcRoutesDir)) {
        task.skip('No JSX files');
        return;
      }

      const jsxFiles = await glob('**/*.jsx', { cwd: srcRoutesDir, absolute: true });

      if (jsxFiles.length === 0) {
        task.skip('No JSX files');
        return;
      }

      return parallel(task, jsxFiles.map(createJsxBuildTask));
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
