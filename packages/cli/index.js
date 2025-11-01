#!/usr/bin/env node

import { Command } from 'commander';
import buildFrontend from './src/build.frontend.js';
import buildBackend from './src/build.backend.js';
import { runTasks, createTask, sequential, parallel } from './src/util.task.js';
import { spawnAndWait } from './src/util.spawn.js';

const program = new Command();

program
  .name('ryziz')
  .description('Ryziz CLI')
  .version('0.1.0');

program
  .command('dev')
  .description('Development mode')
  .action(async () => {
    await runTasks([
      createTask('Dev', (task) => {
        return sequential(task, [
          createTask('Start services', (subtask) => {
            return parallel(subtask, [
              createTask('Watch frontend', async () => {
                await buildFrontend({ watch: true });
              }),
              createTask('Watch backend', async () => {
                await buildBackend({ watch: true });
              })
            ]);
          }),
          createTask('Start emulators', async () => {
            await spawnAndWait('npx', [
              'firebase',
              'emulators:start'
            ], {
              cwd: '.ryziz/functions'
            });
          }),
          createTask('Done', () => {
            task.title = 'Dev started';
            task.output = 'Emulators: http://localhost:8080';
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
