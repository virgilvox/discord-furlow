/**
 * Command types
 */

import type { Expression, Snowflake } from './common.js';
import type { Action } from './actions.js';
import type { AccessRule } from './permissions.js';

/** Command option type */
export type CommandOptionType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'user'
  | 'channel'
  | 'role'
  | 'mentionable'
  | 'attachment';

/** Command option choice */
export interface CommandOptionChoice {
  name: string;
  value: string | number;
}

/** Command option */
export interface CommandOption {
  name: string;
  description: string;
  type: CommandOptionType;
  required?: boolean;
  choices?: CommandOptionChoice[];
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  autocomplete?: boolean;
  channel_types?: ('text' | 'voice' | 'category' | 'announcement' | 'stage' | 'forum')[];
}

/** Subcommand definition */
export interface SubcommandDefinition {
  name: string;
  description: string;
  options?: CommandOption[];
  actions: Action[];
  access?: AccessRule;
}

/** Subcommand group */
export interface SubcommandGroup {
  name: string;
  description: string;
  subcommands: SubcommandDefinition[];
}

/** Autocomplete handler */
export interface AutocompleteHandler {
  option: string;
  source: 'static' | 'query' | 'expression';
  choices?: CommandOptionChoice[];
  query?: string;
  expression?: Expression;
}

/** Command definition */
export interface CommandDefinition {
  name: string;
  description: string;
  type?: 'slash' | 'user' | 'message';
  options?: CommandOption[];
  subcommands?: SubcommandDefinition[];
  subcommand_groups?: SubcommandGroup[];
  actions?: Action[];
  access?: AccessRule;
  cooldown?: {
    rate: number;
    per: 'user' | 'channel' | 'guild';
    duration: string;
    message?: Expression;
  };
  defer?: boolean;
  ephemeral?: boolean;
  dm_permission?: boolean;
  nsfw?: boolean;
  guild_ids?: Snowflake[];
  autocomplete?: AutocompleteHandler[];
  /**
   * Wallclock timeout for a single invocation of this command. Accepts
   * duration strings like "30s" or raw milliseconds. See EventHandler.timeout.
   */
  timeout?: string | number;
}

/** Context menu command (user/message) */
export interface ContextMenuCommand {
  name: string;
  type: 'user' | 'message';
  actions: Action[];
  access?: AccessRule;
  guild_ids?: Snowflake[];
}
