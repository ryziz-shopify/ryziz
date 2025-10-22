import path from 'path';
import { fileURLToPath } from 'url';

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
 */
export function getShopifyBinary() {
  return path.join(RYZIZ_ROOT, 'node_modules/.bin/shopify');
}
