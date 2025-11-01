import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { parse } from 'toml-patch';

const CACHE_PATH = path.join(process.cwd(), '.ryziz/cache.json');

export default async function deployShopify(tunnelUrl, filename) {
  const tomlPath = path.join(process.cwd(), filename);
  const tomlContent = fs.readFileSync(tomlPath, 'utf8');
  const tomlData = parse(tomlContent);

  const currentOrigin = new URL(tomlData.application_url).origin;
  const updatedContent = tomlContent.replaceAll(currentOrigin, tunnelUrl);

  fs.writeFileSync(tomlPath, updatedContent);
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

export async function scanShopifyConfigs(skipCache = false) {
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
