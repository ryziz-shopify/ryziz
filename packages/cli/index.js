#!/usr/bin/env node

import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer';
import buildFrontend from './src/build.frontend.js';
import buildBackend from './src/build.backend.js';
import deployShopify, { scanShopifyConfigs, writeCache, readShopifyEnv } from './src/deploy.shopify.js';
import { runTasks, createTask, sequential, parallel } from './src/util.task.js';
import { spawnWithCallback } from './src/util.spawn.js';

const program = new Command();

program
  .name('ryziz')
  .description('Ryziz CLI')
  .version('0.1.0');

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
        let configs = [];
        let fromCache = false;

        return sequential(task, [
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
              shopify.configPath = configs[0].value;
              return;
            }

            shopify.configPath = await task.prompt(ListrInquirerPromptAdapter).run(select, {
              message: 'Select Shopify config',
              choices: configs.map(c => ({
                name: `${c.label} (${c.name})`,
                value: c.value
              }))
            });
            writeCache({ shopifyConfig: shopify.configPath });
          }),
          createTask('Done', () => {
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
            shopify.env = readShopifyEnv(shopify.configPath);
          }),
          createTask('Build', (task) => {
            return parallel(task, [
              createTask('Setup environment', (task) => {
                return sequential(task, [
                  createTask('Fetch secrets', (task) => {
                    return parallel(task, [
                      createTask('Load API secret', async () => {
                        await spawnWithCallback('npx', [
                          'shopify',
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
                        await spawnWithCallback('npx', [
                          '--yes',
                          'cloudflared',
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
                    const fs = await import('fs');
                    const path = await import('path');

                    shopify.env.SHOPIFY_HOST_NAME = shopify.tunnel.replace(/^https?:\/\//, '');

                    const envContent = Object.entries(shopify.env)
                      .map(([key, value]) => `${key}=${value}`)
                      .join('\n');

                    const envPath = path.default.join(process.cwd(), '.ryziz/functions/.env');
                    fs.default.writeFileSync(envPath, envContent);
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
                await spawnWithCallback('npx', [
                  'firebase',
                  'emulators:start'
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
                await spawnWithCallback('npx', [
                  'shopify',
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
            task.title = 'Dev ready';
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

program.parse();
