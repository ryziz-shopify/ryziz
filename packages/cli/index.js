#!/usr/bin/env node

import './src/patches.js';

import { Command } from 'commander';
import { runTasks, createTask, sequential, parallel } from './src/task.js';
import { spawnWithCallback, spawnCommand } from './src/spawn.js';
import { locatePackage, scanConfigs, readEnv, readCache, writeCache } from './src/system.js';
import { updateConfig } from './src/shopify.js';
import { buildFrontend, buildBackend } from './src/build.js';
import { pullFirestore } from './src/firebase.js';
import { select, input } from '@inquirer/prompts';
import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer';
import { join, basename } from 'path';
import { readdirSync, existsSync, writeFileSync } from 'fs';
import { stat, cp, copyFile, rename } from 'fs/promises';

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
                ryzizPackagePath = await locatePackage('@ryziz-shopify/ryziz');
              }),

              createTask('Copy files to project', (task) => {
                return parallel(task, readdirSync(ryzizPackagePath)
                  .filter(file => file !== 'node_modules')
                  .map(file =>
                    createTask(file, async () => {
                      if ((await stat(join(ryzizPackagePath, file))).isDirectory()) {
                        await cp(join(ryzizPackagePath, file), join(targetDir, file), { recursive: true });
                      } else {
                        await copyFile(join(ryzizPackagePath, file), join(targetDir, file));
                      }
                    })
                  ));
              }),

              createTask('Restore dotfiles', async () => {
                if (existsSync(join(targetDir, 'gitignore'))) {
                  await rename(
                    join(targetDir, 'gitignore'),
                    join(targetDir, '.gitignore')
                  );
                }
              }),

              createTask('Configure project', (task) => {
                return sequential(task, [
                  createTask('Clean package config', async () => {
                    await spawnWithCallback('npm', ['pkg', 'delete', 'bin']);
                  }),
                  createTask('Set package name', async () => {
                    await spawnWithCallback('npm', ['pkg', 'set', `name=${basename(process.cwd())}`]);
                  }),
                  createTask('Move CLI dependency', async () => {
                    await spawnWithCallback('npm', ['pkg', 'set', 'devDependencies.@ryziz-shopify/cli=$(npm pkg get dependencies.@ryziz-shopify/cli | tr -d \'"\')']);
                    await spawnWithCallback('npm', ['pkg', 'delete', 'dependencies.@ryziz-shopify/cli']);
                  })
                ]);
              })
            ]);
          }),

          createTask('Install dependencies', async () => {
            await spawnWithCallback('npm', ['install']);
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
        return sequential(task, [
          createTask('Scan configs', async () => {
            const result = await scanConfigs({ skipCache: options.reset });

            if (result.configs.length === 0) {
              throw new Error('No Shopify config found. Try running: npm run link');
            }

            if (result.configs.length === 1 || result.fromCache) {
              shopify.configPath = result.configs[0].value;
            }
          }),

          createTask('Choose config', async (task) => {
            if (!shopify.configPath) {
              const result = await scanConfigs({ skipCache: true });
              shopify.configPath = await task.prompt(ListrInquirerPromptAdapter).run(select, {
                message: 'Select Shopify config',
                choices: result.configs.map(c => ({
                  name: `${c.label} (${c.name})`,
                  value: c.value
                }))
              });
              writeCache({ shopifyConfig: shopify.configPath });
            }
          }),

          createTask('Done', () => {
            const cache = readCache();
            const fromCache = cache.shopifyConfig === shopify.configPath;
            task.title = 'Config selected';
            task.output = fromCache
              ? `${shopify.configPath} (cached, use --reset to change)`
              : shopify.configPath;
          })
        ]);
      }, {
        rendererOptions: {
          outputBar: Infinity,
          persistentOutput: true
        }
      }),

      createTask('Dev', (task) => {
        return sequential(task, [
          createTask('Load environment', async () => {
            shopify.env = readEnv(shopify.configPath);
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

                    writeFileSync(
                      join(process.cwd(), '.ryziz/functions/.env'),
                      Object.entries(shopify.env)
                        .map(([key, value]) => `${key}=${value}`)
                        .join('\n')
                    );
                  })
                ]);
              }),

              createTask('Build web', async () => {
                await buildFrontend({ watch: true, apiKey: shopify.env.SHOPIFY_API_KEY });
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
                await updateConfig(shopify.tunnel, shopify.configPath);
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
    const shopifyOnly = options.shopifyOnly;
    const shopify = {
      configPath: '',
      env: {}
    };

    await runTasks([
      createTask('Select config', (task) => {
        return sequential(task, [
          createTask('Scan configs', async () => {
            const result = await scanConfigs({ skipCache: true });

            if (result.configs.length === 0) {
              throw new Error('No Shopify config found. Try running: npm run link');
            }

            if (result.configs.length === 1) {
              shopify.configPath = result.configs[0].value;
            }
          }),

          createTask('Choose config', async (task) => {
            if (!shopify.configPath) {
              const result = await scanConfigs({ skipCache: true });
              shopify.configPath = await task.prompt(ListrInquirerPromptAdapter).run(select, {
                message: 'Select Shopify config',
                choices: result.configs.map(c => ({
                  name: `${c.label} (${c.name})`,
                  value: c.value
                }))
              });
            }
          }),

          createTask('Done', () => {
            task.title = 'Config selected';
            task.output = shopify.configPath;
          })
        ]);
      }, {
        rendererOptions: {
          outputBar: Infinity,
          persistentOutput: true
        }
      }),

      createTask('Deploy', (task) => {
        return sequential(task, [
          createTask('Load environment', async () => {
            shopify.env = readEnv(shopify.configPath);
          }),

          createTask('Setup environment', (task) => {
            return sequential(task, [
              createTask('Fetch API secret', async () => {
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

              createTask('Write .env', async () => {
                writeFileSync(
                  join(process.cwd(), '.ryziz/functions/.env'),
                  Object.entries(shopify.env)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('\n')
                );
              })
            ]);
          }, {
            skip: (ctx) => ctx.shopifyOnly ? 'Skipped (--shopify-only)' : false
          }),

          createTask('Build production', (task) => {
            return parallel(task, [
              createTask('Build frontend', async () => {
                await buildFrontend({
                  watch: false,
                  apiKey: shopify.env.SHOPIFY_API_KEY
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
              cwd: '.ryziz/functions',
            });
          }, {
            skip: (ctx) => ctx.shopifyOnly ? 'Skipped (--shopify-only)' : false
          }),

          createTask('Deploy to Shopify', async () => {
            await spawnWithCallback('shopify', [
              'app',
              'deploy',
              '--config',
              shopify.configPath,
              '--force'
            ]);
          }),

          createTask('Done', () => {
            task.title = 'Deploy completed';
            task.output = shopifyOnly
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
    ]);
  });

program
  .command('pull')
  .description('Pull production Firestore data to local')
  .action(async () => {
    let serviceAccountPath = '';
    let collections = [];

    await runTasks([
      createTask('Pull', (task) => {
        return sequential(task, [
          createTask('Enter service account path', async (task) => {
            serviceAccountPath = await task.prompt(ListrInquirerPromptAdapter).run(input, {
              message: 'Paste absolute path to service account JSON file'
            });

            if (!existsSync(serviceAccountPath)) {
              throw new Error(`Service account file not found: ${serviceAccountPath}`);
            }
          }),

          createTask('Connect to production', async () => {
            collections = await pullFirestore(serviceAccountPath);
          }),

          createTask('Export collections', (task) => {
            return parallel(task, collections.map(c =>
              createTask(c.id, async () => {
                await c.export();
              })
            ));
          }),

          createTask('Done', () => {
            task.title = 'Pull completed';
            task.output = 'Production data synced to .ryziz/emulator-data';
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

program.parse();
