#!/usr/bin/env node

import './src/util.apply-patches.js';

import { Command } from 'commander';
import buildFrontend from './src/build.frontend.js';
import buildBackend from './src/build.backend.js';
import deployShopify, { readShopifyEnv, createSelectConfigTask } from './src/deploy.shopify.js';
import { createPullTasks } from './src/deploy.firestore.js';
import { runTasks, createTask, sequential, parallel } from './src/util.task.js';
import { spawnWithCallback, spawnCommand } from './src/util.spawn.js';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';

const program = new Command();

program
  .name('ryziz')
  .description('Ryziz CLI')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new Ryziz project')
  .action(async () => {
    let ryzizPackagePath = '';
    const targetDir = process.cwd();

    await runTasks([
      createTask('Init', (task) => {
        return sequential(task, [
          createTask('Setup project', (task) => {
            return sequential(task, [
              createTask('Locate template', async () => {
                const module = await import('module');
                const packageJsonPath = module.createRequire(import.meta.url).resolve('@ryziz-shopify/ryziz/package.json');
                ryzizPackagePath = path.dirname(packageJsonPath);
              }),
              createTask('Copy files to project', (task) => {
                return parallel(task, fs.readdirSync(ryzizPackagePath)
                  .filter(file => file !== 'node_modules')
                  .map(file =>
                    createTask(file, async () => {
                      const source = path.join(ryzizPackagePath, file);
                      const dest = path.join(targetDir, file);

                      const stats = await fsPromises.stat(source);
                      if (stats.isDirectory()) {
                        await fsPromises.cp(source, dest, { recursive: true });
                      } else {
                        await fsPromises.copyFile(source, dest);
                      }
                    })
                  ));
              }),
              createTask('Restore dotfiles', async () => {
                if (fs.existsSync(path.join(targetDir, 'gitignore'))) {
                  await fsPromises.rename(
                    path.join(targetDir, 'gitignore'),
                    path.join(targetDir, '.gitignore')
                  );
                }
              }),
              createTask('Configure project', (task) => {
                return sequential(task, [
                  createTask('Clean package config', async () => {
                    await spawnWithCallback('npm', ['pkg', 'delete', 'bin']);
                  }),
                  createTask('Set package name', async () => {
                    await spawnWithCallback('npm', ['pkg', 'set', `name=${path.basename(process.cwd())}`]);
                  })
                ]);
              })
            ]);
          }),
          createTask('Install dependencies', async () => {
            await spawnWithCallback('npm', ['install']);
            await spawnWithCallback('npm', ['install', '@ryziz-shopify/cli', '--save-dev']);
          }),
          createTask('Done', () => {
            task.title = 'Init completed';
            task.output = 'Next: npm run link, then npm run dev';
          })
        ]);
      }, {
        rendererOptions: {
          outputBar: Infinity,
          persistentOutput: true
        }
      })
    ]);
  });

program
  .command('dev')
  .description('Development mode')
  .option('--reset', 'Reset Shopify config selection')
  .action(async (options) => {
    const shopify = {
      configPath: '',
      env: {},
      tunnel: ''
    };

    await runTasks([
      createTask('Select config', (task) => {
        return sequential(task, createSelectConfigTask(shopify, options));
      }, {
        rendererOptions: {
          outputBar: Infinity,
          persistentOutput: true
        }
      }),
      createTask('Dev', (task) => {
        return sequential(task, [
          createTask('Load environment', async () => {
            shopify.env = readShopifyEnv(shopify.configPath);
          }),
          createTask('Build', (task) => {
            return parallel(task, [
              createTask('Setup environment', (task) => {
                return sequential(task, [
                  createTask('Fetch secrets', (task) => {
                    return parallel(task, [
                      createTask('Load API secret', async () => {
                        await spawnWithCallback('shopify', [
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
                      }),
                      createTask('Create tunnel', async () => {
                        await spawnWithCallback('cloudflared', [
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
                      })
                    ]);
                  }),
                  createTask('Write .env', async () => {
                    shopify.env.SHOPIFY_HOST_NAME = shopify.tunnel.replace(/^https?:\/\//, '');

                    fs.writeFileSync(
                      path.join(process.cwd(), '.ryziz/functions/.env'),
                      Object.entries(shopify.env)
                        .map(([key, value]) => `${key}=${value}`)
                        .join('\n')
                    );
                  })
                ]);
              }),
              createTask('Build web', async () => {
                await buildFrontend({ watch: true, shopifyApiKey: shopify.env.SHOPIFY_API_KEY });
              }),
              createTask('Setup functions', (task) => {
                return sequential(task, [
                  createTask('Build functions', async () => {
                    await buildBackend({ watch: true });
                  }),
                  createTask('Install packages', async () => {
                    await spawnWithCallback('npm', ['install'], {
                      cwd: '.ryziz/functions'
                    });
                  })
                ]);
              })
            ]);
          }),
          createTask('Start', (task) => {
            return parallel(task, [
              createTask('Start emulators', async () => {
                await spawnWithCallback('firebase', [
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
              }),
              createTask('Register app', async () => {
                await deployShopify(shopify.tunnel, shopify.configPath);
                await spawnWithCallback('shopify', [
                  'app',
                  'deploy',
                  '--config',
                  shopify.configPath,
                  '--force'
                ]);
              })
            ]);
          }),
          createTask('Done', () => {
            task.title = 'Dev started';
            task.output = shopify.tunnel;
          })
        ]);
      }, {
        rendererOptions: {
          outputBar: Infinity,
          persistentOutput: true
        }
      })
    ]);
  });

program
  .command('link')
  .description('Link Shopify app config')
  .action(async () => {
    spawnCommand('shopify', ['app', 'config', 'link'], {
      stdio: 'inherit'
    });
  });

program
  .command('deploy')
  .description('Deploy to production')
  .option('--shopify-only', 'Only deploy Shopify config (skip build and Firebase)')
  .option('--reset', 'Reset Shopify config selection')
  .action(async (options) => {
    const ctx = {
      shopifyOnly: options.shopifyOnly,
      shopify: {
        configPath: '',
        env: {}
      }
    };

    await runTasks([
      createTask('Select config', (task) => {
        return sequential(task, createSelectConfigTask(ctx.shopify, options));
      }, {
        rendererOptions: {
          outputBar: Infinity,
          persistentOutput: true
        }
      }),
      createTask('Deploy', (task) => {
        return sequential(task, [
          createTask('Load environment', async () => {
            ctx.shopify.env = readShopifyEnv(ctx.shopify.configPath);
          }),
          createTask('Build production', (task) => {
            return parallel(task, [
              createTask('Build frontend', async () => {
                await buildFrontend({
                  watch: false,
                  shopifyApiKey: ctx.shopify.env.SHOPIFY_API_KEY
                });
              }),
              createTask('Build backend', (task) => {
                return sequential(task, [
                  createTask('Build functions', async () => {
                    await buildBackend({ watch: false });
                  }),
                  createTask('Install production packages', async () => {
                    await spawnWithCallback('npm', ['install', '--production'], {
                      cwd: '.ryziz/functions'
                    });
                  })
                ]);
              })
            ]);
          }, {
            skip: (ctx) => ctx.shopifyOnly ? 'Skipped (--shopify-only)' : false
          }),
          createTask('Deploy to Firebase', async () => {
            await spawnWithCallback('firebase', [
              'deploy',
              '--only',
              'hosting,functions'
            ], {
              cwd: '.ryziz'
            });
          }, {
            skip: (ctx) => ctx.shopifyOnly ? 'Skipped (--shopify-only)' : false
          }),
          createTask('Deploy to Shopify', async () => {
            await spawnWithCallback('shopify', [
              'app',
              'deploy',
              '--config',
              ctx.shopify.configPath,
              '--force'
            ]);
          }),
          createTask('Done', () => {
            task.title = 'Deploy completed';
            task.output = ctx.shopifyOnly
              ? 'Shopify config deployed'
              : 'Production deployed to Firebase and Shopify';
          })
        ]);
      }, {
        rendererOptions: {
          outputBar: Infinity,
          persistentOutput: true
        }
      })
    ], { ctx });
  });

program
  .command('pull')
  .description('Pull production Firestore data to local')
  .action(async () => {
    await runTasks([
      createTask('Pull', (task) => {
        return createPullTasks(task);
      }, {
        rendererOptions: {
          outputBar: Infinity,
          persistentOutput: true
        }
      })
    ]);
  });

program.parse();
