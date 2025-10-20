import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import { build } from 'esbuild';
import chokidar from 'chokidar';
import { glob } from 'glob';
import { buildClientBundles } from '../build/client.js';
import { selectEnvironment, showEnvInfo } from '../utils/env-selector.js';
import { loadEnvVars, updateTomlUrls, fetchApiSecret } from '../utils/toml-parser.js';
import { createLogger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build JSX files to JS using esbuild
 */
async function buildJSX(ryzizDir) {
  const functionsDir = path.join(ryzizDir, 'functions');
  const srcRoutesDir = path.join(functionsDir, 'src/routes');

  if (!fs.existsSync(srcRoutesDir)) {
    return;
  }

  // Find all .jsx files
  const jsxFiles = await glob('**/*.jsx', {
    cwd: srcRoutesDir,
    absolute: true
  });

  if (jsxFiles.length === 0) {
    return;
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

    // Remove the original .jsx file
    await fs.remove(jsxFile);
  }
}

/**
 * Gracefully kill a child process and wait for it to exit
 * @param {ChildProcess} proc - The process to kill
 * @param {string} name - Name for logging
 * @param {Logger} logger - Logger instance
 * @param {number} timeout - Max time to wait before force kill (ms)
 * @returns {Promise<void>}
 */
async function killProcessGracefully(proc, name, logger, timeout = 5000) {
  if (!proc || proc.killed) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      logger.verbose(`${name} did not exit gracefully, forcing kill...`);
      proc.kill('SIGKILL'); // Force kill if taking too long
      resolve();
    }, timeout);

    proc.once('exit', () => {
      clearTimeout(timer);
      logger.verbose(`${name} exited cleanly`);
      resolve();
    });

    // Send SIGTERM to allow process to cleanup gracefully
    logger.verbose(`Sending SIGTERM to ${name}...`);
    proc.kill('SIGTERM');
  });
}

export async function devCommand(options = {}) {
  const projectDir = process.cwd();
  const ryzizDir = path.join(projectDir, '.ryziz');
  const templatesDir = path.join(__dirname, '../../templates/ryziz');
  const verbose = options.verbose || false;

  // Initialize logger
  const logDir = '/Users/tien.h.nguyen/Repositories/ryziz-shopify/zz';
  const logger = createLogger(logDir, verbose);

  logger.log(chalk.bold('\n🚀 Starting Ryziz development server...\n'));

  // Show tip only in default mode
  if (!verbose) {
    logger.log(chalk.gray('💡 Tip: Run \'npm run dev -- --verbose\' for detailed output\n'));
  }

  // Step 1: Select environment (TOML file)
  logger.startStep('Select environment');
  logger.log(chalk.cyan('🔍 Loading configuration...\n'));
  const selectedToml = await selectEnvironment(projectDir, false);

  if (!selectedToml) {
    logger.log(chalk.red('\n❌ No Shopify configuration found'));
    logger.log(chalk.gray('   Run: npx shopify app config link\n'));
    logger.endStep('Select environment', false);
    logger.close();
    process.exit(1);
  }

  logger.verbose(`Selected TOML file: ${selectedToml}`);
  logger.endStep('Select environment');

  // Step 2: Fetch API secret from Shopify CLI
  logger.startStep('Fetch API secret');
  logger.log(chalk.cyan('\n🔐 Fetching API secret...\n'));
  logger.verbose('Running: npx shopify app env show');

  let apiSecret = null;
  try {
    apiSecret = await fetchApiSecret(projectDir);
    if (apiSecret) {
      logger.log(chalk.green('\n✓ API secret retrieved'));
      logger.verbose(`API secret: ${apiSecret.slice(0, 4)}...${apiSecret.slice(-4)}`);
    } else {
      logger.log(chalk.yellow('\n⚠️  Could not retrieve API secret (continuing anyway)'));
    }
  } catch (error) {
    logger.log(chalk.yellow('\n⚠️  Could not retrieve API secret (continuing anyway)'));
    logger.verbose(`Error: ${error.message}`);
  }
  logger.endStep('Fetch API secret');

  const spinner = ora();

  // Step 3: Load and merge all environment variables
  logger.startStep('Load environment variables');
  const envVars = await loadEnvVars(projectDir, selectedToml, apiSecret);

  // Set environment variables for the process
  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      process.env[key] = value;
      logger.logEnvVar(key, value, 'merged');
    }
  });

  // Show environment info
  showEnvInfo(selectedToml, envVars);
  logger.verbose(`Loaded ${Object.keys(envVars).length} environment variables`);
  logger.endStep('Load environment variables');

  try {
    // Step 4: Generate .ryziz directory structure
    logger.startStep('Generate Firebase configuration');
    spinner.start('Generating Firebase configuration...');

    await fs.ensureDir(path.join(ryzizDir, 'functions'));
    logger.logFileOperation('CREATE_DIR', path.join(ryzizDir, 'functions'));

    await fs.ensureDir(path.join(ryzizDir, 'public'));
    logger.logFileOperation('CREATE_DIR', path.join(ryzizDir, 'public'));

    // Copy firebase.json
    const firebaseJsonSrc = path.join(templatesDir, 'firebase.json');
    const firebaseJsonDest = path.join(ryzizDir, 'firebase.json');
    await fs.copy(firebaseJsonSrc, firebaseJsonDest);
    logger.logFileOperation('COPY', `${firebaseJsonSrc} → ${firebaseJsonDest}`);

    // Copy .firebaserc (default demo project for emulators)
    const firebasercTemplate = await fs.readFile(
      path.join(templatesDir, 'firebaserc'),
      'utf-8'
    );
    const firebaserc = firebasercTemplate.replace('PROJECT_ID_PLACEHOLDER', 'demo-project');
    const firebasercDest = path.join(ryzizDir, '.firebaserc');
    await fs.writeFile(firebasercDest, firebaserc);
    logger.logFileOperation('WRITE', firebasercDest);

    // Copy functions/index.js
    const functionsIndexSrc = path.join(templatesDir, 'functions/index.js');
    const functionsIndexDest = path.join(ryzizDir, 'functions/index.js');
    await fs.copy(functionsIndexSrc, functionsIndexDest);
    logger.logFileOperation('COPY', `${functionsIndexSrc} → ${functionsIndexDest}`);

    // Copy functions/package.json
    const functionsPackageTemplate = await fs.readFile(
      path.join(templatesDir, 'functions/package.json'),
      'utf-8'
    );
    // Package.json already has github URL configured
    const functionsPackageDest = path.join(ryzizDir, 'functions/package.json');
    await fs.writeFile(functionsPackageDest, functionsPackageTemplate);
    logger.logFileOperation('WRITE', functionsPackageDest);

    spinner.succeed('Firebase configuration generated');
    logger.endStep('Generate Firebase configuration');

    // Step 5: Copy user's source files
    logger.startStep('Copy source files');
    spinner.start('Copying source files...');

    // Copy src directory
    const srcDir = path.join(projectDir, 'src');
    if (fs.existsSync(srcDir)) {
      const srcDest = path.join(ryzizDir, 'functions/src');
      await fs.copy(srcDir, srcDest);
      logger.logFileOperation('COPY_DIR', `${srcDir} → ${srcDest}`);
    }

    // Copy public directory
    const publicDir = path.join(projectDir, 'public');
    if (fs.existsSync(publicDir)) {
      const publicDest = path.join(ryzizDir, 'public');
      await fs.copy(publicDir, publicDest);
      logger.logFileOperation('COPY_DIR', `${publicDir} → ${publicDest}`);
    }

    spinner.succeed('Source files copied');
    logger.endStep('Copy source files');

    // Step 6: Build client bundles for hydration (BEFORE transforming JSX)
    // SECURITY: Must run before buildJSX to strip server code from .jsx source
    logger.startStep('Build client bundles');
    spinner.start('Building client bundles for hydration...');
    await buildClientBundles(ryzizDir);
    spinner.succeed('Client bundles built');
    logger.verbose('Client-side hydration bundles generated');
    logger.endStep('Build client bundles');

    // Step 7: Build JSX files to JS (for server-side rendering)
    logger.startStep('Build JSX files');
    spinner.start('Building JSX files...');
    await buildJSX(ryzizDir);
    spinner.succeed('JSX files built');
    logger.verbose('JSX files transformed to JS for server-side rendering');
    logger.endStep('Build JSX files');

    // Step 8: Install function dependencies
    logger.startStep('Install function dependencies');
    spinner.start('Installing function dependencies...');
    logger.logCommand('npm', ['install']);

    // Create command-specific log in verbose mode
    const npmLogStream = logger.createCommandLogger('npm-install');

    // Show coaching message for verbose mode
    if (npmLogStream) {
      const logFile = logger.getCommandLogFile('npm-install');
      logger.log(chalk.gray(`📝 Detailed output → ${logFile}\n`));
    }

    const npmInstall = spawn('npm', ['install'], {
      cwd: path.join(ryzizDir, 'functions'),
      stdio: 'pipe' // Always pipe to capture for logging
    });

    // Capture output for logging (no console output in verbose mode)
    npmInstall.stdout?.on('data', (data) => {
      // Log to main log file
      logger.logCommandOutput(data);
      // Log to command-specific file
      logger.logToCommandFile(npmLogStream, data);
    });

    npmInstall.stderr?.on('data', (data) => {
      // Log to main log file
      logger.logCommandOutput(data);
      // Log to command-specific file
      logger.logToCommandFile(npmLogStream, data);
    });

    await new Promise((resolve, reject) => {
      npmInstall.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`npm install failed with code ${code}`));
      });
    });

    spinner.succeed('Dependencies installed');
    logger.endStep('Install function dependencies');

    // Step 9: Start Firebase emulators
    logger.startStep('Start Firebase emulators');
    logger.log(chalk.bold('\n🔥 Starting Firebase emulators...\n'));
    logger.log(chalk.green('  ✓ Functions:  ') + chalk.gray('http://localhost:6602'));
    logger.log(chalk.green('  ✓ Firestore:  ') + chalk.gray('http://localhost:6603'));
    logger.log(chalk.green('  ✓ Hosting:    ') + chalk.gray('http://localhost:6601\n'));

    logger.logCommand('npx', [
      'firebase',
      'emulators:start',
      '--only', 'functions,firestore,hosting',
      '--project', 'demo-project'
    ]);

    // Create command-specific log in verbose mode
    const firebaseLogStream = logger.createCommandLogger('firebase-emulators');

    // Show coaching message for verbose mode
    if (firebaseLogStream) {
      const logFile = logger.getCommandLogFile('firebase-emulators');
      logger.log(chalk.gray(`📝 Detailed output → ${logFile}\n`));
    }

    const emulators = spawn('npx', [
      'firebase',
      'emulators:start',
      '--only', 'functions,firestore,hosting',
      '--project', 'demo-project'
    ], {
      cwd: path.join(ryzizDir, 'functions'),
      stdio: 'pipe', // Always pipe to detect ready signal
      env: {
        ...process.env,
        ...envVars
      }
    });

    // Wait for emulators to be fully ready
    logger.verbose('Waiting for Firebase emulators to be ready...');
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Firebase emulators startup timeout (60s)'));
      }, 60000);

      const checkOutput = (data) => {
        const output = data.toString();

        // Always log to main log file
        logger.logCommandOutput(data);

        // Log to command-specific file
        logger.logToCommandFile(firebaseLogStream, data);

        // Check for ready signal
        if (output.includes('All emulators ready!')) {
          clearTimeout(timeout);
          logger.verbose('Detected: "All emulators ready!" signal');
          logger.log(chalk.green('✓ Firebase emulators ready\n'));
          logger.endStep('Start Firebase emulators');
          resolve();
        }
      };

      emulators.stdout?.on('data', checkOutput);
      emulators.stderr?.on('data', checkOutput);

      emulators.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      emulators.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0 && code !== null) {
          reject(new Error(`Firebase emulators exited with code ${code}`));
        }
      });
    });

    // Step 10: Start Cloudflare tunnel
    let tunnelProcess = null;
    let tunnelUrl = null;

    try {
      logger.startStep('Start Cloudflare tunnel');
      logger.log(chalk.cyan('🔗 Starting Cloudflare tunnel...\n'));
      logger.logCommand('npx', ['cloudflared', 'tunnel', '--url', 'http://localhost:6601']);

      // Create command-specific log in verbose mode
      const tunnelLogStream = logger.createCommandLogger('cloudflared-tunnel');

      // Show coaching message for verbose mode
      if (tunnelLogStream) {
        const logFile = logger.getCommandLogFile('cloudflared-tunnel');
        logger.log(chalk.gray(`📝 Detailed output → ${logFile}\n`));
      }

      tunnelProcess = spawn('npx', ['cloudflared', 'tunnel', '--url', 'http://localhost:6601'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Extract URL from cloudflared output
      tunnelUrl = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Tunnel connection timeout'));
        }, 30000);

        tunnelProcess.stdout.on('data', (data) => {
          // Log to main log file
          logger.logCommandOutput(data);
          // Log to command-specific file
          logger.logToCommandFile(tunnelLogStream, data);

          const output = data.toString();
          const match = output.match(/(https:\/\/[^\s]+\.trycloudflare\.com)/);
          if (match) {
            clearTimeout(timeout);
            logger.verbose(`Detected tunnel URL: ${match[1]}`);
            resolve(match[1]);
          }
        });

        tunnelProcess.stderr.on('data', (data) => {
          // Log to main log file
          logger.logCommandOutput(data);
          // Log to command-specific file
          logger.logToCommandFile(tunnelLogStream, data);

          const output = data.toString();
          const match = output.match(/(https:\/\/[^\s]+\.trycloudflare\.com)/);
          if (match) {
            clearTimeout(timeout);
            logger.verbose(`Detected tunnel URL: ${match[1]}`);
            resolve(match[1]);
          }
        });

        tunnelProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      logger.log(chalk.green(`✓ Tunnel started: ${tunnelUrl}\n`));
      logger.verbose(`Tunnel URL: ${tunnelUrl}`);
      logger.endStep('Start Cloudflare tunnel');

      // Update TOML file with tunnel URL
      logger.startStep('Update TOML configuration');
      logger.log(chalk.cyan('📝 Updating TOML configuration...\n'));
      logger.verbose(`Updating ${selectedToml} with tunnel URL ${tunnelUrl}`);

      try {
        await updateTomlUrls(selectedToml, tunnelUrl);
        logger.log(chalk.green('✓ TOML updated with tunnel URL\n'));
        logger.endStep('Update TOML configuration');
      } catch (error) {
        logger.log(chalk.yellow(`⚠️  Could not update TOML: ${error.message}`));
        logger.log(chalk.gray('   Continuing anyway...\n'));
        logger.verbose(`Error: ${error.stack}`);
        logger.endStep('Update TOML configuration', false);
      }

      // Auto-deploy to update Partners Dashboard with tunnel URL
      logger.startStep('Deploy to Shopify Partners Dashboard');
      logger.log(chalk.cyan('⬆️  Deploying to Shopify Partners Dashboard...\n'));
      logger.logCommand('npx', ['shopify', 'app', 'deploy', '--force']);

      // Create command-specific log in verbose mode
      const deployLogStream = logger.createCommandLogger('shopify-deploy');

      // Show coaching message for verbose mode
      if (deployLogStream) {
        const logFile = logger.getCommandLogFile('shopify-deploy');
        logger.log(chalk.gray(`📝 Detailed output → ${logFile}\n`));
      }

      try {
        const deployProcess = spawn('npx', ['shopify', 'app', 'deploy', '--force'], {
          cwd: projectDir,
          stdio: 'pipe' // Always pipe to capture for logging
        });

        // Capture output for logging (no console output in verbose mode)
        deployProcess.stdout?.on('data', (data) => {
          // Log to main log file
          logger.logCommandOutput(data);
          // Log to command-specific file
          logger.logToCommandFile(deployLogStream, data);
        });

        deployProcess.stderr?.on('data', (data) => {
          // Log to main log file
          logger.logCommandOutput(data);
          // Log to command-specific file
          logger.logToCommandFile(deployLogStream, data);
        });

        await new Promise((resolve, reject) => {
          deployProcess.on('close', (code) => {
            if (code === 0) {
              logger.log(chalk.green('\n✓ Partners Dashboard updated\n'));
              resolve();
            } else {
              reject(new Error(`Deploy failed with code ${code}`));
            }
          });
          deployProcess.on('error', reject);
        });
        logger.endStep('Deploy to Shopify Partners Dashboard');
      } catch (error) {
        logger.log(chalk.yellow(`⚠️  Could not update Partners Dashboard: ${error.message}`));
        logger.log(chalk.gray('   You can update manually later with: npx shopify app deploy --force\n'));
        logger.verbose(`Error: ${error.stack}`);
        logger.endStep('Deploy to Shopify Partners Dashboard', false);
      }

      logger.log(chalk.bold('📡 Shopify App URL:\n'));
      logger.log(chalk.cyan(`  ${tunnelUrl}`));
      logger.log(chalk.gray('  Partners Dashboard updated automatically\n'));

    } catch (error) {
      logger.log(chalk.yellow(`⚠️  Could not start tunnel: ${error.message}`));
      logger.log(chalk.gray('   Continuing with local development...\n'));
      logger.verbose(`Error: ${error.stack}`);
      if (logger.stepStartTime) {
        logger.endStep('Start Cloudflare tunnel', false);
      }
    }

    // Step 11: Watch for JSX file changes and rebuild
    const srcRoutesDir = path.join(projectDir, 'src/routes');
    if (fs.existsSync(srcRoutesDir)) {
      logger.verbose(`Watching for changes in: ${srcRoutesDir}`);
      const watcher = chokidar.watch('**/*.jsx', {
        cwd: srcRoutesDir,
        persistent: true,
        ignoreInitial: true
      });

      watcher.on('change', async (filePath) => {
        logger.log(chalk.cyan(`\n♻️  ${filePath} changed, rebuilding...`));

        // Copy changed file to .ryziz
        const srcFile = path.join(srcRoutesDir, filePath);
        const destFile = path.join(ryzizDir, 'functions/src/routes', filePath);
        await fs.copy(srcFile, destFile);
        logger.logFileOperation('COPY (change)', `${srcFile} → ${destFile}`);

        // Rebuild JSX and client bundles
        await buildJSX(ryzizDir);
        await buildClientBundles(ryzizDir);
        logger.log(chalk.green('✅ Rebuild complete\n'));
      });

      watcher.on('add', async (filePath) => {
        logger.log(chalk.cyan(`\n➕ ${filePath} added, rebuilding...`));

        // Copy new file to .ryziz
        const srcFile = path.join(srcRoutesDir, filePath);
        const destFile = path.join(ryzizDir, 'functions/src/routes', filePath);
        await fs.copy(srcFile, destFile);
        logger.logFileOperation('COPY (add)', `${srcFile} → ${destFile}`);

        // Rebuild JSX and client bundles
        await buildJSX(ryzizDir);
        await buildClientBundles(ryzizDir);
        logger.log(chalk.green('✅ Rebuild complete\n'));
      });

      watcher.on('unlink', async (filePath) => {
        logger.log(chalk.cyan(`\n➖ ${filePath} removed, cleaning up...`));

        // Remove from .ryziz (both .jsx and .js versions)
        const jsxFile = path.join(ryzizDir, 'functions/src/routes', filePath);
        const jsFile = jsxFile.replace(/\.jsx$/, '.js');
        await fs.remove(jsxFile);
        logger.logFileOperation('REMOVE', jsxFile);
        await fs.remove(jsFile);
        logger.logFileOperation('REMOVE', jsFile);
        logger.log(chalk.green('✅ Cleanup complete\n'));
      });
    }

    let isShuttingDown = false;
    process.on('SIGINT', async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.log(chalk.yellow('\n⏹  Stopping development server...'));
      logger.verbose('Starting graceful shutdown...');

      // Kill all child processes and wait for them to exit
      await Promise.allSettled([
        killProcessGracefully(tunnelProcess, 'Cloudflare tunnel', logger),
        killProcessGracefully(emulators, 'Firebase emulators', logger)
      ]);

      logger.verbose('All processes stopped');

      // Close logger after all processes have exited
      logger.close();
      process.exit(0);
    });

    emulators.on('close', (code) => {
      // Only close logger if not already shutting down via SIGINT
      if (!isShuttingDown) {
        logger.close();
        process.exit(code || 0);
      }
    });

  } catch (error) {
    spinner.fail('Failed to start development server');
    logger.error(chalk.red(error.message));
    logger.verbose(`Error stack: ${error.stack}`);
    logger.close();
    process.exit(1);
  }
}
