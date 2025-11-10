#!/usr/bin/env node

import './patches.js';

import { CLI, spawn } from './src/cli.js';
import { scanTemplate, copy, restoreDotfiles } from './src/init.js';
import { scanConfigs, saveCache, ensureAccess, loadEnv, writeEnv, updateConfig, buildWeb, buildFunctions } from './src/build.js';
import { connect, prepareDir, exportCollection } from './src/pull.js';
import { basename } from 'path';
import { existsSync } from 'fs';

const cli = new CLI('ryziz', 'Ryziz CLI', '0.1.0');

cli
  .command('init', 'Initialize a new Ryziz project')
  .action(async (options, ctx) => {
    ctx.task('Init', async (ctx) => {
      ctx.parallel('Copy files to project', async (ctx) => {
        const files = await scanTemplate();
        for (const file of files) {
          ctx.task(basename(file), async () => {
            await copy(file, process.cwd());
          });
        }
      });

      ctx.task('Restore dotfiles', async () => {
        await restoreDotfiles(process.cwd());
      });

      ctx.task('Configure project', async (ctx) => {
        ctx.spawn('Clean package config', 'npm', ['pkg', 'delete', 'bin']);
        ctx.spawn('Set package name', 'npm', ['pkg', 'set', `name=${basename(process.cwd())}`]);
        ctx.spawn('Move CLI dependency', 'npm', ['pkg', 'set', 'devDependencies.@ryziz-shopify/cli=$(npm pkg get dependencies.@ryziz-shopify/cli | tr -d \'"\')']);
        ctx.spawn('Delete CLI from dependencies', 'npm', ['pkg', 'delete', 'dependencies.@ryziz-shopify/cli']);
      });

      ctx.spawn('Install dependencies', 'npm', ['install']);

      ctx.task('Done', () => {
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
      fromCache: false,
      env: {},
      tunnel: ''
    };

    ctx.task('Select config', async (ctx) => {
      ctx.task('Scan configs', async () => {
        const result = await scanConfigs({ skipCache: options.reset });

        if (result.configs.length === 0) {
          throw new Error('No Shopify config found. Try running: npm run link');
        }

        if (result.configs.length === 1 || result.fromCache) {
          shopify.configPath = result.configs[0].value;
          shopify.fromCache = result.fromCache;
        }
      });

      ctx.task('Choose config', async (ctx) => {
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

      ctx.task('Validate config', async () => {
        ensureAccess(shopify.configPath);
      });

      ctx.task('Done', () => {
        ctx.title = 'Config selected';
        ctx.output = shopify.fromCache
          ? `${shopify.configPath} (cached, use --reset to change)`
          : shopify.configPath;
      });
    });

    ctx.task('Dev', async (ctx) => {
      ctx.task('Load environment', async () => {
        shopify.env = loadEnv(shopify.configPath);
      });

      ctx.parallel('Build development', async (ctx) => {
        ctx.task('Prepare runtime environment', async (ctx) => {
          ctx.parallel('Fetch credentials', async (ctx) => {
            ctx.spawn('Fetch API secret', 'shopify', [
              'app',
              'env',
              'show',
              '--config',
              shopify.configPath
            ], {
              onLine(line, { resolve, reject }) {
                if (line.includes('No app with client ID')) {
                  reject(new Error("Shopify authentication failed. Please run 'npm run link' to configure your app or contact the organization owner to grant access."));
                  return;
                }

                const match = line.match(/SHOPIFY_API_SECRET=(.+)/);
                if (match) {
                  shopify.env.SHOPIFY_API_SECRET = match[1].trim();
                  resolve();
                }
              }
            });

            ctx.spawn('Create tunnel', 'cloudflared', [
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
        });

        ctx.task('Build frontend', async () => {
          await buildWeb({ watch: true, apiKey: shopify.env.SHOPIFY_API_KEY });
        });

        ctx.task('Setup functions', async (ctx) => {
          ctx.task('Build functions', async () => {
            await buildFunctions({ watch: true });
          });

          ctx.spawn('Install packages', 'npm', ['install'], {
            cwd: '.ryziz/functions'
          });
        });
      });

      ctx.task('Write .env file', async () => {
        writeEnv(shopify.env, shopify.tunnel);
      });

      ctx.parallel('Start', async (ctx) => {
        ctx.spawn('Start emulators', 'firebase', [
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

        ctx.task('Register app', async (ctx) => {
          await updateConfig(shopify.tunnel, shopify.configPath);
          ctx.spawn('Deploy app config', 'shopify', [
            'app',
            'deploy',
            '--config',
            shopify.configPath,
            '--force'
          ]);
        });
      });

      ctx.task('Done', () => {
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

    ctx.task('Select config', async (ctx) => {
      ctx.task('Scan configs', async () => {
        const result = await scanConfigs({ skipCache: true });

        if (result.configs.length === 0) {
          throw new Error('No Shopify config found. Try running: npm run link');
        }

        if (result.configs.length === 1) {
          shopify.configPath = result.configs[0].value;
        }
      });

      ctx.task('Choose config', async (ctx) => {
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

      ctx.task('Validate config', async () => {
        ensureAccess(shopify.configPath);
      });

      ctx.task('Done', () => {
        ctx.title = 'Config selected';
        ctx.output = shopify.configPath;
      });
    });

    ctx.task('Deploy', async (ctx) => {
      ctx.task('Load environment', async () => {
        shopify.env = loadEnv(shopify.configPath);
      });

      ctx.parallel('Build production', async (ctx) => {
        ctx.task('Prepare runtime environment', async (ctx) => {
          ctx.spawn('Fetch API secret', 'shopify', [
            'app',
            'env',
            'show',
            '--config',
            shopify.configPath
          ], {
            onLine(line, { resolve, reject }) {
              if (line.includes('No app with client ID')) {
                reject(new Error("Shopify authentication failed. Please run 'npm run link' to configure your app or contact the organization owner to grant access."));
                return;
              }

              const match = line.match(/SHOPIFY_API_SECRET=(.+)/);
              if (match) {
                shopify.env.SHOPIFY_API_SECRET = match[1].trim();
                resolve();
              }
            }
          });
        });

        ctx.task('Build frontend', async () => {
          await buildWeb({
            watch: false,
            apiKey: shopify.env.SHOPIFY_API_KEY
          });
        });

        ctx.task('Setup functions', async (ctx) => {
          ctx.task('Build functions', async () => {
            await buildFunctions({ watch: false });
          });

          ctx.spawn('Install packages', 'npm', ['install', '--production'], {
            cwd: '.ryziz/functions'
          });
        });
      }, {
        skip: (ctx) => shopifyOnly ? 'Skipped (--shopify-only)' : false
      });

      ctx.task('Write .env file', async () => {
        writeEnv(shopify.env);
      }, {
        skip: (ctx) => shopifyOnly ? 'Skipped (--shopify-only)' : false
      });

      ctx.parallel('Deploy services', async (ctx) => {
        ctx.spawn('Deploy to Firebase', 'firebase', [
          'deploy',
          '--only',
          'hosting,functions'
        ], {
          cwd: '.ryziz/functions',
          skip: (ctx) => shopifyOnly ? 'Skipped (--shopify-only)' : false
        });

        ctx.spawn('Deploy to Shopify', 'shopify', [
          'app',
          'deploy',
          '--config',
          shopify.configPath,
          '--force'
        ]);
      });

      ctx.task('Done', () => {
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

    ctx.task('Pull', async (ctx) => {
      ctx.task('Enter service account path', async (ctx) => {
        serviceAccountPath = await ctx.input({
          message: 'Paste absolute path to service account JSON file'
        });

        if (!existsSync(serviceAccountPath)) {
          throw new Error(`Service account file not found: ${serviceAccountPath}`);
        }
      });

      ctx.task('Connect to production', async () => {
        prepareDir();
        collections = await connect(serviceAccountPath);
      });

      ctx.parallel('Export collections', async (ctx) => {
        for (const collection of collections) {
          ctx.task(collection.id, async () => {
            await exportCollection(collection);
          });
        }
      });

      ctx.task('Done', () => {
        ctx.title = 'Pull completed';
        ctx.output = 'Production data synced to .ryziz/emulator-data';
      });
    });
  });

cli.run();
