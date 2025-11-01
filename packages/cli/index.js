#!/usr/bin/env node

import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer';
import buildFrontend from './src/build.frontend.js';
import buildBackend from './src/build.backend.js';
import deployShopify, { scanShopifyConfigs, writeCache } from './src/deploy.shopify.js';
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
    let tunnelUrl = '';
    let selectedConfig = '';

    await runTasks([
      createTask('Select config', async (task) => {
        const result = await scanShopifyConfigs(options.reset);
        const configs = result.configs;
        const fromCache = result.fromCache;

        if (configs.length === 0) {
          throw new Error('No Shopify config found. Try running: npm run link');
        }

        if (configs.length === 1) {
          selectedConfig = configs[0].value;
          task.output = fromCache
            ? `${selectedConfig} (cached, use --reset to change)`
            : selectedConfig;
          return;
        }

        selectedConfig = await task.prompt(ListrInquirerPromptAdapter).run(select, {
          message: 'Select Shopify config',
          choices: configs.map(c => ({
            name: `${c.label} (${c.name})`,
            value: c.value
          }))
        });
        writeCache({ shopifyConfig: selectedConfig });
        task.output = selectedConfig;
      }, {
        rendererOptions: {
          outputBar: Infinity,
          persistentOutput: true
        }
      }),
      createTask('Dev', (task) => {
        return sequential(task, [
          createTask('Build', (subtask) => {
            return parallel(subtask, [
              createTask('Build web', async () => {
                await buildFrontend({ watch: true });
              }),
              createTask('Setup functions', (subtask2) => {
                return sequential(subtask2, [
                  createTask('Build functions', async () => {
                    await buildBackend({ watch: true });
                  }),
                  createTask('Install packages', async () => {
                    await spawnWithCallback('npm', ['install'], {
                      cwd: '.ryziz/functions'
                    });
                  })
                ]);
              }),
              createTask('Create tunnel', async () => {
                await spawnWithCallback('npx', [
                  'cloudflared',
                  'tunnel',
                  '--url',
                  'http://localhost:8080'
                ], {
                  onLine(line, { resolve }) {
                    if (line.includes('.trycloudflare.com')) {
                      const match = line.match(/(https:\/\/[^\s]+\.trycloudflare\.com)/);
                      if (match) {
                        tunnelUrl = match[1];
                        resolve();
                      }
                    }
                  }
                });
              })
            ]);
          }),
          createTask('Start', (subtask) => {
            return parallel(subtask, [
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
                await deployShopify(tunnelUrl, selectedConfig);
                await spawnWithCallback('npx', [
                  'shopify',
                  'app',
                  'deploy',
                  '--config',
                  selectedConfig,
                  '--force'
                ]);
              })
            ]);
          }),
          createTask('Done', () => {
            task.title = 'Dev ready';
            task.output = tunnelUrl;
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
