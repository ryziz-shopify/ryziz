#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from '../src/commands/init.js';
import { devCommand } from '../src/commands/dev.js';
import { deployCommand } from '../src/commands/deploy.js';
import { shopifyCommand } from '../src/commands/shopify.js';

// Constants
const VERSION = '0.0.1';
const LOGO = `
╦═╗╦ ╦╔═╗╦╔═╗
╠╦╝╚╦╝╔═╝║╔═╝
╩╚═ ╩ ╚═╝╩╚═╝  v${VERSION}
`;

// Step 1: Display welcome logo
console.log(chalk.cyan(LOGO));

// Step 2: Initialize CLI program
const program = new Command();

program
  .name('ryziz')
  .description('Shopify SSR Framework - Zero-config, Express-based, Firebase-powered')
  .version(VERSION);

// Step 3: Register commands
program
  .command('init')
  .description('Initialize a new Ryziz project')
  .option('--verbose', 'Enable verbose logging with detailed output')
  .action((options) => {
    if (options.verbose) process.env.DEBUG = 'true';
    initCommand();
  });

program
  .command('dev')
  .description('Start development server with Firebase emulators')
  .option('--verbose', 'Enable verbose logging with detailed output')
  .action((options) => {
    if (options.verbose) process.env.DEBUG = 'true';
    devCommand();
  });

program
  .command('deploy')
  .description('Deploy to Firebase')
  .option('--verbose', 'Enable verbose logging with detailed output')
  .action((options) => {
    if (options.verbose) process.env.DEBUG = 'true';
    deployCommand();
  });

program
  .command('shopify')
  .description('Run Shopify CLI commands')
  .option('--link', 'Link project to Shopify app')
  .option('--verbose', 'Enable verbose logging with detailed output')
  .action((options) => {
    if (options.verbose) process.env.DEBUG = 'true';
    shopifyCommand(options);
  });

// Step 4: Parse command-line arguments
program.parse();

// Step 5: Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
