#!/usr/bin/env node

/**
 * FURLOW CLI - Command-line interface for FURLOW Discord bot framework
 */

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { devCommand } from './commands/dev.js';
import { validateCommand } from './commands/validate.js';
import { addCommand } from './commands/add.js';
import { buildCommand } from './commands/build.js';
import { exportCommand } from './commands/export.js';

const program = new Command();

program
  .name('furlow')
  .description('FURLOW - Declarative Discord Bot Framework')
  .version('0.1.0');

// Init command - scaffold a new bot
program
  .command('init [name]')
  .description('Create a new FURLOW bot project')
  .option('-t, --template <template>', 'Template to use', 'simple')
  .option('--no-git', 'Skip git initialization')
  .option('--no-install', 'Skip dependency installation')
  .action(initCommand);

// Start command - run the bot
program
  .command('start [path]')
  .description('Start the FURLOW bot')
  .option('-e, --env <file>', 'Path to .env file', '.env')
  .option('-g, --guild <id>', 'Register commands to specific guild (instant)')
  .option('-v, --verbose', 'Enable verbose logging (shows context, actions, results)')
  .option('--no-validate', 'Skip schema validation')
  .action(startCommand);

// Dev command - run with hot reload
program
  .command('dev [path]')
  .description('Start the bot in development mode with hot reload')
  .option('-e, --env <file>', 'Path to .env file', '.env')
  .option('--no-validate', 'Skip schema validation')
  .action(devCommand);

// Validate command - check YAML syntax and schema
program
  .command('validate <path>')
  .description('Validate a FURLOW specification file')
  .option('--strict', 'Enable strict validation')
  .action(validateCommand);

// Add command - add builtins to a project
program
  .command('add <builtin>')
  .description('Add a builtin module to your project')
  .option('--list', 'List available builtins')
  .action(addCommand);

// Build command - bundle for deployment
program
  .command('build [path]')
  .description('Bundle the bot for deployment')
  .option('-o, --output <dir>', 'Output directory', 'dist')
  .action(buildCommand);

// Export command - generate Discord command JSON
program
  .command('export <path>')
  .description('Export Discord command registration JSON')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('-g, --guild <id>', 'Export commands for specific guild')
  .action(exportCommand);

program.parse();
