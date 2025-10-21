import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

/**
 * Copy project template files for init command
 * Creates package.json, .gitignore, .env.local.example, and src/
 */
export async function copyProjectTemplate({ projectDir, templatesDir, projectName, logger }) {
  logger?.verbose?.('Copying project template files...');

  // Copy package.json with project name
  const packageJsonTemplate = await fs.readFile(
    path.join(templatesDir, 'package.json'),
    'utf-8'
  );
  const packageJson = packageJsonTemplate.replace('PROJECT_NAME_PLACEHOLDER', projectName);
  await fs.writeFile(path.join(projectDir, 'package.json'), packageJson);
  logger?.verbose?.('Created package.json');

  // Copy .gitignore
  await fs.copy(
    path.join(templatesDir, 'gitignore'),
    path.join(projectDir, '.gitignore')
  );
  logger?.verbose?.('Created .gitignore');

  // Copy .env.local.example
  await fs.copy(
    path.join(templatesDir, 'env.local.example'),
    path.join(projectDir, '.env.local.example')
  );
  logger?.verbose?.('Created .env.local.example');

  // Copy src folder
  await fs.copy(
    path.join(templatesDir, 'src'),
    path.join(projectDir, 'src')
  );
  logger?.verbose?.('Created src/ directory with templates');

  return { success: true };
}

/**
 * Install npm dependencies for init command
 */
export async function installProjectDependencies({ projectDir, logger }) {
  logger?.verbose?.('Installing npm dependencies...');

  execSync('npm install', {
    cwd: projectDir,
    stdio: 'ignore'
  });

  logger?.verbose?.('Dependencies installed');
  return { success: true };
}
