import fs from 'fs-extra';
import path from 'path';
import { spawnAndWait } from '../process/spawnWithLogs.js';
import logger from '../../utils/logger.js';

/**
 * Copy project template files for init command
 * Self-managed UI: handles spinner
 */
export async function copyProjectTemplate({ projectDir, templatesDir, projectName }) {
  logger.spinner('Copying template');

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

  logger.succeed('Template copied');
  return { success: true };
}

/**
 * Install npm dependencies for init command
 * Self-managed UI: handles spinner
 */
export async function installProjectDependencies({ projectDir }) {
  logger.spinner('Installing dependencies');

  await spawnAndWait({
    command: 'npm',
    args: ['install'],
    options: { cwd: projectDir },
    errorMessage: 'npm install failed'
  });

  logger.succeed('Dependencies installed');
  return { success: true };
}
