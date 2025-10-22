import fs from 'fs-extra';
import path from 'path';
import TOML from 'toml-patch';
import { glob } from 'glob';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { getShopifyBinary } from './binary-resolver.js';
import logger from './logger.js';

/**
 * Find all shopify.app*.toml files in a directory
 */
export async function findShopifyTomlFiles(dir) {
  try {
    const files = await glob('shopify.app*.toml', {
      cwd: dir,
      absolute: true
    });
    return files.sort();
  } catch (error) {
    return [];
  }
}

/**
 * Parse a shopify.app.toml file
 */
export async function parseShopifyToml(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return TOML.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse ${filePath}: ${error.message}`);
  }
}

/**
 * Get environment name from toml filename
 * Returns: "dev", "production", "default", etc.
 */
export function getEnvNameFromToml(filePath) {
  const basename = path.basename(filePath);

  // shopify.app.toml -> "default"
  if (basename === 'shopify.app.toml') {
    return 'default';
  }

  // shopify.app.dev.toml -> "dev"
  const match = basename.match(/^shopify\.app\.(.+)\.toml$/);
  return match ? match[1] : 'unknown';
}

/**
 * Convert TOML config to environment variables
 */
export function tomlToEnvVars(config) {
  return {
    SHOPIFY_API_KEY: config.client_id || '',
    SHOPIFY_APP_NAME: config.name || '',
    SHOPIFY_APPLICATION_URL: config.application_url || '',
    SHOPIFY_HOST: config.application_url || '',
    SHOPIFY_EMBEDDED: config.embedded ? 'true' : 'false',
    SHOPIFY_SCOPES: config.access_scopes?.scopes || '',
    SHOPIFY_API_VERSION: config.webhooks?.api_version || '2026-01',
  };
}

/**
 * Fetch SHOPIFY_API_SECRET from Shopify CLI
 * Self-managed UI: handles spinner and error display
 */
export async function fetchApiSecret(projectDir) {
  logger.spinner('Fetching API secret');

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      logger.fail('API secret fetch timeout');
      resolve(null);
    }, 30000);

    const shopifyBin = getShopifyBinary();
    const process = spawn(shopifyBin, ['app', 'env', 'show'], {
      cwd: projectDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => { stdout += data.toString(); });
    process.stderr.on('data', (data) => { stderr += data.toString(); });

    process.on('close', (code) => {
      clearTimeout(timeout);

      // Success: extract API secret
      if (code === 0) {
        const match = stdout.match(/SHOPIFY_API_SECRET=([^\s\n]+)/);
        if (match?.[1]) {
          logger.succeed('API secret fetched');
          resolve(match[1]);
        } else {
          logger.fail('API secret not found');
          logger.log(chalk.yellow('   Add SHOPIFY_API_SECRET to .env.local\n'));
          resolve(null);
        }
        return;
      }

      // Error: display Shopify CLI output
      const output = (stdout + stderr).trim();
      const error = new Error(output || 'Shopify CLI command failed');
      error.code = code;
      logger.fail(error.message);
      resolve({ error });
    });

    process.on('error', () => {
      clearTimeout(timeout);
      logger.fail('Shopify CLI error');
      resolve(null);
    });
  });
}

/**
 * Load and merge environment variables from multiple sources
 * Priority: .env.local > apiSecret > TOML config
 */
export async function loadEnvVars(projectDir, tomlPath, apiSecret = null) {
  const envVars = {};

  // Step 1: Load from TOML (lowest priority)
  if (tomlPath && fs.existsSync(tomlPath)) {
    const tomlConfig = await parseShopifyToml(tomlPath);
    Object.assign(envVars, tomlToEnvVars(tomlConfig));
  }

  // Step 2: Add API secret (medium priority)
  if (apiSecret) {
    envVars.SHOPIFY_API_SECRET = apiSecret;
  }

  // Step 3: Load from .env.local (highest priority)
  const envLocalPath = path.join(projectDir, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const content = await fs.readFile(envLocalPath, 'utf-8');
    Object.assign(envVars, parseEnvFile(content));
  }

  return envVars;
}

/**
 * Update application_url and redirect URLs in TOML file
 */
export async function updateTomlUrls(tomlPath, tunnelUrl) {
  try {
    const content = await fs.readFile(tomlPath, 'utf-8');
    const config = TOML.parse(content);

    // Update URLs
    config.application_url = tunnelUrl;
    if (!config.auth) config.auth = {};
    config.auth.redirect_urls = [
      `${tunnelUrl}/auth/callback`,
      `${tunnelUrl}/auth/shopify/callback`,
      `${tunnelUrl}/api/auth/callback`,
    ];

    await fs.writeFile(tomlPath, TOML.stringify(config), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to update ${tomlPath}: ${error.message}`);
  }
}

/**
 * Parse .env file content
 */
function parseEnvFile(content) {
  const result = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
  }

  return result;
}
