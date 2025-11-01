import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import * as esbuild from 'esbuild';

const RYZIZ_DIR = '.ryziz';
const OUTDIR = path.join(RYZIZ_DIR, 'public');

export default async function build(options = {}) {
  const watch = options.watch || false;

  const buildOptions = {
    entryPoints: {
      index: '@ryziz-shopify/router/src/router.routes.jsx'
    },
    bundle: true,
    outdir: OUTDIR,
    splitting: true,
    format: 'esm',
    jsx: 'automatic',
    minify: !watch,
    sourcemap: watch,
    plugins: [
      cleanDistPlugin(),
      virtualRoutesPlugin(),
      copyPublicPlugin()
    ]
  };

  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
  } else {
    await esbuild.build(buildOptions);
  }
}

function cleanDistPlugin() {
  return {
    name: 'clean-dist',
    setup(build) {
      build.onStart(() => {
        const outdir = path.join(process.cwd(), OUTDIR);
        if (fs.existsSync(outdir)) {
          fs.rmSync(outdir, { recursive: true, force: true });
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

function copyPublicPlugin() {
  return {
    name: 'copy-public',
    setup(build) {
      build.onEnd(() => {
        const publicDir = path.join(process.cwd(), 'public');

        if (fs.existsSync(publicDir)) {
          fs.cpSync(publicDir, path.join(process.cwd(), OUTDIR), { recursive: true });
        }
      });
    }
  };
}

async function scanPageFiles() {
  const pattern = path.join(process.cwd(), 'src/page.*.jsx');
  const files = await glob(pattern);

  return files.map(file => {
    const filename = path.basename(file);
    const routePath = filenameToRoute(filename);
    const absolutePath = path.resolve(file);

    return { path: routePath, file: absolutePath };
  });
}

function filenameToRoute(filename) {
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
