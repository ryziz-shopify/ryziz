import { readdirSync, existsSync } from 'fs';
import { stat, cp, copyFile, rename } from 'fs/promises';
import { join, basename } from 'path';

export const copyTemplate = _copyTemplate;

// Implementation

async function _copyTemplate(targetDir) {
  const files = await _scanTemplate();
  for (const file of files) {
    await _copy(file, targetDir);
  }
  await _restoreDotfiles(targetDir);
}

async function _scanTemplate() {
  const module = await import('module');
  const packageJsonPath = module.createRequire(import.meta.url)
    .resolve('@ryziz-shopify/ryziz/package.json');
  const templatePath = join(packageJsonPath, '..');

  return readdirSync(templatePath)
    .filter(file => file !== 'node_modules')
    .map(file => join(templatePath, file));
}

async function _copy(sourcePath, targetDir) {
  const targetPath = join(targetDir, basename(sourcePath));

  if ((await stat(sourcePath)).isDirectory()) {
    await cp(sourcePath, targetPath, { recursive: true });
  } else {
    await copyFile(sourcePath, targetPath);
  }
}

async function _restoreDotfiles(targetDir) {
  const gitignorePath = join(targetDir, 'gitignore');

  if (existsSync(gitignorePath)) {
    await rename(gitignorePath, join(targetDir, '.gitignore'));
  }
}
