import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    // Copy functions/package.json with npm link approach
    const functionsPackageTemplate = await fs.readFile(
      path.join(templatesDir, 'functions/package.json'),
      'utf-8'
    );
    // Use file: protocol for local development
    const functionsPackage = functionsPackageTemplate.replace(
      'RYZIZ_VERSION_PLACEHOLDER',
      'file:../../../ryziz'
    );
    await fs.writeFile(
      path.join(ryzizDir, 'functions/package.json'),
      functionsPackage
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

    // Step 3: Install function dependencies
    spinner.start('Installing function dependencies...');

    // First, check if ryziz is linked globally
    try {
      const checkLink = spawn('npm', ['list', '-g', 'ryziz'], {
        stdio: 'pipe'
      });

      await new Promise((resolve) => {
        checkLink.on('close', () => resolve());
      });
    } catch (e) {
      // ryziz not linked, warn user
      console.log(chalk.yellow('\n⚠️  Ryziz not globally linked. Run: npm link in ryziz directory\n'));
    }

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
