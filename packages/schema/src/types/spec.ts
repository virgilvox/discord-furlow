/**
 * Full FURLOW specification type
 */

import type { Import } from './common.js';
import type { Identity, Presence } from './identity.js';
import type { IntentsConfig, GatewayConfig } from './intents.js';
import type { PermissionsConfig } from './permissions.js';
import type { StateConfig } from './state.js';
import type { CommandDefinition, ContextMenuCommand } from './commands.js';
import type { EventHandler } from './events.js';
import type { FlowDefinition } from './flows.js';
import type { ComponentsConfig } from './components.js';
import type { EmbedsConfig, ThemeConfig } from './embeds.js';
import type { VoiceConfig, VideoConfig } from './voice.js';
import type { PipeConfig } from './pipes.js';
import type { AutomodConfig } from './automod.js';
import type { SchedulerConfig } from './scheduler.js';
import type { LocaleConfig } from './locale.js';
import type { CanvasConfig } from './canvas.js';

/** Analytics configuration */
export interface AnalyticsConfig {
  enabled?: boolean;
  prometheus?: {
    enabled?: boolean;
    port?: number;
    path?: string;
  };
  counters?: Record<string, {
    description?: string;
    labels?: string[];
  }>;
}

/** Dashboard configuration */
export interface DashboardConfig {
  enabled?: boolean;
  port?: number;
  host?: string;
  session_secret?: string;
  custom_html?: string;
  custom_css?: string;
  custom_js?: string;
  branding?: {
    name?: string;
    logo?: string;
    favicon?: string;
  };
}

/** Error handling configuration */
export interface ErrorHandlerConfig {
  name: string;
  type?: 'message' | 'log' | 'dm' | 'webhook';
  message?: string;
  channel?: string;
  webhook_url?: string;
  include_stack?: boolean;
}

export interface ErrorConfig {
  handlers?: Record<string, ErrorHandlerConfig>;
  default_handler?: string;
  log_errors?: boolean;
}

/** Builtin module reference */
export interface BuiltinReference {
  module: string;
  config?: Record<string, unknown>;
}

/** Full FURLOW specification */
export interface FurlowSpec {
  /** Specification version */
  version?: string;

  /** File imports */
  imports?: (string | Import)[];

  /** Builtin modules */
  builtins?: BuiltinReference[];

  /** Bot identity */
  identity?: Identity;

  /** Presence configuration */
  presence?: Presence;

  /** Gateway intents */
  intents?: IntentsConfig;

  /** Gateway configuration */
  gateway?: GatewayConfig;

  /** Permissions and access control */
  permissions?: PermissionsConfig;

  /** State and storage */
  state?: StateConfig;

  /** Slash commands */
  commands?: CommandDefinition[];

  /** Context menu commands */
  context_menus?: ContextMenuCommand[];

  /** Event handlers */
  events?: EventHandler[];

  /** Reusable flows */
  flows?: FlowDefinition[];

  /** UI components */
  components?: ComponentsConfig;

  /** Embeds and theming */
  embeds?: EmbedsConfig;

  /** Theme configuration */
  theme?: ThemeConfig;

  /** Voice configuration */
  voice?: VoiceConfig;

  /** Video configuration */
  video?: VideoConfig;

  /** External pipes */
  pipes?: Record<string, PipeConfig>;

  /** Automod configuration */
  automod?: AutomodConfig;

  /** Scheduler configuration */
  scheduler?: SchedulerConfig;

  /** Localization */
  locale?: LocaleConfig;

  /** Canvas configuration */
  canvas?: CanvasConfig;

  /** Analytics configuration */
  analytics?: AnalyticsConfig;

  /** Dashboard configuration */
  dashboard?: DashboardConfig;

  /** Error handling */
  errors?: ErrorConfig;

  /**
   * Plugin files (JavaScript / ESM) loaded at startup for custom actions,
   * expression functions, and transforms. Paths resolve relative to the
   * spec file. See docs/advanced/custom-actions.md.
   */
  plugins?: string[];
}
