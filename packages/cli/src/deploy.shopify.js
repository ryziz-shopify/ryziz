import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { parse, stringify } from 'toml-patch';
import { select } from '@inquirer/prompts';
import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer';
import { createTask } from './util.task.js';
import { scanWebhookFiles } from './build.backend.js';

const CACHE_PATH = path.join(process.cwd(), '.ryziz/cache.json');
const COMPLIANCE_TOPICS = ['customers/data_request', 'customers/redact', 'shop/redact'];

export default async function deployShopify(tunnelUrl, filename) {
  const tomlPath = path.join(process.cwd(), filename);
  const tomlContent = fs.readFileSync(tomlPath, 'utf8');
  const tomlData = parse(tomlContent);
  const allTopics = (await scanWebhookFiles()).map(w => convertTopicFormat(w.topic));

  // Update the JavaScript object
  // Ensure application_url always ends with /app
  tomlData.application_url = `${tunnelUrl}/app`;

  // Update auth redirect URLs - only keep URLs ending with /auth/callback
  if (tomlData.auth && tomlData.auth.redirect_urls) {
    tomlData.auth.redirect_urls = [`${tunnelUrl}/auth/callback`];
  }

  // Update webhooks
  updateWebhooksSection(
    tomlData,
    allTopics.filter(t => COMPLIANCE_TOPICS.includes(t)),
    allTopics.filter(t => !COMPLIANCE_TOPICS.includes(t)),
    tunnelUrl
  );

  // Stringify back to TOML
  const updatedContent = stringify(tomlData);

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

export function createSelectConfigTask(ctx, options) {
  let configs = [];
  let fromCache = false;

  return [
    createTask('Scan configs', async () => {
      const result = await scanShopifyConfigs(options.reset);
      configs = result.configs;
      fromCache = result.fromCache;

      if (configs.length === 0) {
        throw new Error('No Shopify config found. Try running: npm run link');
      }
    }),
    createTask('Choose config', async (task) => {
      if (configs.length === 1) {
        ctx.configPath = configs[0].value;
        return;
      }

      ctx.configPath = await task.prompt(ListrInquirerPromptAdapter).run(select, {
        message: 'Select Shopify config',
        choices: configs.map(c => ({
          name: `${c.label} (${c.name})`,
          value: c.value
        }))
      });
      writeCache({ shopifyConfig: ctx.configPath });
    }),
    createTask('Done', (task) => {
      task.title = 'Config selected';
      task.output = fromCache
        ? `${ctx.configPath} (cached, use --reset to change)`
        : ctx.configPath;
    })
  ];
}

function updateWebhooksSection(tomlData, complianceTopics, topics, url) {
  const subscriptions = [];

  if (complianceTopics.length > 0) {
    subscriptions.push({
      compliance_topics: complianceTopics,
      uri: `${url}/webhook`
    });
  }

  if (topics.length > 0) {
    subscriptions.push({
      topics,
      uri: `${url}/webhook`
    });
  }

  tomlData.webhooks.subscriptions = subscriptions;
}

function convertTopicFormat(topic) {
  return topic.toLowerCase().replace('_', '/');
}
