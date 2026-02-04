/**
 * Export command - generate Discord command registration JSON
 */

import { resolve, relative } from 'node:path';
import { writeFile } from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import type {
  CommandDefinition,
  CommandOption,
  SubcommandDefinition,
  SubcommandGroup,
  ContextMenuCommand,
} from '@furlow/schema';

interface ExportOptions {
  output?: string;
  guild?: string;
}

// Discord API option types
const OPTION_TYPE_MAP: Record<string, number> = {
  string: 3,
  integer: 4,
  boolean: 5,
  user: 6,
  channel: 7,
  role: 8,
  mentionable: 9,
  number: 10,
  attachment: 11,
};

// Discord API channel types
const CHANNEL_TYPE_MAP: Record<string, number> = {
  text: 0,
  voice: 2,
  category: 4,
  announcement: 5,
  stage: 13,
  forum: 15,
};

interface DiscordOption {
  name: string;
  description: string;
  type: number;
  required?: boolean;
  choices?: { name: string; value: string | number }[];
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  autocomplete?: boolean;
  channel_types?: number[];
  options?: DiscordOption[];
}

interface DiscordCommand {
  name: string;
  description: string;
  type?: number;
  options?: DiscordOption[];
  dm_permission?: boolean;
  nsfw?: boolean;
  default_member_permissions?: string | null;
}

function transformOption(opt: CommandOption): DiscordOption {
  const discordOpt: DiscordOption = {
    name: opt.name,
    description: opt.description,
    type: OPTION_TYPE_MAP[opt.type] ?? 3,
  };

  if (opt.required) discordOpt.required = true;
  if (opt.choices) discordOpt.choices = opt.choices;
  if (opt.min_value !== undefined) discordOpt.min_value = opt.min_value;
  if (opt.max_value !== undefined) discordOpt.max_value = opt.max_value;
  if (opt.min_length !== undefined) discordOpt.min_length = opt.min_length;
  if (opt.max_length !== undefined) discordOpt.max_length = opt.max_length;
  if (opt.autocomplete) discordOpt.autocomplete = true;
  if (opt.channel_types) {
    discordOpt.channel_types = opt.channel_types.map((t) => CHANNEL_TYPE_MAP[t] ?? 0);
  }

  return discordOpt;
}

function transformSubcommand(sub: SubcommandDefinition): DiscordOption {
  const discordSub: DiscordOption = {
    name: sub.name,
    description: sub.description,
    type: 1, // SUB_COMMAND
  };

  if (sub.options?.length) {
    discordSub.options = sub.options.map(transformOption);
  }

  return discordSub;
}

function transformSubcommandGroup(group: SubcommandGroup): DiscordOption {
  return {
    name: group.name,
    description: group.description,
    type: 2, // SUB_COMMAND_GROUP
    options: group.subcommands.map(transformSubcommand),
  };
}

function transformCommand(cmd: CommandDefinition): DiscordCommand {
  const discordCmd: DiscordCommand = {
    name: cmd.name,
    description: cmd.description,
    type: cmd.type === 'user' ? 2 : cmd.type === 'message' ? 3 : 1,
  };

  // Build options array
  const options: DiscordOption[] = [];

  // Add subcommand groups first
  if (cmd.subcommand_groups?.length) {
    options.push(...cmd.subcommand_groups.map(transformSubcommandGroup));
  }

  // Add subcommands
  if (cmd.subcommands?.length) {
    options.push(...cmd.subcommands.map(transformSubcommand));
  }

  // Add regular options (only if no subcommands)
  if (cmd.options?.length && !cmd.subcommands?.length && !cmd.subcommand_groups?.length) {
    options.push(...cmd.options.map(transformOption));
  }

  if (options.length > 0) {
    discordCmd.options = options;
  }

  // Add permissions
  if (cmd.dm_permission !== undefined) discordCmd.dm_permission = cmd.dm_permission;
  if (cmd.nsfw) discordCmd.nsfw = true;

  // Transform access rules to default_member_permissions if applicable
  if (cmd.access?.allow?.permissions?.length) {
    discordCmd.default_member_permissions = cmd.access.allow.permissions.join(',');
  }

  return discordCmd;
}

function transformContextMenu(menu: ContextMenuCommand): DiscordCommand {
  return {
    name: menu.name,
    description: '', // Context menus don't have descriptions
    type: menu.type === 'user' ? 2 : 3,
  };
}

export async function exportCommand(
  path: string,
  options: ExportOptions
): Promise<void> {
  const specPath = resolve(path);
  const relPath = relative(process.cwd(), specPath);

  console.log(chalk.bold.cyan('\n  FURLOW Export\n'));
  console.log(chalk.dim(`  File: ${relPath}\n`));

  const spinner = ora('Loading specification...').start();

  try {
    const { loadSpec } = await import('@furlow/core/parser');

    // Load the spec (skip validation for speed)
    const { spec, files } = await loadSpec(specPath, {
      validate: false,
    });

    spinner.succeed(`Loaded ${files.length} file(s)`);

    // Collect all commands
    const commands: DiscordCommand[] = [];
    const guildCommands: Map<string, DiscordCommand[]> = new Map();

    // Process slash commands
    if (spec.commands) {
      for (const cmd of spec.commands) {
        const discordCmd = transformCommand(cmd);

        if (cmd.guild_ids?.length) {
          // Guild-specific commands
          for (const guildId of cmd.guild_ids) {
            const existing = guildCommands.get(guildId) ?? [];
            existing.push(discordCmd);
            guildCommands.set(guildId, existing);
          }
        } else {
          // Global commands
          commands.push(discordCmd);
        }
      }
    }

    // Process context menus
    if (spec.context_menus) {
      for (const menu of spec.context_menus) {
        const discordCmd = transformContextMenu(menu);

        if (menu.guild_ids?.length) {
          for (const guildId of menu.guild_ids) {
            const existing = guildCommands.get(guildId) ?? [];
            existing.push(discordCmd);
            guildCommands.set(guildId, existing);
          }
        } else {
          commands.push(discordCmd);
        }
      }
    }

    // Filter by guild if specified
    let outputCommands = commands;
    if (options.guild) {
      outputCommands = guildCommands.get(options.guild) ?? [];
      if (outputCommands.length === 0) {
        console.log(chalk.yellow(`\n  No commands found for guild ${options.guild}`));
      }
    }

    // Output
    const jsonOutput = JSON.stringify(outputCommands, null, 2);

    if (options.output) {
      const outputPath = resolve(options.output);
      await writeFile(outputPath, jsonOutput);
      console.log(chalk.green(`\n  ✓ Exported ${outputCommands.length} command(s) to ${options.output}\n`));
    } else {
      console.log('\n' + jsonOutput + '\n');
    }

    // Summary
    console.log('  ' + chalk.bold('Summary'));
    console.log('  ─────────────────────────────');
    console.log(`  ${chalk.dim('Global commands'.padEnd(18))} ${chalk.green(commands.length)}`);
    if (guildCommands.size > 0) {
      console.log(`  ${chalk.dim('Guild-specific'.padEnd(18))} ${chalk.yellow(guildCommands.size)} guild(s)`);
      for (const [guildId, cmds] of guildCommands) {
        console.log(`    ${chalk.dim(guildId.padEnd(20))} ${cmds.length} command(s)`);
      }
    }
    console.log('');

    // Usage hint
    if (!options.output) {
      console.log(chalk.dim('  Tip: Use -o commands.json to save to a file\n'));
    } else {
      console.log(chalk.dim('  Register commands using the Discord API:'));
      console.log(chalk.dim('  PUT /applications/{app_id}/commands\n'));
    }

  } catch (error) {
    spinner.fail('Export failed');

    if (error instanceof Error) {
      const errorCode = 'code' in error ? (error as { code: string }).code : null;

      console.log('\n' + chalk.red.bold('  ✗ Error'));
      if (errorCode) {
        console.log(chalk.red(`  [${errorCode}]`));
      }
      console.log(chalk.white(`  ${error.message}`));
    }

    console.log('');
    process.exit(1);
  }
}
