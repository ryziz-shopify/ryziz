import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { parse, stringify } from 'toml-patch';

const COMPLIANCE_TOPICS = ['customers/data_request', 'customers/redact', 'shop/redact'];

export function ensureAccessConfig(configPath) {
  const tomlPath = path.join(process.cwd(), configPath);
  const tomlContent = fs.readFileSync(tomlPath, 'utf8');
  const tomlData = parse(tomlContent);

  tomlData.access = {
    admin: { embedded_app_direct_api_access: true }
  };

  const updatedContent = stringify(tomlData);
  fs.writeFileSync(tomlPath, updatedContent);
}

export async function updateConfig(tunnelUrl, configPath) {
  const tomlPath = path.join(process.cwd(), configPath);
  const tomlContent = fs.readFileSync(tomlPath, 'utf8');
  const tomlData = parse(tomlContent);

  const allTopics = (await scanWebhookFiles()).map(w => convertTopicFormat(w.topic));

  tomlData.application_url = `${tunnelUrl}/app`;

  if (tomlData.auth && tomlData.auth.redirect_urls) {
    tomlData.auth.redirect_urls = [`${tunnelUrl}/auth/callback`];
  }

  updateWebhooksSection(
    tomlData,
    allTopics.filter(t => COMPLIANCE_TOPICS.includes(t)),
    allTopics.filter(t => !COMPLIANCE_TOPICS.includes(t)),
    tunnelUrl
  );

  const updatedContent = stringify(tomlData);
  fs.writeFileSync(tomlPath, updatedContent);
}

async function scanWebhookFiles() {
  const pattern = path.join(process.cwd(), 'src/webhooks.*.js');
  const files = await glob(pattern);

  return files.map(file => {
    const absolutePath = path.resolve(file);
    const content = fs.readFileSync(file, 'utf8');
    const match = content.match(/export const TOPIC = ['"](.+)['"]/);

    return {
      file: absolutePath,
      topic: match ? match[1] : null
    };
  }).filter(w => w.topic);
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
