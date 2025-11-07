import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RYZIZ_DIR = '.ryziz';

export async function buildFrontend(options = {}) {
  const watch = options.watch || false;
  const apiKey = options.apiKey || '';
  const outdir = path.join(RYZIZ_DIR, 'public');

  const buildOptions = {
    entryPoints: {
      index: '@ryziz-shopify/router/src/routes.jsx'
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
      reactShimPlugin(),
      cleanDistPlugin(outdir),
      virtualRoutesPlugin(),
      copyPublicPlugin(outdir),
      injectApiKeyPlugin(outdir, apiKey)
    ]
  };

  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
  } else {
    await esbuild.build(buildOptions);
  }
}

export async function buildBackend(options = {}) {
  const watch = options.watch || false;
  const outdir = path.join(RYZIZ_DIR, 'functions');

  const functionsPackagePath = path.join(__dirname, '../../functions/package.json');
  const functionsPackage = JSON.parse(fs.readFileSync(functionsPackagePath, 'utf8'));

  const buildOptions = {
    entryPoints: {
      index: '@ryziz-shopify/functions/src/functions.entry.js'
    },
    bundle: true,
    outdir,
    format: 'cjs',
    external: Object.keys(functionsPackage.dependencies || {}),
    platform: 'node',
    minify: !watch,
    sourcemap: watch,
    logLevel: 'silent',
    alias: {
      '~': process.cwd()
    },
    plugins: [
      cleanDistPlugin(outdir),
      virtualRoutesPlugin(),
      virtualWebhooksPlugin(),
      generatePackageJsonPlugin(outdir, functionsPackage),
      copyFirebaseConfigPlugin()
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

function reactShimPlugin() {
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

function cleanDistPlugin(outdir) {
  return {
    name: 'clean-dist',
    setup(build) {
      build.onStart(() => {
        const fullPath = path.join(process.cwd(), outdir);
        if (fs.existsSync(fullPath)) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      });
    }
  };
}

function virtualRoutesPlugin() {
  return {
    name: 'virtual-routes',
    setup(build) {
      build.onResolve({ filter: /^\.\/routes\.config\.js$/ }, args => {
        return {
          path: args.path,
          namespace: 'virtual-routes'
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'virtual-routes' }, async () => {
        const routes = await scanPageFiles();
        return {
          contents: generateRoutesConfig(routes),
          loader: 'js',
          resolveDir: process.cwd()
        };
      });
    }
  };
}

function copyPublicPlugin(outdir) {
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

function injectApiKeyPlugin(outdir, apiKey) {
  return {
    name: 'inject-api-key',
    setup(build) {
      build.onEnd(() => {
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

function virtualWebhooksPlugin() {
  return {
    name: 'virtual-webhooks',
    setup(build) {
      build.onResolve({ filter: /^\.\/webhooks\.config\.js$/ }, args => {
        return {
          path: args.path,
          namespace: 'virtual-webhooks'
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'virtual-webhooks' }, async () => {
        const webhooks = await scanWebhookFiles();
        return {
          contents: generateWebhooksConfig(webhooks),
          loader: 'js',
          resolveDir: process.cwd()
        };
      });
    }
  };
}

function generatePackageJsonPlugin(outdir, functionsPackage) {
  return {
    name: 'generate-package-json',
    setup(build) {
      build.onEnd(() => {
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

function copyFirebaseConfigPlugin() {
  return {
    name: 'copy-firebase-config',
    setup(build) {
      build.onEnd(() => {
        const cwd = process.cwd();
        const ryzizDir = path.join(cwd, RYZIZ_DIR);

        fs.mkdirSync(ryzizDir, { recursive: true });

        const firebaseJsonSource = path.join(__dirname, '../../functions/firebase.json');
        const baseConfig = JSON.parse(fs.readFileSync(firebaseJsonSource, 'utf8'));

        const updatedConfig = syncFirebaseConfig(baseConfig, cwd, ryzizDir);

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

async function scanPageFiles() {
  const files = await glob([
    path.join(process.cwd(), 'src/page.*.jsx'),
    path.join(process.cwd(), 'src/app.*.jsx')
  ]);

  return files.map(file => {
    const filename = path.basename(file);
    const routePath = filenameToRoute(filename);
    const absolutePath = path.resolve(file);

    return { path: routePath, file: absolutePath };
  });
}

function filenameToRoute(filename) {
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

function generateRoutesConfig(routes) {
  const imports = routes.map((r, i) =>
    `import Page${i} from '${r.file}';`
  ).join('\n');

  const array = routes.map((r, i) =>
    `  { path: '${r.path}', component: Page${i} }`
  ).join(',\n');

  return `${imports}\n\nexport default [\n${array}\n];\n`;
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

function generateWebhooksConfig(webhooks) {
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

function syncFirebaseConfig(baseConfig, projectRoot, targetDir) {
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

      console.log(`✓ Detected ${filename}, updating firebase.json`);
    }
  }

  return updatedConfig;
}
