#!/usr/bin/env node

import './patches.js';

import { CLI, spawn } from './src/cli.js';
import { locateTemplate, getFiles, copyFile, restoreDotfiles } from './src/init.js';
import {
  scanConfigs,
  saveCache,
  getCache,
  ensureAccess,
  loadEnv,
  writeEnv,
  updateConfig,
  buildWeb,
  buildFunctions
} from './src/build.js';
import { connect, prepareDir, exportCollection } from './src/pull.js';
import { join, basename } from 'path';
import { existsSync } from 'fs';

const cli = new CLI('ryziz', 'Ryziz CLI', '0.1.0');

cli
  .command('init', 'Initialize a new Ryziz project')
  .action(async (options, ctx) => {
    let ryzizPackagePath = '';
    const targetDir = process.cwd();

    await ctx.task('Init', async (ctx) => {
      await ctx.task('Setup project', async () => {
        await ctx.task('Locate template', async () => {
          ryzizPackagePath = await locateTemplate();
        });

        await ctx.parallel('Copy files to project', async (ctx) => {
          const files = getFiles(ryzizPackagePath);
          for (const file of files) {
            await ctx.task(file, async () => {
              await copyFile(file, ryzizPackagePath, targetDir);
            });
          }
        });

        await ctx.task('Restore dotfiles', async () => {
          await restoreDotfiles(targetDir);
        });

        await ctx.task('Configure project', async () => {
          await ctx.spawn('Clean package config', 'npm', ['pkg', 'delete', 'bin']);
          await ctx.spawn('Set package name', 'npm', ['pkg', 'set', `name=${basename(process.cwd())}`]);
          await ctx.spawn('Move CLI dependency', 'npm', ['pkg', 'set', 'devDependencies.@ryziz-shopify/cli=$(npm pkg get dependencies.@ryziz-shopify/cli | tr -d \'"\')']);
          await ctx.spawn('Delete CLI from dependencies', 'npm', ['pkg', 'delete', 'dependencies.@ryziz-shopify/cli']);
        });
      });

      await ctx.spawn('Install dependencies', 'npm', ['install']);

      await ctx.task('Done', (ctx) => {
        ctx.title = 'Init completed';
        ctx.output = 'Next: npm run link, then npm run dev';
      });
    });
  });

cli
  .command('dev', 'Development mode')
  .option('--reset', 'Reset Shopify config selection')
  .action(async (options, ctx) => {
    const shopify = {
      configPath: '',
      env: {},
      tunnel: ''
    };

    await ctx.task('Select config', async () => {
      await ctx.task('Scan configs', async () => {
        const result = await scanConfigs({ skipCache: options.reset });

        if (result.configs.length === 0) {
          throw new Error('No Shopify config found. Try running: npm run link');
        }

        if (result.configs.length === 1 || result.fromCache) {
          shopify.configPath = result.configs[0].value;
        }
      });

      await ctx.task('Choose config', async (ctx) => {
        if (!shopify.configPath) {
          const result = await scanConfigs({ skipCache: true });
          shopify.configPath = await ctx.select({
            message: 'Select Shopify config',
            choices: result.configs.map(c => ({
              name: `${c.label} (${c.name})`,
              value: c.value
            }))
          });
          saveCache(shopify.configPath);
        }
      });

      await ctx.task('Validate config', async () => {
        ensureAccess(shopify.configPath);
      });

      await ctx.task('Done', (ctx) => {
        const cachedConfig = getCache();
        const fromCache = cachedConfig === shopify.configPath;
        ctx.title = 'Config selected';
        ctx.output = fromCache
          ? `${shopify.configPath} (cached, use --reset to change)`
          : shopify.configPath;
      });
    });

    await ctx.task('Dev', async () => {
      await ctx.task('Load environment', async () => {
        shopify.env = loadEnv(shopify.configPath);
      });

      await ctx.parallel('Build', async (ctx) => {
        await ctx.task('Setup environment', async (ctx) => {
          await ctx.parallel('Fetch secrets', async (ctx) => {
            await ctx.spawn('Load API secret', 'shopify', [
              'app',
              'env',
              'show',
              '--config',
              shopify.configPath
            ], {
              onLine(line, { resolve }) {
                const match = line.match(/SHOPIFY_API_SECRET=(.+)/);
                if (match) {
                  shopify.env.SHOPIFY_API_SECRET = match[1].trim();
                  resolve();
                }
              }
            });

            await ctx.spawn('Create tunnel', 'cloudflared', [
              'tunnel',
              '--url',
              'http://localhost:8080'
            ], {
              onLine(line, { resolve, reject }) {
                if (line.includes('.trycloudflare.com')) {
                  const match = line.match(/(https:\/\/[^\s]+\.trycloudflare\.com)/);
                  if (match) {
                    shopify.tunnel = match[1];
                    resolve();
                  }
                }

                if (line.includes('ERR') && (line.includes('429') || line.includes('Too Many Requests'))) {
                  reject(new Error('Tunnel rate limited'));
                }
              }
            });
          });

          await ctx.task('Write .env', async () => {
            writeEnv(shopify.env, shopify.tunnel);
          });
        });

        await ctx.task('Build web', async () => {
          await buildWeb({ watch: true, apiKey: shopify.env.SHOPIFY_API_KEY });
        });

        await ctx.task('Setup functions', async (ctx) => {
          await ctx.task('Build functions', async () => {
            await buildFunctions({ watch: true });
          });

          await ctx.spawn('Install packages', 'npm', ['install'], {
            cwd: '.ryziz/functions'
          });
        });
      });

      await ctx.parallel('Start', async (ctx) => {
        await ctx.spawn('Start emulators', 'firebase', [
          'emulators:start',
          '--import=../emulator-data',
          '--export-on-exit=../emulator-data'
        ], {
          cwd: '.ryziz/functions',
          onLine(line, { resolve, reject }) {
            if (line.includes('All emulators ready!')) {
              resolve();
            }
            if (line.includes('is not open')) {
              reject(new Error('Port is not open. Try: pkill -f firebase'));
            }
          }
        });

        await ctx.task('Register app', async (ctx) => {
          await updateConfig(shopify.tunnel, shopify.configPath);
          await ctx.spawn('Deploy app config', 'shopify', [
            'app',
            'deploy',
            '--config',
            shopify.configPath,
            '--force'
          ]);
        });
      });

      await ctx.task('Done', (ctx) => {
        ctx.title = 'Dev started';
        ctx.output = shopify.tunnel;
      });
    });
  });

cli
  .command('link', 'Link Shopify app config')
  .action(async () => {
    spawn('shopify', ['app', 'config', 'link'], {
      stdio: 'inherit'
    });
  });

cli
  .command('deploy', 'Deploy to production')
  .option('--shopify-only', 'Only deploy Shopify config (skip build and Firebase)')
  .option('--reset', 'Reset Shopify config selection')
  .action(async (options, ctx) => {
    const shopifyOnly = options.shopifyOnly;
    const shopify = {
      configPath: '',
      env: {}
    };

    await ctx.task('Select config', async () => {
      await ctx.task('Scan configs', async () => {
        const result = await scanConfigs({ skipCache: true });

        if (result.configs.length === 0) {
          throw new Error('No Shopify config found. Try running: npm run link');
        }

        if (result.configs.length === 1) {
          shopify.configPath = result.configs[0].value;
        }
      });

      await ctx.task('Choose config', async (ctx) => {
        if (!shopify.configPath) {
          const result = await scanConfigs({ skipCache: true });
          shopify.configPath = await ctx.select({
            message: 'Select Shopify config',
            choices: result.configs.map(c => ({
              name: `${c.label} (${c.name})`,
              value: c.value
            }))
          });
        }
      });

      await ctx.task('Validate config', async () => {
        ensureAccess(shopify.configPath);
      });

      await ctx.task('Done', (ctx) => {
        ctx.title = 'Config selected';
        ctx.output = shopify.configPath;
      });
    });

    await ctx.task('Deploy', async () => {
      await ctx.task('Load environment', async () => {
        shopify.env = loadEnv(shopify.configPath);
      });

      await ctx.task('Setup environment', async () => {
        await ctx.spawn('Fetch API secret', 'shopify', [
          'app',
          'env',
          'show',
          '--config',
          shopify.configPath
        ], {
          onLine(line, { resolve }) {
            const match = line.match(/SHOPIFY_API_SECRET=(.+)/);
            if (match) {
              shopify.env.SHOPIFY_API_SECRET = match[1].trim();
              resolve();
            }
          }
        });

        await ctx.task('Write .env', async () => {
          writeEnv(shopify.env);
        });
      }, {
        skip: (ctx) => shopifyOnly ? 'Skipped (--shopify-only)' : false
      });

      await ctx.parallel('Build production', async (ctx) => {
        await ctx.task('Build frontend', async () => {
          await buildWeb({
            watch: false,
            apiKey: shopify.env.SHOPIFY_API_KEY
          });
        });

        await ctx.task('Build backend', async (ctx) => {
          await ctx.task('Build functions', async () => {
            await buildFunctions({ watch: false });
          });

          await ctx.spawn('Install production packages', 'npm', ['install', '--production'], {
            cwd: '.ryziz/functions'
          });
        });
      }, {
        skip: (ctx) => shopifyOnly ? 'Skipped (--shopify-only)' : false
      });

      await ctx.spawn('Deploy to Firebase', 'firebase', [
        'deploy',
        '--only',
        'hosting,functions'
      ], {
        cwd: '.ryziz/functions',
        skip: (ctx) => shopifyOnly ? 'Skipped (--shopify-only)' : false
      });

      await ctx.spawn('Deploy to Shopify', 'shopify', [
        'app',
        'deploy',
        '--config',
        shopify.configPath,
        '--force'
      ]);

      await ctx.task('Done', (ctx) => {
        ctx.title = 'Deploy completed';
        ctx.output = shopifyOnly
          ? 'Shopify config deployed'
          : 'Production deployed to Firebase and Shopify';
      });
    });
  });

cli
  .command('pull', 'Pull production Firestore data to local')
  .action(async (options, ctx) => {
    let serviceAccountPath = '';
    let collections = [];

    await ctx.task('Pull', async () => {
      await ctx.task('Enter service account path', async (ctx) => {
        serviceAccountPath = await ctx.input({
          message: 'Paste absolute path to service account JSON file'
        });

        if (!existsSync(serviceAccountPath)) {
          throw new Error(`Service account file not found: ${serviceAccountPath}`);
        }
      });

      await ctx.task('Connect to production', async () => {
        prepareDir();
        collections = await connect(serviceAccountPath);
      });

      await ctx.parallel('Export collections', async (ctx) => {
        for (const collection of collections) {
          await ctx.task(collection.id, async () => {
            await exportCollection(collection);
          });
        }
      });

      await ctx.task('Done', (ctx) => {
        ctx.title = 'Pull completed';
        ctx.output = 'Production data synced to .ryziz/emulator-data';
      });
    });
  });

cli.run();
