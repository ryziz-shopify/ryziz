import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import inquirer from 'inquirer';
import { build } from 'esbuild';
import { glob } from 'glob';

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

export async function deployCommand() {
  const projectDir = process.cwd();
  const ryzizDir = path.join(projectDir, '.ryziz');
  const templatesDir = path.join(__dirname, '../../templates/ryziz');
  const configPath = path.join(ryzizDir, 'config.json');

  console.log(chalk.bold('\n🚀 Deploying to Firebase...\n'));

  // Load production environment variables
  const envPath = path.join(projectDir, '.env.production');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(chalk.gray('Loaded .env.production'));
  } else {
    console.error(chalk.red('❌ .env.production not found!'));
    console.log(chalk.yellow('Please create .env.production with your production credentials.'));
    process.exit(1);
  }

  const spinner = ora();

  try {
    // Step 1: Determine Firebase project ID
    let projectId;

    // Try to load from saved config
    if (fs.existsSync(configPath)) {
      const config = await fs.readJson(configPath);
      projectId = config.projectId;
    }

    // Prompt for project ID if not saved
    if (!projectId) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectId',
          message: 'Enter your Firebase project ID:',
          validate: input => input.length > 0 || 'Project ID is required'
        }
      ]);
      projectId = answers.projectId;

      // Save for future use
      await fs.ensureDir(ryzizDir);
      await fs.writeJson(configPath, { projectId }, { spaces: 2 });
      console.log(chalk.gray('Project ID saved for future deployments\n'));
    }

    // Step 2: Generate production build
    spinner.start('Preparing production build...');

    await fs.ensureDir(path.join(ryzizDir, 'functions'));
    await fs.ensureDir(path.join(ryzizDir, 'public'));

    // Copy firebase.json
    await fs.copy(
      path.join(templatesDir, 'firebase.json'),
      path.join(ryzizDir, 'firebase.json')
    );

    // Generate .firebaserc with actual project ID
    const firebasercTemplate = await fs.readFile(
      path.join(templatesDir, 'firebaserc'),
      'utf-8'
    );
    const firebaserc = firebasercTemplate.replace('PROJECT_ID_PLACEHOLDER', projectId);
    await fs.writeFile(path.join(ryzizDir, '.firebaserc'), firebaserc);

    // Copy functions/index.js
    await fs.copy(
      path.join(templatesDir, 'functions/index.js'),
      path.join(ryzizDir, 'functions/index.js')
    );

    // Copy functions/package.json with published version
    const functionsPackageTemplate = await fs.readFile(
      path.join(templatesDir, 'functions/package.json'),
      'utf-8'
    );
    // Use published version for production
    const functionsPackage = functionsPackageTemplate.replace(
      'RYZIZ_VERSION_PLACEHOLDER',
      '^0.0.1'
    );
    await fs.writeFile(
      path.join(ryzizDir, 'functions/package.json'),
      functionsPackage
    );

    spinner.succeed('Production build prepared');

    // Step 3: Copy source files
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

    // Copy production environment file
    await fs.copy(envPath, path.join(ryzizDir, 'functions/.env'));

    spinner.succeed('Source files copied');

    // Step 3.5: Build JSX files to JS
    spinner.start('Building JSX files...');
    await buildJSX(ryzizDir);
    spinner.succeed('JSX files built');

    // Step 4: Install production dependencies
    spinner.start('Installing production dependencies...');

    const npmInstall = spawn('npm', ['install', '--production'], {
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

    // Step 5: Deploy to Firebase
    spinner.start(`Deploying to Firebase project: ${projectId}...`);
    console.log(chalk.gray('\nThis may take a few minutes...\n'));

    const deploy = spawn('npx', [
      'firebase',
      'deploy',
      '--only', 'hosting,functions',
      '--project', projectId
    ], {
      cwd: path.join(ryzizDir, 'functions'),
      stdio: 'inherit'
    });

    await new Promise((resolve, reject) => {
      deploy.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Firebase deploy failed with code ${code}`));
        }
      });
    });

    spinner.succeed('Deployment completed');

    // Success message
    console.log(chalk.green('\n✅ Deployment successful!\n'));
    console.log(chalk.bold('Your app is live at:'));
    console.log(chalk.cyan(`  https://${projectId}.web.app`));
    console.log(chalk.cyan(`  https://${projectId}.firebaseapp.com\n`));

    console.log(chalk.gray('Functions dashboard:'));
    console.log(chalk.gray(`  https://console.firebase.google.com/project/${projectId}/functions\n`));

  } catch (error) {
    spinner.fail('Deployment failed');
    console.error(chalk.red(error.message));
    console.log(chalk.yellow('\nTroubleshooting tips:'));
    console.log(chalk.gray('  1. Ensure you are logged in: firebase login'));
    console.log(chalk.gray('  2. Verify project exists: firebase projects:list'));
    console.log(chalk.gray('  3. Check .env.production has valid credentials'));
    process.exit(1);
  }
}
