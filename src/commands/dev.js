import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { buildClientBundles } from '../build/client.js';
import { selectEnvironment, showEnvInfo } from '../utils/env-selector.js';
import { loadEnvVars, updateTomlUrls, fetchApiSecret } from '../utils/toml-parser.js';
import logger from '../utils/logger.js';

// Import steps
import { copyTemplateFiles } from '../steps/files/copyTemplateFiles.js';
import { copySourceFiles } from '../steps/files/copySourceFiles.js';
import { buildJSX } from '../steps/build/buildJSX.js';
import { installDependencies } from '../steps/firebase/installDependencies.js';
import { startEmulators } from '../steps/firebase/startEmulators.js';
import { startCloudflare } from '../steps/tunnel/startCloudflare.js';
import { deployToPartners } from '../steps/shopify/deployToPartners.js';

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
    logger.log(chalk.yellow('\n⏹  Stopping...'));
    if (tunnelProcess) tunnelProcess.kill();
    if (emulators) emulators.kill();
    if (watcher) watcher.close();
    process.exit(exitCode);
  };

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  try {
    logger.log(chalk.bold('\n🚀 Starting dev server...\n'));

    // Step 1: Load Shopify configuration
    logger.spinner('Loading configuration');
    const selectedToml = await selectEnvironment(projectDir, false);

    if (!selectedToml) {
      logger.fail('No configuration found');
      logger.log(chalk.gray('   Run: npm run link'));
      shutdown(1);
    }
    logger.succeed();

    // Step 2: Retrieve Shopify API secret
    logger.spinner('Fetching API secret');
    const apiSecretResult = await fetchApiSecret(projectDir);

    if (apiSecretResult?.error) {
      logger.fail(apiSecretResult.error.message);
      shutdown(1);
    }

    if (!apiSecretResult) {
      logger.fail('API secret not found');
      logger.log(chalk.yellow('   Add SHOPIFY_API_SECRET to .env.local'));
      shutdown(1);
    }

    logger.succeed();
    const apiSecret = apiSecretResult;

    // Step 3: Execute build pipeline
    const buildSteps = [
      {
        message: 'Generating config',
        action: () => copyTemplateFiles({
          ryzizDir,
          templatesDir,
          projectId: 'demo-project'
        })
      },
      {
        message: 'Copying source',
        action: () => copySourceFiles({ projectDir, ryzizDir })
      },
      {
        message: 'Building client bundles',
        action: () => buildClientBundles(ryzizDir),
        optional: true
      },
      {
        message: 'Building JSX',
        action: () => buildJSX({ ryzizDir }),
        optional: true
      },
      {
        message: 'Installing dependencies',
        action: () => installDependencies({ ryzizDir }),
        optional: true
      }
    ];

    for (const step of buildSteps) {
      logger.spinner(step.message);
      try {
        await step.action();
        logger.succeed();
      } catch (error) {
        logger.fail(error.message);
        if (!step.optional) throw error;
        logger.log(chalk.yellow('  Will retry on file save'));
      }
    }

    // Step 4: Initialize Cloudflare tunnel
    logger.spinner('Starting tunnel');
    const cloudflareResult = await startCloudflare();
    tunnelProcess = cloudflareResult.process;
    const tunnelUrl = cloudflareResult.tunnelUrl;
    logger.succeed();

    // Configure Shopify app URLs with tunnel endpoint
    await updateTomlUrls(selectedToml, tunnelUrl);
    await deployToPartners({ projectDir });

    // Step 5: Configure environment variables
    const envVars = await loadEnvVars(projectDir, selectedToml, apiSecret);
    Object.entries(envVars).forEach(([key, value]) => {
      if (value) process.env[key] = value;
    });
    showEnvInfo(selectedToml, envVars);

    // Step 6: Launch Firebase emulators
    logger.spinner('Starting emulators');
    const emulatorResult = await startEmulators({ ryzizDir, envVars });
    emulators = emulatorResult.process;
    logger.succeed();
    logger.log(chalk.green('  ✓ Functions:  ') + chalk.gray('http://localhost:6602'));
    logger.log(chalk.green('  ✓ Firestore:  ') + chalk.gray('http://localhost:6603'));
    logger.log(chalk.green('  ✓ Hosting:    ') + chalk.gray('http://localhost:6601'));

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
        const icons = { change: '♻️', add: '➕', unlink: '➖' };
        logger.log(chalk.cyan(`\n${icons[event]} ${filePath}`));

        try {
          if (event !== 'unlink') {
            // Copy modified/new file and trigger rebuild
            const src = path.join(srcRoutesDir, filePath);
            const dest = path.join(ryzizDir, 'functions/src/routes', filePath);
            await fs.copy(src, dest);
            await buildJSX({ ryzizDir });
            await buildClientBundles(ryzizDir);
          } else {
            // Clean up removed files
            const jsxFile = path.join(ryzizDir, 'functions/src/routes', filePath);
            const jsFile = jsxFile.replace(/\.jsx$/, '.js');
            await fs.remove(jsxFile);
            await fs.remove(jsFile);
          }
          logger.log(chalk.green('✓ Done'));
        } catch (error) {
          logger.log(chalk.red(`✗ ${error.message}`));
        }
      };

      watcher.on('change', (file) => rebuild('change', file));
      watcher.on('add', (file) => rebuild('add', file));
      watcher.on('unlink', (file) => rebuild('unlink', file));
    }

    // Display success message
    logger.log(chalk.green('\n✓ Ready!'));
    logger.log(chalk.bold('\nApp URL:'));
    logger.log(chalk.cyan(`  ${tunnelUrl}`));

    // Monitor and handle child process crashes
    if (tunnelProcess) {
      tunnelProcess.on('close', (code) => {
        if (code !== 0) {
          logger.error(chalk.red(`Tunnel crashed (${code})`));
          shutdown(1);
        }
      });
    }

    if (emulators) {
      emulators.on('close', (code) => {
        if (code !== 0) {
          logger.error(chalk.red(`Emulators crashed (${code})`));
        }
        shutdown(1);
      });
    }

  } catch (error) {
    // Handle startup failures gracefully
    logger.fail('Startup failed');
    logger.error(chalk.red(error.message));
    shutdown(1);
  }
}