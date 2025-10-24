import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { Listr } from 'listr2';
import { selectEnvironment } from '../utils/env-selector.js';
import { loadEnvVars, updateTomlUrls, getEnvNameFromToml } from '../utils/toml-parser.js';

// Import utilities
import { createTask, sequential, parallel } from '../utils/listr-helpers.js';
import { spawnAndWait, spawnWithLogs } from '../steps/process/spawnWithLogs.js';
import { extractTunnelUrl } from '../utils/tunnel-helpers.js';
import { getFirebaseBinary } from '../utils/binary-resolver.js';
import { waitForEmulators } from '../utils/firebase-helpers.js';

// Import steps
import { createBuildProjectTasks, createJsxBuildTask } from '../steps/build/buildProject.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Development server command for Ryziz
 * Manages Firebase emulators, Cloudflare tunnel, and hot reloading
 */
export async function devCommand() {
  // Initialize configuration
  const projectDir = process.cwd();
  const ryzizDir = path.join(projectDir, '.ryziz');
  const templatesDir = path.join(__dirname, '../../templates/ryziz');

  // Track child processes for cleanup
  let tunnelProcess = null;
  let emulators = null;
  let watcher = null;

  // Graceful shutdown handler (kills all child processes and exits cleanly)
  const shutdown = (exitCode = 1) => {
    console.log(chalk.yellow('\n⏹  Stopping...'));
    if (tunnelProcess) tunnelProcess.kill();
    if (emulators) emulators.kill();
    if (watcher) watcher.close();
    process.exit(exitCode);
  };

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  try {
    // Step 1: Load Shopify configuration (interactive - outside Listr)
    console.log(chalk.bold('\n📦 Shopify Configuration\n'));
    const selectedToml = await selectEnvironment(projectDir);
    if (!selectedToml) shutdown(1);

    // Step 2-7: Non-interactive tasks with Listr
    console.log(chalk.bold('\n🚀 Starting dev server...\n'));
    const tasks = new Listr([
      createTask('Preparing environment', async (ctx, task) => {
        return parallel(task, [
          createTask('Building project', (ctx, task) => {
            return sequential(task, createBuildProjectTasks({ projectDir, ryzizDir, templatesDir }));
          }),

          createTask('Starting Cloudflare tunnel', async (ctx, task) => {
            const tunnelProcess = spawnWithLogs({
              command: 'npx',
              args: ['cloudflared', 'tunnel', '--url', 'http://localhost:6601'],
              options: { stdio: ['ignore', 'pipe', 'pipe'] }
            });

            const tunnelUrl = await extractTunnelUrl(tunnelProcess);

            ctx.tunnelProcess = tunnelProcess;
            ctx.tunnelUrl = tunnelUrl;
          })
        ]);
      }),

      createTask('Loading environment variables', async (ctx) => {
        // Update TOML file with tunnel URL (write operation)
        await updateTomlUrls(selectedToml, ctx.tunnelUrl);

        // Load env vars from TOML + .env.local (read operation - must run after updateTomlUrls)
        ctx.envVars = await loadEnvVars(projectDir, selectedToml, ctx.apiSecret);

        // Apply to current process
        Object.entries(ctx.envVars).forEach(([key, value]) => {
          if (value) process.env[key] = value;
        });
      }),

      createTask('Launching development environment', async (ctx, task) => {
        return parallel(task, [
          createTask('Deploying to Partners', async () => {
            await spawnAndWait({
              command: 'npx',
              args: ['shopify', 'app', 'deploy', '--force'],
              options: { cwd: projectDir },
              errorMessage: 'Deploy to Partners failed'
            });
          }),

          createTask('Starting Firebase emulators', async (ctx, task) => {
            const firebaseBin = getFirebaseBinary(ryzizDir);
            const emulators = spawnWithLogs({
              command: firebaseBin,
              args: [
                'emulators:start',
                '--only', 'functions,firestore,hosting',
                '--project', 'demo-project'
              ],
              options: {
                cwd: path.join(ryzizDir, 'functions'),
                env: { ...process.env, ...ctx.envVars }
              }
            });

            await waitForEmulators(emulators);

            task.title = 'Firebase emulators started';

            ctx.emulators = emulators;
          })
        ]);
      })
    ], {
      rendererOptions: { showTimer: true }
    });

    const ctx = await tasks.run();

    // Extract from context
    tunnelProcess = ctx.tunnelProcess;
    emulators = ctx.emulators;
    const tunnelUrl = ctx.tunnelUrl;
    const envVars = ctx.envVars;

    // Show environment info
    const envName = getEnvNameFromToml(selectedToml);
    const basename = path.basename(selectedToml);

    console.log(chalk.bold('\n📋 Environment\n'));
    console.log(`✔  ${basename} ${chalk.gray(`(${envName})`)}`);
    if (envVars.SHOPIFY_APP_NAME) {
      console.log(chalk.gray(`   App: ${envVars.SHOPIFY_APP_NAME}`));
    }
    if (envVars.SHOPIFY_APPLICATION_URL) {
      console.log(chalk.gray(`   URL: ${envVars.SHOPIFY_APPLICATION_URL}`));
    }

    // Step 8: Setup file watching and hot reload
    const srcRoutesDir = path.join(projectDir, 'src/routes');
    if (fs.existsSync(srcRoutesDir)) {
      watcher = chokidar.watch('**/*.jsx', {
        cwd: srcRoutesDir,
        persistent: true,
        ignoreInitial: true
      });

      // Handle file changes with automatic rebuilding
      const rebuild = async (event, filePath) => {
        const eventLabels = {
          change: 'changed',
          add: 'added',
          unlink: 'removed'
        };

        const src = path.join(srcRoutesDir, filePath);
        const dest = path.join(ryzizDir, 'functions/src/routes', filePath);
        const jsFile = dest.replace(/\.jsx$/, '.js');

        const tasks = new Listr([
          event === 'unlink'
            ? createTask(`${filePath} (${eventLabels[event]})`, (ctx, task) => {
                return task.newListr([
                  createTask('Removing JSX file', () => fs.remove(dest)),
                  createTask('Removing JS file', () => fs.remove(jsFile))
                ]);
              })
            : createTask(`${filePath} (${eventLabels[event]})`, (ctx, task) => {
                return task.newListr([
                  createTask('Copying file', () => fs.copy(src, dest)),
                  createJsxBuildTask(dest)
                ]);
              })
        ]);

        await tasks.run();
      };

      watcher.on('change', (file) => rebuild('change', file));
      watcher.on('add', (file) => rebuild('add', file));
      watcher.on('unlink', (file) => rebuild('unlink', file));
    }

    // Display success message
    console.log(chalk.bold('\n🎉 Development Server\n'));
    console.log(chalk.green('✔  Status: Ready'));
    console.log(`✔  App URL: ${chalk.cyan(tunnelUrl)}`);
    console.log('');

    // Monitor and handle child process crashes
    if (tunnelProcess) {
      tunnelProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(chalk.red(`Tunnel crashed (${code})`));
          shutdown(1);
        }
      });
    }

    if (emulators) {
      emulators.on('close', (code) => {
        if (code !== 0) {
          console.error(chalk.red(`Emulators crashed (${code})`));
        }
        shutdown(1);
      });
    }

  } catch (error) {
    // Handle startup failures gracefully
    console.log(chalk.bold('\n❌ Error\n'));
    console.log(chalk.red('→ ' + error.message));
    shutdown(1);
  }
}