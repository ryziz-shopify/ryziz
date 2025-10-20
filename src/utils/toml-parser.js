import fs from 'fs-extra';
import path from 'path';
import toml from 'toml';
import { glob } from 'glob';
import { spawn } from 'child_process';

/**
 * Find all shopify.app*.toml files in a directory
 * @param {string} dir - Directory to search in
 * @returns {Promise<string[]>} Array of toml file paths
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
 * @param {string} filePath - Path to the toml file
 * @returns {Promise<object>} Parsed TOML configuration
 */
export async function parseShopifyToml(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const config = toml.parse(content);
    return config;
  } catch (error) {
    throw new Error(`Failed to parse ${filePath}: ${error.message}`);
  }
}

/**
 * Get environment name from toml filename
 * @param {string} filePath - Path to the toml file
 * @returns {string} Environment name (e.g., "dev", "production", "default")
 */
export function getEnvNameFromToml(filePath) {
  const basename = path.basename(filePath);

  // shopify.app.toml -> "default"
  if (basename === 'shopify.app.toml') {
    return 'default';
  }

  // shopify.app.dev.toml -> "dev"
  const match = basename.match(/^shopify\.app\.(.+)\.toml$/);
  if (match) {
    return match[1];
  }

  return 'unknown';
}

/**
 * Convert TOML config to environment variables
 * @param {object} config - Parsed TOML configuration
 * @returns {object} Environment variables object
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
 * @param {string} projectDir - Project directory path
 * @returns {Promise<string|null>} API secret or null if failed
 */
export async function fetchApiSecret(projectDir) {
  try {
    const envShowProcess = spawn('npx', ['shopify', 'app', 'env', 'show'], {
      cwd: projectDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';

    return await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 30000);

      envShowProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      envShowProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      envShowProcess.on('close', () => {
        clearTimeout(timeout);

        // Parse output for SHOPIFY_API_SECRET=value
        const match = output.match(/SHOPIFY_API_SECRET=([^\s\n]+)/);
        if (match && match[1]) {
          resolve(match[1]);
        } else {
          resolve(null);
        }
      });

      envShowProcess.on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  } catch (error) {
    return null;
  }
}

/**
 * Load and merge environment variables from multiple sources
 * Priority: .env.local > apiSecret > TOML config
 * @param {string} projectDir - Project directory path
 * @param {string} tomlPath - Path to selected TOML file
 * @param {string} apiSecret - SHOPIFY_API_SECRET from env show
 * @returns {Promise<object>} Merged environment variables
 */
export async function loadEnvVars(projectDir, tomlPath, apiSecret = null) {
  const envVars = {};

  // 1. Load from TOML (lowest priority)
  if (tomlPath && fs.existsSync(tomlPath)) {
    const tomlConfig = await parseShopifyToml(tomlPath);
    Object.assign(envVars, tomlToEnvVars(tomlConfig));
  }

  // 2. Add API secret (medium priority - from Shopify CLI)
  if (apiSecret) {
    envVars.SHOPIFY_API_SECRET = apiSecret;
  }

  // 3. Load from .env.local (highest priority - custom vars)
  const envLocalPath = path.join(projectDir, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envLocalContent = await fs.readFile(envLocalPath, 'utf-8');
    const parsed = parseEnvFile(envLocalContent);
    Object.assign(envVars, parsed);
  }

  return envVars;
}

/**
 * Update application_url and redirect URLs in TOML file
 * @param {string} tomlPath - Path to the TOML file
 * @param {string} tunnelUrl - Tunnel URL to set
 * @returns {Promise<void>}
 */
export async function updateTomlUrls(tomlPath, tunnelUrl) {
  try {
    let content = await fs.readFile(tomlPath, 'utf-8');

    // Update application_url
    content = content.replace(
      /application_url\s*=\s*"[^"]*"/,
      `application_url = "${tunnelUrl}"`
    );

    // Generate redirect URLs
    const redirectUrls = [
      `${tunnelUrl}/auth/callback`,
      `${tunnelUrl}/auth/shopify/callback`,
      `${tunnelUrl}/api/auth/callback`,
    ];

    // Update redirect_url_whitelist in [auth.redirect_urls] section
    const redirectListStr = redirectUrls.map((url, idx) => {
      const comma = idx < redirectUrls.length - 1 ? ',' : '';
      return `\n  "${url}"${comma}`;
    }).join('');

    // Try to find and replace existing redirect_url_whitelist
    if (content.includes('redirect_url_whitelist')) {
      content = content.replace(
        /redirect_url_whitelist\s*=\s*\[[^\]]*\]/s,
        `redirect_url_whitelist = [${redirectListStr}\n]`
      );
    } else if (content.includes('[auth.redirect_urls]')) {
      // Add redirect_url_whitelist after [auth.redirect_urls]
      content = content.replace(
        /\[auth\.redirect_urls\]/,
        `[auth.redirect_urls]\nredirect_url_whitelist = [${redirectListStr}\n]`
      );
    }

    await fs.writeFile(tomlPath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to update ${tomlPath}: ${error.message}`);
  }
}

/**
 * Simple .env file parser
 * @param {string} content - Content of .env file
 * @returns {object} Parsed environment variables
 */
function parseEnvFile(content) {
  const result = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
  }

  return result;
}
