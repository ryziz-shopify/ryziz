#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from '../src/commands/init.js';
import { devCommand } from '../src/commands/dev.js';
import { deployCommand } from '../src/commands/deploy.js';

const program = new Command();

// ASCII art logo
console.log(chalk.cyan(`
╦═╗╦ ╦╔═╗╦╔═╗
╠╦╝╚╦╝╔═╝║╔═╝
╩╚═ ╩ ╚═╝╩╚═╝  v0.0.1
`));

program
  .name('ryziz')
  .description('Shopify SSR Framework - Zero-config, Express-based, Firebase-powered')
  .version('0.0.1');

// Init command
program
  .command('init')
  .description('Initialize a new Ryziz project')
  .action(initCommand);

// Dev command
program
  .command('dev')
  .description('Start development server with Firebase emulators')
  .action(devCommand);

// Deploy command
program
  .command('deploy')
  .description('Deploy to Firebase')
  .action(deployCommand);

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
