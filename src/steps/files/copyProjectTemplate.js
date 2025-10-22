import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Copy project template files for init command
 * Creates package.json, .gitignore, .env.local.example, and src/
 */
export async function copyProjectTemplate({ projectDir, templatesDir, projectName }) {
  // Copy package.json with project name
  const packageJsonTemplate = await fs.readFile(
    path.join(templatesDir, 'package.json'),
    'utf-8'
  );
  const packageJson = packageJsonTemplate.replace('PROJECT_NAME_PLACEHOLDER', projectName);
  await fs.writeFile(path.join(projectDir, 'package.json'), packageJson);

  // Copy .gitignore
  await fs.copy(
    path.join(templatesDir, 'gitignore'),
    path.join(projectDir, '.gitignore')
  );

  // Copy .env.local.example
  await fs.copy(
    path.join(templatesDir, 'env.local.example'),
    path.join(projectDir, '.env.local.example')
  );

  // Copy src folder
  await fs.copy(
    path.join(templatesDir, 'src'),
    path.join(projectDir, 'src')
  );

  return { success: true };
}

/**
 * Install npm dependencies for init command
 */
export async function installProjectDependencies({ projectDir }) {
  execSync('npm install', {
    cwd: projectDir,
    stdio: 'ignore'
  });

  return { success: true };
}
