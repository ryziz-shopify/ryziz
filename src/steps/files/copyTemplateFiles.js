import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * Copy Firebase template files to .ryziz directory
 * Creates firebase.json, .firebaserc, and functions boilerplate
 */
export async function copyTemplateFiles({
  ryzizDir,
  templatesDir,
  projectId = 'demo-project',
  logger
}) {
  logger?.startStep?.('Generate Firebase configuration');
  logger?.verbose?.(`Using project ID: ${projectId}`);

  // Create directory structure
  await fs.ensureDir(path.join(ryzizDir, 'functions'));
  logger?.logFileOperation?.('CREATE_DIR', path.join(ryzizDir, 'functions'));

  await fs.ensureDir(path.join(ryzizDir, 'public'));
  logger?.logFileOperation?.('CREATE_DIR', path.join(ryzizDir, 'public'));

  // Copy firebase.json
  const firebaseJsonSrc = path.join(templatesDir, 'firebase.json');
  const firebaseJsonDest = path.join(ryzizDir, 'firebase.json');
  await fs.copy(firebaseJsonSrc, firebaseJsonDest);
  logger?.logFileOperation?.('COPY', `firebase.json → ${firebaseJsonDest}`);

  // Generate .firebaserc with project ID
  const firebasercTemplate = await fs.readFile(
    path.join(templatesDir, 'firebaserc'),
    'utf-8'
  );
  const firebaserc = firebasercTemplate.replace('PROJECT_ID_PLACEHOLDER', projectId);
  const firebasercDest = path.join(ryzizDir, '.firebaserc');
  await fs.writeFile(firebasercDest, firebaserc);
  logger?.logFileOperation?.('WRITE', `.firebaserc (project: ${projectId})`);

  // Copy functions/index.js
  const functionsIndexSrc = path.join(templatesDir, 'functions/index.js');
  const functionsIndexDest = path.join(ryzizDir, 'functions/index.js');
  await fs.copy(functionsIndexSrc, functionsIndexDest);
  logger?.logFileOperation?.('COPY', 'functions/index.js');

  // Copy functions/package.json
  const functionsPackageTemplate = await fs.readFile(
    path.join(templatesDir, 'functions/package.json'),
    'utf-8'
  );
  const functionsPackageDest = path.join(ryzizDir, 'functions/package.json');
  await fs.writeFile(functionsPackageDest, functionsPackageTemplate);
  logger?.logFileOperation?.('WRITE', 'functions/package.json');

  logger?.log?.(chalk.green('✓ Firebase configuration generated'));
  logger?.endStep?.('Generate Firebase configuration');

  return { success: true };
}
