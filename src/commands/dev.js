import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import chokidar from 'chokidar';
import { buildClientBundles } from '../build/client.js';
import { selectEnvironment, showEnvInfo } from '../utils/env-selector.js';
import { loadEnvVars, updateTomlUrls, fetchApiSecret } from '../utils/toml-parser.js';
import { createLogger } from '../utils/logger.js';

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
export async function devCommand(options = {}) {
  // Initialize configuration
  const projectDir = process.cwd();
  const ryzizDir = path.join(projectDir, '.ryziz');
  const templatesDir = path.join(__dirname, '../../templates/ryziz');
  const logger = createLogger(path.join(projectDir, '.ryziz', 'logs'), options.verbose);
  const spinner = ora();

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
    logger.close();
    process.exit(exitCode);
  };

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  try {
    // Step 1: Display startup banner
    logger.log(chalk.bold('\n🚀 Starting Ryziz development server...\n'));

    // Step 2: Load Shopify configuration
    logger.log(chalk.cyan('🔍 Loading configuration...\n'));
    const selectedToml = await selectEnvironment(projectDir, false);

    if (!selectedToml) {
      logger.log(chalk.red('\n❌ No Shopify configuration found'));
      logger.log(chalk.gray('   Run: npm run link\n'));
      shutdown(1);
    }

    // Step 3: Retrieve Shopify API secret
    logger.log(chalk.cyan('🔐 Fetching API secret...\n'));
    const apiSecretResult = await fetchApiSecret(projectDir);

    if (apiSecretResult?.error) {
      logger.log('\n' + apiSecretResult.error.message + '\n');
      shutdown(1);
    }

    if (!apiSecretResult) {
      logger.log(chalk.red('\n❌ API secret not found'));
      logger.log(chalk.yellow('   You can manually add SHOPIFY_API_SECRET to .env.local\n'));
      shutdown(1);
    }

    logger.log(chalk.green('✓ API secret retrieved\n'));
    const apiSecret = apiSecretResult;

    // Step 4: Execute build pipeline
    // Run all necessary build steps with optional failure tolerance
    const buildSteps = [
      {
        message: 'Generating Firebase configuration...',
        action: () => copyTemplateFiles({
          ryzizDir,
          templatesDir,
          projectId: 'demo-project',
          logger
        })
      },
      {
        message: 'Copying source files...',
        action: () => copySourceFiles({ projectDir, ryzizDir, logger })
      },
      {
        message: 'Building client bundles...',
        action: () => buildClientBundles(ryzizDir),
        optional: true
      },
      {
        message: 'Building JSX files...',
        action: () => buildJSX({ ryzizDir, logger }),
        optional: true
      },
      {
        message: 'Installing dependencies...',
        action: () => installDependencies({ ryzizDir, logger }),
        optional: true
      }
    ];

    for (const step of buildSteps) {
      spinner.start(step.message);
      try {
        await step.action();
        spinner.succeed();
      } catch (error) {
        spinner.fail(error.message);
        if (!step.optional) throw error;
        logger.log(chalk.yellow('  Will retry when you save a file\n'));
      }
    }

    // Step 5: Initialize Cloudflare tunnel
    const cloudflareResult = await startCloudflare({ logger });
    tunnelProcess = cloudflareResult.process;
    const tunnelUrl = cloudflareResult.tunnelUrl;

    // Configure Shopify app URLs with tunnel endpoint
    await updateTomlUrls(selectedToml, tunnelUrl);
    logger.log(chalk.green('✓ TOML updated with tunnel URL\n'));

    // Update Shopify Partners dashboard
    await deployToPartners({ projectDir, logger });

    // Step 6: Configure environment variables
    const envVars = await loadEnvVars(projectDir, selectedToml, apiSecret);
    Object.entries(envVars).forEach(([key, value]) => {
      if (value) process.env[key] = value;
    });
    showEnvInfo(selectedToml, envVars);

    // Step 7: Launch Firebase emulators
    const emulatorResult = await startEmulators({ ryzizDir, envVars, logger });
    emulators = emulatorResult.process;

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
        logger.log(chalk.cyan(`\n${icons[event]} ${filePath} ${event}ing...`));

        try {
          if (event !== 'unlink') {
            // Copy modified/new file and trigger rebuild
            const src = path.join(srcRoutesDir, filePath);
            const dest = path.join(ryzizDir, 'functions/src/routes', filePath);
            await fs.copy(src, dest);
            await buildJSX({ ryzizDir, logger });
            await buildClientBundles(ryzizDir);
          } else {
            // Clean up removed files
            const jsxFile = path.join(ryzizDir, 'functions/src/routes', filePath);
            const jsFile = jsxFile.replace(/\.jsx$/, '.js');
            await fs.remove(jsxFile);
            await fs.remove(jsFile);
          }
          logger.log(chalk.green('✅ Done\n'));
        } catch (error) {
          logger.log(chalk.red(`❌ Failed: ${error.message}\n`));
        }
      };

      watcher.on('change', (file) => rebuild('change', file));
      watcher.on('add', (file) => rebuild('add', file));
      watcher.on('unlink', (file) => rebuild('unlink', file));
    }

    // Step 9: Display success message
    logger.log(chalk.bold('\n📡 Shopify App URL:\n'));
    logger.log(chalk.cyan(`  ${tunnelUrl}\n`));
    logger.log(chalk.gray('  Partners Dashboard updated automatically\n'));

    // Monitor and handle child process crashes
    if (tunnelProcess) {
      tunnelProcess.on('close', (code) => {
        if (code !== 0) {
          logger.error(chalk.red(`Tunnel crashed with code ${code}`));
          shutdown(1);
        }
      });
    }

    if (emulators) {
      emulators.on('close', (code) => {
        if (code !== 0) {
          logger.error(chalk.red(`Emulators crashed with code ${code}`));
        }
        shutdown(1);
      });
    }

  } catch (error) {
    // Handle startup failures gracefully
    spinner.fail('Failed to start');
    logger.error(chalk.red(error.message));
    shutdown(1);
  }
}