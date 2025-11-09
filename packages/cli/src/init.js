import { readdirSync, existsSync } from 'fs';
import { stat, cp, copyFile, rename } from 'fs/promises';
import { join, basename } from 'path';

export const locateTemplate = _locateTemplate;
export const getFiles = _getFiles;
export const copyFile = _copyFile;
export const restoreDotfiles = _restoreDotfiles;

// Implementation

async function _locateTemplate() {
  const module = await import('module');
  const packageJsonPath = module.createRequire(import.meta.url)
    .resolve('@ryziz-shopify/ryziz/package.json');
  return join(packageJsonPath, '..');
}

function _getFiles(ryzizPackagePath) {
  return readdirSync(ryzizPackagePath).filter(file => file !== 'node_modules');
}

async function _copyFile(file, ryzizPackagePath, targetDir) {
  const sourcePath = join(ryzizPackagePath, file);
  const targetPath = join(targetDir, file);

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
