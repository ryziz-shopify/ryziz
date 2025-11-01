import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { spawnAndWait } from './util.spawn.js';

const RYZIZ_DIR = '.ryziz';
const OUTDIR = path.join(RYZIZ_DIR, 'functions');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function build(options = {}) {
  const watch = options.watch || false;

  const functionsPackagePath = path.join(__dirname, '../../functions/package.json');
  const functionsPackage = JSON.parse(fs.readFileSync(functionsPackagePath, 'utf8'));

  const buildOptions = {
    entryPoints: {
      index: '@ryziz-shopify/functions/src/functions.entry.js'
    },
    bundle: true,
    outdir: OUTDIR,
    format: 'cjs',
    external: Object.keys(functionsPackage.dependencies || {}),
    platform: 'node',
    minify: !watch,
    sourcemap: watch,
    plugins: [
      cleanDistPlugin(),
      virtualRoutesPlugin(),
      generatePackageJsonPlugin(functionsPackage),
      copyFirebaseConfigPlugin(),
      npmInstallPlugin()
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

function cleanDistPlugin() {
  return {
    name: 'clean-dist',
    setup(build) {
      build.onStart(() => {
        const indexJs = path.join(process.cwd(), OUTDIR, 'index.js');
        const indexJsMap = path.join(process.cwd(), OUTDIR, 'index.js.map');

        if (fs.existsSync(indexJs)) fs.rmSync(indexJs);
        if (fs.existsSync(indexJsMap)) fs.rmSync(indexJsMap);
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
        const routes = await scanApiFiles();
        return {
          contents: generateRoutesConfig(routes),
          loader: 'js',
          resolveDir: process.cwd()
        };
      });
    }
  };
}

function generatePackageJsonPlugin(functionsPackage) {
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

        const outputPath = path.join(process.cwd(), OUTDIR, 'package.json');
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
        const firebaseJsonTarget = path.join(ryzizDir, 'firebase.json');
        fs.copyFileSync(firebaseJsonSource, firebaseJsonTarget);

        const firebasercSource = path.join(cwd, '.firebaserc');
        const firebasercTarget = path.join(ryzizDir, '.firebaserc');
        if (fs.existsSync(firebasercSource)) {
          fs.copyFileSync(firebasercSource, firebasercTarget);
        }
      });
    }
  };
}

function npmInstallPlugin() {
  return {
    name: 'npm-install',
    setup(build) {
      build.onEnd(async () => {
        const functionsDir = path.join(process.cwd(), OUTDIR);
        const nodeModulesPath = path.join(functionsDir, 'node_modules');

        if (!fs.existsSync(nodeModulesPath)) {
          await spawnAndWait('npm', ['install'], { cwd: functionsDir });
        }
      });
    }
  };
}

async function scanApiFiles() {
  const pattern = path.join(process.cwd(), 'src/api.*.js');
  const files = await glob(pattern);

  return files.map(file => {
    const filename = path.basename(file);
    const routePath = filenameToRoute(filename);
    const absolutePath = path.resolve(file);

    return { path: routePath, file: absolutePath };
  });
}

function filenameToRoute(filename) {
  const name = filename.replace('api.', '').replace('.js', '');
  if (name === 'index') return '/api/';

  return '/api/' + name.split('.').map(segment =>
    segment.startsWith('$') ? ':' + segment.slice(1) : segment
  ).join('/');
}

function generateRoutesConfig(routes) {
  const imports = routes.map((r, i) =>
    `import * as api${i} from '${r.file}';`
  ).join('\n');

  const array = routes.map((r, i) =>
    `  { path: '${r.path}', module: api${i} }`
  ).join(',\n');

  return `${imports}\n\nexport default [\n${array}\n];\n`;
}
