import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RYZIZ_ROOT = path.resolve(__dirname, '../..');

/**
 * Get absolute path to firebase binary
 * Firebase is installed in .ryziz/functions/node_modules (from template)
 */
export function getFirebaseBinary(ryzizDir) {
  return path.join(ryzizDir, 'functions/node_modules/.bin/firebase');
}

/**
 * Get absolute path to shopify binary
 * Shopify CLI is bundled with ryziz package itself
 * Handles both local (non-hoisted) and hoisted installations
 */
export function getShopifyBinary() {
  // Try local node_modules first (for development/non-hoisted)
  const localPath = path.join(RYZIZ_ROOT, 'node_modules/.bin/shopify');
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  // Try hoisted location (parent node_modules - typical npm install)
  const hoistedPath = path.join(RYZIZ_ROOT, '../.bin/shopify');
  if (fs.existsSync(hoistedPath)) {
    return hoistedPath;
  }

  // Fallback to local path if neither exists (will error appropriately)
  return localPath;
}
