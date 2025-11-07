import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { parse } from 'toml-patch';

const CACHE_PATH = path.join(process.cwd(), '.ryziz/cache.json');

export async function locatePackage(packageName) {
  const module = await import('module');
  const packageJsonPath = module.createRequire(import.meta.url)
    .resolve(`${packageName}/package.json`);
  return path.dirname(packageJsonPath);
}

export async function scanConfigs(options = {}) {
  const { skipCache = false } = options;

  const pattern = path.join(process.cwd(), 'shopify.app*.toml');
  const files = await glob(pattern);

  const allConfigs = files.map(file => {
    const filename = path.basename(file);
    const content = fs.readFileSync(file, 'utf8');
    const data = parse(content);

    return {
      name: filename,
      label: data.name,
      value: filename
    };
  });

  if (!skipCache) {
    const cache = readCache();
    const cachedConfig = cache.shopifyConfig;

    if (cachedConfig) {
      const cached = allConfigs.find(c => c.value === cachedConfig);
      if (cached) {
        return { configs: [cached], fromCache: true };
      }
    }
  }

  return { configs: allConfigs, fromCache: false };
}

export function readEnv(configPath) {
  const tomlPath = path.join(process.cwd(), configPath);
  const tomlContent = fs.readFileSync(tomlPath, 'utf8');
  const tomlData = parse(tomlContent);

  return {
    SHOPIFY_API_KEY: tomlData.client_id,
    SHOPIFY_SCOPES: tomlData.access_scopes?.scopes || '',
    SHOPIFY_HOST_NAME: extractHostname(tomlData.application_url)
  };
}

export function readCache() {
  if (!fs.existsSync(CACHE_PATH)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
}

export function writeCache(data) {
  const cacheDir = path.dirname(CACHE_PATH);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2));
}

function extractHostname(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}
