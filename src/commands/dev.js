import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { build } from 'esbuild';
import chokidar from 'chokidar';
import { glob } from 'glob';
import { buildClientBundles } from '../build/client.js';

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

export async function devCommand() {
  const projectDir = process.cwd();
  const ryzizDir = path.join(projectDir, '.ryziz');
  const templatesDir = path.join(__dirname, '../../templates/ryziz');

  console.log(chalk.bold('\n🚀 Starting Ryziz development server...\n'));

  // Load development environment variables
  const envPath = path.join(projectDir, '.env.development');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(chalk.gray('Loaded .env.development'));
  } else {
    console.log(chalk.yellow('⚠️  .env.development not found, using defaults'));
  }

  const spinner = ora();

  try {
    // Step 1: Generate .ryziz directory structure
    spinner.start('Generating Firebase configuration...');

    await fs.ensureDir(path.join(ryzizDir, 'functions'));
    await fs.ensureDir(path.join(ryzizDir, 'public'));

    // Copy firebase.json
    await fs.copy(
      path.join(templatesDir, 'firebase.json'),
      path.join(ryzizDir, 'firebase.json')
    );

    // Copy .firebaserc (default demo project for emulators)
    const firebasercTemplate = await fs.readFile(
      path.join(templatesDir, 'firebaserc'),
      'utf-8'
    );
    const firebaserc = firebasercTemplate.replace('PROJECT_ID_PLACEHOLDER', 'demo-project');
    await fs.writeFile(path.join(ryzizDir, '.firebaserc'), firebaserc);

    // Copy functions/index.js
    await fs.copy(
      path.join(templatesDir, 'functions/index.js'),
      path.join(ryzizDir, 'functions/index.js')
    );

    // Copy functions/package.json
    const functionsPackageTemplate = await fs.readFile(
      path.join(templatesDir, 'functions/package.json'),
      'utf-8'
    );
    // Package.json already has github URL configured
    await fs.writeFile(
      path.join(ryzizDir, 'functions/package.json'),
      functionsPackageTemplate
    );

    spinner.succeed('Firebase configuration generated');

    // Step 2: Copy user's source files
    spinner.start('Copying source files...');

    // Copy src directory
    const srcDir = path.join(projectDir, 'src');
    if (fs.existsSync(srcDir)) {
      await fs.copy(srcDir, path.join(ryzizDir, 'functions/src'));
    }

    // Copy public directory
    const publicDir = path.join(projectDir, 'public');
    if (fs.existsSync(publicDir)) {
      await fs.copy(publicDir, path.join(ryzizDir, 'public'));
    }

    // Copy environment file
    if (fs.existsSync(envPath)) {
      await fs.copy(envPath, path.join(ryzizDir, 'functions/.env'));
    }

    spinner.succeed('Source files copied');

    // Step 2.5: Build client bundles for hydration (BEFORE transforming JSX)
    // SECURITY: Must run before buildJSX to strip server code from .jsx source
    spinner.start('Building client bundles for hydration...');
    await buildClientBundles(ryzizDir);
    spinner.succeed('Client bundles built');

    // Step 2.6: Build JSX files to JS (for server-side rendering)
    spinner.start('Building JSX files...');
    await buildJSX(ryzizDir);
    spinner.succeed('JSX files built');

    // Step 3: Install function dependencies
    spinner.start('Installing function dependencies...');

    const npmInstall = spawn('npm', ['install'], {
      cwd: path.join(ryzizDir, 'functions'),
      stdio: 'ignore'
    });

    await new Promise((resolve, reject) => {
      npmInstall.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`npm install failed with code ${code}`));
      });
    });

    spinner.succeed('Dependencies installed');

    // Step 4: Start Firebase emulators
    console.log(chalk.bold('\n🔥 Starting Firebase emulators...\n'));
    console.log(chalk.green('  ✓ Functions:  ') + chalk.gray('http://localhost:5001'));
    console.log(chalk.green('  ✓ Firestore:  ') + chalk.gray('http://localhost:8080'));
    console.log(chalk.green('  ✓ Hosting:    ') + chalk.gray('http://localhost:3000') + chalk.bold(' <- Your app\n'));

    const emulators = spawn('npx', [
      'firebase',
      'emulators:start',
      '--only', 'functions,firestore,hosting',
      '--project', 'demo-project'
    ], {
      cwd: path.join(ryzizDir, 'functions'),
      stdio: 'inherit'
    });

    // Step 5: Watch for JSX file changes and rebuild
    const srcRoutesDir = path.join(projectDir, 'src/routes');
    if (fs.existsSync(srcRoutesDir)) {
      const watcher = chokidar.watch('**/*.jsx', {
        cwd: srcRoutesDir,
        persistent: true,
        ignoreInitial: true
      });

      watcher.on('change', async (filePath) => {
        console.log(chalk.cyan(`\n♻️  ${filePath} changed, rebuilding...`));

        // Copy changed file to .ryziz
        const srcFile = path.join(srcRoutesDir, filePath);
        const destFile = path.join(ryzizDir, 'functions/src/routes', filePath);
        await fs.copy(srcFile, destFile);

        // Rebuild JSX and client bundles
        await buildJSX(ryzizDir);
        await buildClientBundles(ryzizDir);
        console.log(chalk.green('✅ Rebuild complete\n'));
      });

      watcher.on('add', async (filePath) => {
        console.log(chalk.cyan(`\n➕ ${filePath} added, rebuilding...`));

        // Copy new file to .ryziz
        const srcFile = path.join(srcRoutesDir, filePath);
        const destFile = path.join(ryzizDir, 'functions/src/routes', filePath);
        await fs.copy(srcFile, destFile);

        // Rebuild JSX and client bundles
        await buildJSX(ryzizDir);
        await buildClientBundles(ryzizDir);
        console.log(chalk.green('✅ Rebuild complete\n'));
      });

      watcher.on('unlink', async (filePath) => {
        console.log(chalk.cyan(`\n➖ ${filePath} removed, cleaning up...`));

        // Remove from .ryziz (both .jsx and .js versions)
        const jsxFile = path.join(ryzizDir, 'functions/src/routes', filePath);
        const jsFile = jsxFile.replace(/\.jsx$/, '.js');
        await fs.remove(jsxFile);
        await fs.remove(jsFile);
        console.log(chalk.green('✅ Cleanup complete\n'));
      });
    }

    // Handle shutdown
    let isShuttingDown = false;
    process.on('SIGINT', () => {
      if (isShuttingDown) {
        console.log(chalk.red('\n\n⚠️  Force stopping...'));
        emulators.kill('SIGKILL');
        process.exit(1);
      }

      isShuttingDown = true;
      console.log(chalk.yellow('\n\n⏹  Stopping development server...'));

      // Send SIGINT to allow graceful shutdown
      emulators.kill('SIGINT');

      // Wait for emulators to close gracefully
      setTimeout(() => {
        if (emulators.exitCode === null) {
          console.log(chalk.yellow('⚠️  Shutdown taking too long, forcing exit...'));
          emulators.kill('SIGKILL');
        }
      }, 5000);
    });

    // Keep process running
    emulators.on('close', (code) => {
      if (!isShuttingDown) {
        console.log(chalk.red(`\nFirebase emulators exited unexpectedly with code ${code}`));
      }
      process.exit(code || 0);
    });

  } catch (error) {
    spinner.fail('Failed to start development server');
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}
