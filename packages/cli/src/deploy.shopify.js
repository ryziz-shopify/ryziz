import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { parse, patch } from 'toml-patch';
import { scanWebhookFiles } from './build.backend.js';

const CACHE_PATH = path.join(process.cwd(), '.ryziz/cache.json');
const COMPLIANCE_TOPICS = ['customers/data_request', 'customers/redact', 'shop/redact'];

export default async function deployShopify(tunnelUrl, filename) {
  const tomlPath = path.join(process.cwd(), filename);
  const tomlContent = fs.readFileSync(tomlPath, 'utf8');
  const tomlData = parse(tomlContent);

  const currentOrigin = new URL(tomlData.application_url).origin;
  let updatedContent = tomlContent.replaceAll(currentOrigin, tunnelUrl);

  const webhooks = await scanWebhookFiles();
  const allTopics = webhooks.map(w => convertTopicFormat(w.topic));
  const topics = allTopics.filter(t => !COMPLIANCE_TOPICS.includes(t));

  updatedContent = updateWebhooksSection(updatedContent, topics, tunnelUrl, tomlData.webhooks.api_version);

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

export function readShopifyEnv(filename) {
  const tomlPath = path.join(process.cwd(), filename);
  const tomlContent = fs.readFileSync(tomlPath, 'utf8');
  const tomlData = parse(tomlContent);

  return {
    SHOPIFY_API_KEY: tomlData.client_id,
    SHOPIFY_SCOPES: tomlData.access_scopes?.scopes || '',
  };
}

function updateWebhooksSection(tomlContent, topics, url, apiVersion) {
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
  const updated = parse(tomlContent);

  if (isLocalhost) {
    updated.webhooks = {
      api_version: apiVersion
    };
    return patch(tomlContent, updated);
  }

  const subscriptions = [
    {
      compliance_topics: COMPLIANCE_TOPICS,
      uri: `${url}/webhook`
    }
  ];

  if (topics.length > 0) {
    subscriptions.push({
      topics,
      uri: `${url}/webhook`
    });
  }

  updated.webhooks = {
    api_version: apiVersion,
    subscriptions
  };

  return patch(tomlContent, updated);
}

function convertTopicFormat(topic) {
  return topic.toLowerCase().replace('_', '/');
}
