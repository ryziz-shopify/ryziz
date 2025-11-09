import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { parse, stringify } from 'toml-patch';
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RYZIZ_DIR = '.ryziz';
const CACHE_PATH = path.join(process.cwd(), '.ryziz/cache.json');
const COMPLIANCE_TOPICS = ['customers/data_request', 'customers/redact', 'shop/redact'];

export const scanShopifyConfigs = _scanShopifyConfigs;
export const saveConfigToCache = _saveConfigToCache;
export const getCachedConfig = _getCachedConfig;
export const loadEnvironment = _loadEnvironment;
export const writeEnvFile = _writeEnvFile;
export const ensureAccessConfig = _ensureAccessConfig;
export const updateShopifyConfig = _updateShopifyConfig;
export const buildFrontend = _buildFrontend;
export const buildBackend = _buildBackend;

// Implementation

async function _scanShopifyConfigs(options = {}) {
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
    const cache = _readCache();
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

function _saveConfigToCache(configPath) {
  _writeCache({ shopifyConfig: configPath });
}

function _getCachedConfig() {
  const cache = _readCache();
  return cache.shopifyConfig;
}

function _loadEnvironment(configPath) {
  const tomlPath = path.join(process.cwd(), configPath);
  const tomlContent = fs.readFileSync(tomlPath, 'utf8');
  const tomlData = parse(tomlContent);

  return {
    SHOPIFY_API_KEY: tomlData.client_id,
    SHOPIFY_SCOPES: tomlData.access_scopes?.scopes || '',
    SHOPIFY_HOST_NAME: _extractHostname(tomlData.application_url)
  };
}

function _writeEnvFile(env, tunnelUrl = null) {
  const envToWrite = tunnelUrl
    ? { ...env, SHOPIFY_HOST_NAME: tunnelUrl.replace(/^https?:\/\//, '') }
    : env;

  fs.writeFileSync(
    path.join(process.cwd(), '.ryziz/functions/.env'),
    Object.entries(envToWrite)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
  );
}

function _ensureAccessConfig(configPath) {
  const tomlPath = path.join(process.cwd(), configPath);
  const tomlContent = fs.readFileSync(tomlPath, 'utf8');
  const tomlData = parse(tomlContent);

  tomlData.access = {
    admin: { embedded_app_direct_api_access: true }
  };

  const updatedContent = stringify(tomlData);
  fs.writeFileSync(tomlPath, updatedContent);
}

async function _updateShopifyConfig(tunnelUrl, configPath) {
  const tomlPath = path.join(process.cwd(), configPath);
  const tomlContent = fs.readFileSync(tomlPath, 'utf8');
  const tomlData = parse(tomlContent);

  const allTopics = (await _scanWebhookFiles()).map(w => _convertTopicFormat(w.topic));

  tomlData.application_url = `${tunnelUrl}/app`;

  if (tomlData.auth && tomlData.auth.redirect_urls) {
    tomlData.auth.redirect_urls = [`${tunnelUrl}/auth/callback`];
  }

  _updateWebhooksSection(
    tomlData,
    allTopics.filter(t => COMPLIANCE_TOPICS.includes(t)),
    allTopics.filter(t => !COMPLIANCE_TOPICS.includes(t)),
    tunnelUrl
  );

  const updatedContent = stringify(tomlData);
  fs.writeFileSync(tomlPath, updatedContent);
}

async function _buildFrontend(options = {}) {
  const watch = options.watch || false;
  const apiKey = options.apiKey || '';
  const outdir = path.join(RYZIZ_DIR, 'public');

  const buildOptions = {
    entryPoints: {
      index: '@ryziz-shopify/router/src/entry.jsx'
    },
    bundle: true,
    outdir,
    splitting: true,
    format: 'esm',
    jsx: 'automatic',
    inject: ['react-shim'],
    minify: !watch,
    sourcemap: watch,
    alias: {
      '~': process.cwd()
    },
    plugins: [
      _reactShimPlugin(),
      _cleanDistPlugin(outdir),
      _virtualRoutesPlugin(),
      _copyPublicPlugin(outdir),
      _injectApiKeyPlugin(outdir, apiKey)
    ]
  };

  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.rebuild();
    await ctx.watch();
  } else {
    await esbuild.build(buildOptions);
  }
}

async function _buildBackend(options = {}) {
  const watch = options.watch || false;
  const outdir = path.join(RYZIZ_DIR, 'functions');

  const functionsPackagePath = path.join(__dirname, '../../functions/package.json');
  const functionsPackage = JSON.parse(fs.readFileSync(functionsPackagePath, 'utf8'));

  const buildOptions = {
    entryPoints: {
      index: '@ryziz-shopify/functions/entry.js'
    },
    bundle: true,
    outdir,
    format: 'cjs',
    external: Object.keys(functionsPackage.dependencies || {}),
    platform: 'node',
    minify: !watch,
    sourcemap: watch,
    alias: {
      '~': process.cwd()
    },
    plugins: [
      _cleanDistPlugin(outdir),
      _virtualRoutesPlugin(),
      _virtualWebhooksPlugin(),
      _generatePackageJsonPlugin(outdir, functionsPackage),
      _copyFirebaseConfigPlugin()
    ]
  };

  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.rebuild();
    await ctx.watch();
  } else {
    await esbuild.build(buildOptions);
  }
}

function _reactShimPlugin() {
  return {
    name: 'react-shim',
    setup(build) {
      build.onResolve({ filter: /^react-shim$/ }, () => {
        return {
          path: 'react-shim',
          namespace: 'react-shim'
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'react-shim' }, () => {
        return {
          contents: `
            import * as React from 'react';
            export { React };
          `,
          loader: 'js',
          resolveDir: process.cwd()
        };
      });
    }
  };
}

function _cleanDistPlugin(outdir) {
  let isFirstBuild = true;
  return {
    name: 'clean-dist',
    setup(build) {
      build.onStart(() => {
        if (!isFirstBuild) return;
        isFirstBuild = false;

        const fullPath = path.join(process.cwd(), outdir);
        if (fs.existsSync(fullPath)) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      });
    }
  };
}

function _virtualRoutesPlugin() {
  return {
    name: 'virtual-routes',
    setup(build) {
      build.onResolve({ filter: /^virtual:routes$/ }, args => {
        return {
          path: args.path,
          namespace: 'virtual-routes'
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'virtual-routes' }, async () => {
        const routes = await _scanPageFiles();
        return {
          contents: _generateRoutesConfig(routes),
          loader: 'js',
          resolveDir: process.cwd(),
          watchFiles: routes.map(r => r.file),
          watchDirs: [path.join(process.cwd(), 'src')]
        };
      });
    }
  };
}

function _copyPublicPlugin(outdir) {
  return {
    name: 'copy-public',
    setup(build) {
      build.onEnd(() => {
        const publicDir = path.join(process.cwd(), 'public');
        const targetDir = path.join(process.cwd(), outdir);

        if (fs.existsSync(publicDir)) {
          fs.cpSync(publicDir, targetDir, { recursive: true });
        }
      });
    }
  };
}

function _injectApiKeyPlugin(outdir, apiKey) {
  let isFirstBuild = true;
  return {
    name: 'inject-api-key',
    setup(build) {
      build.onEnd(() => {
        if (!isFirstBuild) return;
        isFirstBuild = false;

        const appIndexPath = path.join(process.cwd(), outdir, 'app/index.html');

        if (fs.existsSync(appIndexPath)) {
          let content = fs.readFileSync(appIndexPath, 'utf8');
          content = content.replace('%SHOPIFY_API_KEY%', apiKey);
          fs.writeFileSync(appIndexPath, content);
        }
      });
    }
  };
}

function _virtualWebhooksPlugin() {
  return {
    name: 'virtual-webhooks',
    setup(build) {
      build.onResolve({ filter: /^virtual:webhooks$/ }, args => {
        return {
          path: args.path,
          namespace: 'virtual-webhooks'
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'virtual-webhooks' }, async () => {
        const webhooks = await _scanWebhookFiles();
        return {
          contents: _generateWebhooksConfig(webhooks),
          loader: 'js',
          resolveDir: process.cwd(),
          watchFiles: webhooks.map(w => w.file),
          watchDirs: [path.join(process.cwd(), 'src')]
        };
      });
    }
  };
}

function _generatePackageJsonPlugin(outdir, functionsPackage) {
  let isFirstBuild = true;
  return {
    name: 'generate-package-json',
    setup(build) {
      build.onEnd(() => {
        if (!isFirstBuild) return;
        isFirstBuild = false;

        const targetPackage = {
          name: 'functions',
          main: 'index.js',
          engines: functionsPackage.engines,
          dependencies: functionsPackage.dependencies
        };

        const outputPath = path.join(process.cwd(), outdir, 'package.json');
        fs.writeFileSync(outputPath, JSON.stringify(targetPackage, null, 2));
      });
    }
  };
}

function _copyFirebaseConfigPlugin() {
  let isFirstBuild = true;
  return {
    name: 'copy-firebase-config',
    setup(build) {
      build.onEnd(() => {
        if (!isFirstBuild) return;
        isFirstBuild = false;

        const cwd = process.cwd();
        const ryzizDir = path.join(cwd, RYZIZ_DIR);

        fs.mkdirSync(ryzizDir, { recursive: true });

        const firebaseJsonSource = path.join(__dirname, '../../functions/firebase.json');
        const baseConfig = JSON.parse(fs.readFileSync(firebaseJsonSource, 'utf8'));

        const updatedConfig = _syncFirebaseConfig(baseConfig, cwd, ryzizDir);

        const firebaseJsonTarget = path.join(ryzizDir, 'firebase.json');
        fs.writeFileSync(firebaseJsonTarget, JSON.stringify(updatedConfig, null, 2));

        const firebasercSource = path.join(cwd, '.firebaserc');
        const firebasercTarget = path.join(ryzizDir, '.firebaserc');
        if (fs.existsSync(firebasercSource)) {
          fs.copyFileSync(firebasercSource, firebasercTarget);
        }
      });
    }
  };
}

async function _scanPageFiles() {
  const files = await glob([
    path.join(process.cwd(), 'src/page.*.jsx'),
    path.join(process.cwd(), 'src/app.*.jsx')
  ]);

  return files.map(file => {
    const filename = path.basename(file);
    const routePath = _filenameToRoute(filename);
    const absolutePath = path.resolve(file);

    return { path: routePath, file: absolutePath };
  });
}

function _filenameToRoute(filename) {
  if (filename.startsWith('app.')) {
    const name = filename.replace('app.', '').replace('.jsx', '');
    if (name === 'index') return '/app/';

    return '/app/' + name.split('.').map(segment =>
      segment.startsWith('$') ? ':' + segment.slice(1) : segment
    ).join('/');
  }

  const name = filename.replace('page.', '').replace('.jsx', '');
  if (name === 'index') return '/';

  return '/' + name.split('.').map(segment =>
    segment.startsWith('$') ? ':' + segment.slice(1) : segment
  ).join('/');
}

function _generateRoutesConfig(routes) {
  const imports = routes.map((r, i) =>
    `import Page${i} from '${r.file}';`
  ).join('\n');

  const array = routes.map((r, i) =>
    `  { path: '${r.path}', component: Page${i} }`
  ).join(',\n');

  return `${imports}\n\nexport default [\n${array}\n];\n`;
}

async function _scanWebhookFiles() {
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

function _generateWebhooksConfig(webhooks) {
  const imports = webhooks.map((w, i) =>
    `import * as webhook${i} from '${w.file}';`
  ).join('\n');

  const handlers = webhooks.map((w, i) =>
    `  [webhook${i}.TOPIC]: {
    deliveryMethod: 'http',
    callbackUrl: '/webhook',
    callback: webhook${i}.handle
  }`
  ).join(',\n');

  return `${imports}\n\nexport default {\n${handlers}\n};\n`;
}

function _syncFirebaseConfig(baseConfig, projectRoot, targetDir) {
  const configFiles = [
    { filename: 'firestore.rules', section: 'firestore', key: 'rules' },
    { filename: 'firestore.indexes.json', section: 'firestore', key: 'indexes' },
    { filename: 'storage.rules', section: 'storage', key: 'rules' }
  ];

  const updatedConfig = { ...baseConfig };

  for (const { filename, section, key } of configFiles) {
    const sourcePath = path.join(projectRoot, filename);

    if (fs.existsSync(sourcePath)) {
      if (!updatedConfig[section]) {
        updatedConfig[section] = {};
      }

      updatedConfig[section][key] = filename;

      const targetPath = path.join(targetDir, filename);
      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  return updatedConfig;
}

function _readCache() {
  if (!fs.existsSync(CACHE_PATH)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
}

function _writeCache(data) {
  const cacheDir = path.dirname(CACHE_PATH);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2));
}

function _extractHostname(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function _convertTopicFormat(topic) {
  return topic.toLowerCase().replace('_', '/');
}

function _updateWebhooksSection(tomlData, complianceTopics, topics, url) {
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
