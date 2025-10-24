import fs from 'fs-extra';
import path from 'path';

/**
 * Copy user's source files to .ryziz directory
 * Self-managed UI: handles spinner
 */
export async function copySourceFiles({
  projectDir,
  ryzizDir,
  envVars = null
}) {
  console.log('Copying source');

  let filesCopied = 0;

  // Copy src directory
  const srcDir = path.join(projectDir, 'src');
  if (fs.existsSync(srcDir)) {
    const srcDest = path.join(ryzizDir, 'functions/src');
    await fs.copy(srcDir, srcDest);
    filesCopied++;
  }

  // Copy public directory
  const publicDir = path.join(projectDir, 'public');
  if (fs.existsSync(publicDir)) {
    const publicDest = path.join(ryzizDir, 'public');
    await fs.copy(publicDir, publicDest);
    filesCopied++;
  }

  // Write environment variables to .env if provided (for production deploy)
  if (envVars) {
    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    await fs.writeFile(path.join(ryzizDir, 'functions/.env'), envContent);
  }

  console.log('Source copied');
  return { filesCopied };
}
