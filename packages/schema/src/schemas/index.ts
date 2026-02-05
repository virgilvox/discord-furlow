/**
 * JSON Schema for FURLOW specification
 */

export const furlowSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://furlow.dev/schema/furlow.schema.json',
  title: 'FURLOW Specification',
  description: 'Schema for FURLOW Discord bot YAML specification',
  type: 'object',
  properties: {
    version: {
      type: 'string',
      description: 'Specification version',
    },
    imports: {
      type: 'array',
      items: {
        oneOf: [
          { type: 'string' },
          {
            type: 'object',
            properties: {
              path: { type: 'string' },
              as: { type: 'string' },
            },
            required: ['path'],
          },
        ],
      },
      description: 'File imports',
    },
    builtins: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          module: { type: 'string' },
          config: { type: 'object' },
        },
        required: ['module'],
      },
      description: 'Builtin modules to include',
    },
    identity: {
      $ref: '#/$defs/identity',
    },
    presence: {
      $ref: '#/$defs/presence',
    },
    intents: {
      $ref: '#/$defs/intents',
    },
    gateway: {
      $ref: '#/$defs/gateway',
    },
    permissions: {
      $ref: '#/$defs/permissions',
    },
    state: {
      $ref: '#/$defs/state',
    },
    commands: {
      type: 'array',
      items: { $ref: '#/$defs/command' },
    },
    context_menus: {
      type: 'array',
      items: { $ref: '#/$defs/contextMenu' },
    },
    events: {
      type: 'array',
      items: { $ref: '#/$defs/eventHandler' },
    },
    flows: {
      type: 'array',
      items: { $ref: '#/$defs/flow' },
    },
    components: {
      $ref: '#/$defs/components',
    },
    embeds: {
      $ref: '#/$defs/embeds',
    },
    theme: {
      $ref: '#/$defs/theme',
    },
    voice: {
      $ref: '#/$defs/voice',
    },
    video: {
      $ref: '#/$defs/video',
    },
    pipes: {
      type: 'object',
      additionalProperties: { $ref: '#/$defs/pipe' },
    },
    automod: {
      $ref: '#/$defs/automod',
    },
    scheduler: {
      $ref: '#/$defs/scheduler',
    },
    locale: {
      $ref: '#/$defs/locale',
    },
    canvas: {
      $ref: '#/$defs/canvas',
    },
    analytics: {
      $ref: '#/$defs/analytics',
    },
    dashboard: {
      $ref: '#/$defs/dashboard',
    },
    errors: {
      $ref: '#/$defs/errors',
    },
  },
  $defs: {
    identity: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        avatar: { type: 'string' },
        banner: { type: 'string' },
        about: { type: 'string' },
      },
    },
    presence: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['online', 'idle', 'dnd', 'invisible'],
        },
        activity: { $ref: '#/$defs/activity' },
        dynamic: {
          type: 'array',
          items: { $ref: '#/$defs/dynamicPresence' },
        },
      },
    },
    activity: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['playing', 'streaming', 'listening', 'watching', 'competing', 'custom'],
        },
        text: { type: 'string' },
        url: { type: 'string' },
        state: { type: 'string' },
      },
      required: ['type', 'text'],
    },
    dynamicPresence: {
      type: 'object',
      properties: {
        when: { type: 'string' },
        default: { type: 'boolean' },
        status: { type: 'string' },
        activity: { $ref: '#/$defs/activity' },
      },
    },
    intents: {
      type: 'object',
      properties: {
        auto: { type: 'boolean' },
        explicit: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    gateway: {
      type: 'object',
      properties: {
        sharding: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            shard_count: {
              oneOf: [{ type: 'number' }, { type: 'string', const: 'auto' }],
            },
          },
        },
        compression: { type: 'string', enum: ['zlib-stream', 'none'] },
        large_threshold: { type: 'number' },
        reconnect: {
          type: 'object',
          properties: {
            max_retries: { type: 'number' },
            backoff: { type: 'string', enum: ['exponential', 'linear', 'fixed'] },
            base_delay: { type: 'string' },
            max_delay: { type: 'string' },
          },
        },
      },
    },
    permissions: {
      type: 'object',
      properties: {
        owner: {
          type: 'object',
          properties: {
            users: { type: 'array', items: { type: 'string' } },
          },
        },
        levels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              level: { type: 'number' },
              roles: { type: 'array', items: { type: 'string' } },
              users: { type: 'array', items: { type: 'string' } },
              permissions: { type: 'array', items: { type: 'string' } },
            },
            required: ['name', 'level'],
          },
        },
        defaults: { $ref: '#/$defs/accessRule' },
      },
    },
    accessRule: {
      type: 'object',
      properties: {
        allow: {
          type: 'object',
          properties: {
            roles: { type: 'array', items: { type: 'string' } },
            users: { type: 'array', items: { type: 'string' } },
            permissions: { type: 'array', items: { type: 'string' } },
            level: { type: 'number' },
            channels: { type: 'array', items: { type: 'string' } },
          },
        },
        deny: {
          type: 'object',
          properties: {
            roles: { type: 'array', items: { type: 'string' } },
            users: { type: 'array', items: { type: 'string' } },
            channels: { type: 'array', items: { type: 'string' } },
          },
        },
        when: { $ref: '#/$defs/condition' },
      },
    },
    condition: {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: {
            all: { type: 'array', items: { $ref: '#/$defs/condition' } },
            any: { type: 'array', items: { $ref: '#/$defs/condition' } },
            not: { $ref: '#/$defs/condition' },
            expr: { type: 'string' },
          },
        },
      ],
    },
    state: {
      type: 'object',
      properties: {
        variables: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['string', 'number', 'boolean', 'array', 'object'] },
              default: {},
              scope: { type: 'string', enum: ['global', 'guild', 'channel', 'user', 'member'] },
              persist: { type: 'boolean' },
              ttl: { type: 'string' },
            },
          },
        },
        tables: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              columns: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    primary: { type: 'boolean' },
                    nullable: { type: 'boolean' },
                    default: {},
                    unique: { type: 'boolean' },
                    index: { type: 'boolean' },
                  },
                },
              },
              indexes: { type: 'array' },
            },
          },
        },
        cache: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            max_size: { type: 'number' },
            ttl: { type: 'string' },
          },
        },
        storage: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['sqlite', 'postgres', 'memory'] },
            path: { type: 'string' },
            url: { type: 'string' },
          },
        },
      },
    },
    command: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', enum: ['slash', 'user', 'message'] },
        options: { type: 'array', items: { $ref: '#/$defs/commandOption' } },
        subcommands: { type: 'array', items: { $ref: '#/$defs/subcommand' } },
        subcommand_groups: { type: 'array', items: { $ref: '#/$defs/subcommandGroup' } },
        actions: { type: 'array', items: { $ref: '#/$defs/action' } },
        access: { $ref: '#/$defs/accessRule' },
        cooldown: { type: 'object' },
        defer: { type: 'boolean' },
        ephemeral: { type: 'boolean' },
        dm_permission: { type: 'boolean' },
        nsfw: { type: 'boolean' },
        guild_ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'description'],
    },
    commandOption: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        type: {
          type: 'string',
          enum: ['string', 'integer', 'number', 'boolean', 'user', 'channel', 'role', 'mentionable', 'attachment'],
        },
        required: { type: 'boolean' },
        choices: { type: 'array' },
        min_value: { type: 'number' },
        max_value: { type: 'number' },
        min_length: { type: 'number' },
        max_length: { type: 'number' },
        autocomplete: { type: 'boolean' },
        channel_types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['text', 'voice', 'category', 'announcement', 'stage', 'forum'],
          },
        },
      },
      required: ['name', 'description', 'type'],
    },
    subcommand: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        options: { type: 'array', items: { $ref: '#/$defs/commandOption' } },
        actions: { type: 'array', items: { $ref: '#/$defs/action' } },
        access: { $ref: '#/$defs/accessRule' },
      },
      required: ['name', 'description', 'actions'],
    },
    subcommandGroup: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        subcommands: { type: 'array', items: { $ref: '#/$defs/subcommand' } },
      },
      required: ['name', 'description', 'subcommands'],
    },
    contextMenu: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['user', 'message'] },
        actions: { type: 'array', items: { $ref: '#/$defs/action' } },
        access: { $ref: '#/$defs/accessRule' },
        guild_ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'type', 'actions'],
    },
    eventHandler: {
      type: 'object',
      properties: {
        event: { type: 'string' },
        when: { $ref: '#/$defs/condition' },
        actions: { type: 'array', items: { $ref: '#/$defs/action' } },
        debounce: { type: 'string' },
        throttle: { type: 'string' },
        once: { type: 'boolean' },
      },
      required: ['event', 'actions'],
    },
    flow: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        parameters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              required: { type: 'boolean' },
              default: {},
            },
          },
        },
        actions: { type: 'array', items: { $ref: '#/$defs/action' } },
        returns: { type: 'string' },
      },
      required: ['name', 'actions'],
    },
    action: {
      type: 'object',
      properties: {
        action: { type: 'string' },
        when: { $ref: '#/$defs/condition' },
        error_handler: { type: 'string' },
      },
      required: ['action'],
      additionalProperties: true,
    },
    components: {
      type: 'object',
      properties: {
        buttons: { type: 'object' },
        selects: { type: 'object' },
        modals: { type: 'object' },
      },
    },
    embeds: {
      type: 'object',
      properties: {
        theme: { $ref: '#/$defs/theme' },
        templates: { type: 'object' },
      },
    },
    theme: {
      type: 'object',
      properties: {
        colors: {
          type: 'object',
          properties: {
            primary: {},
            secondary: {},
            success: {},
            warning: {},
            error: {},
            info: {},
          },
        },
        embeds: { type: 'array' },
        default_footer: { type: 'object' },
        default_author: { type: 'object' },
      },
    },
    voice: {
      type: 'object',
      properties: {
        connection: { type: 'object' },
        recording: { type: 'object' },
        default_volume: { type: 'number' },
        max_queue_size: { type: 'number' },
        default_loop: { type: 'string' },
        vote_skip: { type: 'object' },
        filters: { type: 'array', items: { type: 'string' } },
      },
    },
    video: {
      type: 'object',
      properties: {
        stream_detection: { type: 'boolean' },
        notify_channel: { type: 'string' },
        notify_role: { type: 'string' },
      },
    },
    pipe: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['http', 'websocket', 'mqtt', 'tcp', 'udp', 'webhook', 'database', 'file'],
        },
      },
      required: ['type'],
      additionalProperties: true,
    },
    automod: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        rules: { type: 'array' },
        log_channel: { type: 'string' },
        dm_on_action: { type: 'boolean' },
      },
    },
    scheduler: {
      type: 'object',
      properties: {
        timezone: { type: 'string' },
        jobs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              cron: { type: 'string' },
              timezone: { type: 'string' },
              enabled: { type: 'boolean' },
              actions: { type: 'array', items: { $ref: '#/$defs/action' } },
            },
            required: ['name', 'cron', 'actions'],
          },
        },
      },
    },
    locale: {
      type: 'object',
      properties: {
        default: { type: 'string' },
        fallback: { type: 'string' },
        locales: { type: 'object' },
      },
    },
    canvas: {
      type: 'object',
      properties: {
        fonts: { type: 'object' },
        generators: { type: 'object' },
      },
    },
    analytics: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        prometheus: { type: 'object' },
        counters: { type: 'object' },
      },
    },
    dashboard: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        port: { type: 'number' },
        host: { type: 'string' },
        session_secret: { type: 'string' },
        custom_html: { type: 'string' },
        custom_css: { type: 'string' },
        custom_js: { type: 'string' },
        branding: { type: 'object' },
      },
    },
    errors: {
      type: 'object',
      properties: {
        handlers: { type: 'object' },
        default_handler: { type: 'string' },
        log_errors: { type: 'boolean' },
      },
    },
  },
};
