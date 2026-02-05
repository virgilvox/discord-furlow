/**
 * Message action handlers
 */

import type { ActionRegistry } from '../registry.js';
import type { ActionHandler, ActionContext, ActionResult } from '../types.js';
import type { HandlerDependencies } from './index.js';
import type {
  ReplyAction,
  SendMessageAction,
  EditMessageAction,
  DeleteMessageAction,
  DeferAction,
  UpdateMessageAction,
  AddReactionAction,
  AddReactionsAction,
  RemoveReactionAction,
  ClearReactionsAction,
  BulkDeleteAction,
} from '@furlow/schema';
import {
  type TextChannel,
  type NewsChannel,
  type Message,
  type MessageCreateOptions,
  type MessageEditOptions,
  type InteractionReplyOptions,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  ChannelType,
} from 'discord.js';

/**
 * Helper to build message options from action config
 */
async function buildMessageOptions(
  config: ReplyAction | SendMessageAction,
  context: ActionContext,
  deps: HandlerDependencies
): Promise<MessageCreateOptions & InteractionReplyOptions> {
  const { evaluator } = deps;
  const options: MessageCreateOptions & InteractionReplyOptions = {};

  // Content
  if (config.content) {
    options.content = await evaluator.interpolate(String(config.content), context);
  }

  // Embeds
  if (config.embed) {
    const embed = await evaluateObject(config.embed as Record<string, unknown>, context, evaluator);
    options.embeds = [embed as any];
  }
  if (config.embeds) {
    options.embeds = await Promise.all(
      config.embeds.map((e) => evaluateObject(e as Record<string, unknown>, context, evaluator))
    ) as any[];
  }

  // Components
  if (config.components) {
    if (Array.isArray(config.components)) {
      options.components = await Promise.all(
        config.components.map((c) => evaluateObject(c as unknown as Record<string, unknown>, context, evaluator))
      ) as any[];
    }
  }

  // Ephemeral (for interactions)
  if ('ephemeral' in config && config.ephemeral) {
    options.ephemeral = true;
  }

  // Files - use evaluateTemplate to preserve Buffer types from canvas_render
  if (config.files) {
    const { AttachmentBuilder } = await import('discord.js');
    options.files = await Promise.all(
      config.files.map(async (f) => {
        if (typeof f === 'string') {
          // Evaluate template, preserving raw types (Buffer, etc.)
          const value = await evaluator.evaluateTemplate(f, context);
          // Handle binary data types (Buffer, Uint8Array, ArrayBuffer)
          if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
            return new AttachmentBuilder(Buffer.from(value));
          }
          if (value instanceof ArrayBuffer) {
            return new AttachmentBuilder(Buffer.from(value));
          }
          // Already an AttachmentBuilder or similar
          if (value && typeof value === 'object' && 'attachment' in value) {
            return value;
          }
          return String(value);
        }
        // Handle { attachment, name } object format
        const fileObj = f as { attachment?: string; name?: string };
        if (fileObj.attachment) {
          const attachment = await evaluator.evaluateTemplate(fileObj.attachment, context);
          // Handle binary data types
          if (Buffer.isBuffer(attachment) || attachment instanceof Uint8Array) {
            return new AttachmentBuilder(Buffer.from(attachment), { name: fileObj.name });
          }
          if (attachment instanceof ArrayBuffer) {
            return new AttachmentBuilder(Buffer.from(attachment), { name: fileObj.name });
          }
          // Already an AttachmentBuilder or similar
          if (attachment && typeof attachment === 'object' && 'attachment' in attachment) {
            return attachment;
          }
          // String path or URL
          return new AttachmentBuilder(String(attachment), { name: fileObj.name });
        }
        // Fallback: evaluate as object
        return await evaluateObject(f as unknown as Record<string, unknown>, context, evaluator);
      })
    ) as any[];
  }

  return options;
}

/**
 * Helper to evaluate object properties recursively
 */
async function evaluateObject(
  obj: Record<string, unknown>,
  context: ActionContext,
  evaluator: { interpolate: (s: string, ctx: Record<string, unknown>) => Promise<string> }
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = await evaluator.interpolate(value, context);
    } else if (Array.isArray(value)) {
      result[key] = await Promise.all(
        value.map(async (item) => {
          if (typeof item === 'object' && item !== null) {
            return evaluateObject(item as Record<string, unknown>, context, evaluator);
          }
          if (typeof item === 'string') {
            return evaluator.interpolate(item, context);
          }
          return item;
        })
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = await evaluateObject(value as Record<string, unknown>, context, evaluator);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Helper to resolve a channel from an expression or use context channel
 */
async function resolveChannel(
  channelExpr: string | undefined,
  context: ActionContext,
  deps: HandlerDependencies
): Promise<TextChannel | NewsChannel | null> {
  const { client, evaluator } = deps;

  if (!channelExpr) {
    // Use current channel from context
    const channelId = context.channelId || (context.channel as any)?.id;
    if (!channelId) return null;
    const channel = await client.channels.fetch(channelId);
    if (channel?.type === ChannelType.GuildText || channel?.type === ChannelType.GuildAnnouncement) {
      return channel as TextChannel | NewsChannel;
    }
    return null;
  }

  // Evaluate expression to get channel ID
  const resolved = await evaluator.interpolate(channelExpr, context);
  // Extract ID from mention or use directly
  const channelId = resolved.replace(/[<#>]/g, '');
  const channel = await client.channels.fetch(channelId);
  if (channel?.type === ChannelType.GuildText || channel?.type === ChannelType.GuildAnnouncement) {
    return channel as TextChannel | NewsChannel;
  }
  return null;
}

/**
 * Helper to resolve a message from channel and message ID
 */
async function resolveMessage(
  channel: TextChannel | NewsChannel,
  messageExpr: string | undefined,
  context: ActionContext,
  deps: HandlerDependencies
): Promise<Message | null> {
  if (!messageExpr) {
    // Use current message from context
    const messageId = context.messageId || (context.message as any)?.id;
    if (!messageId) return null;
    return channel.messages.fetch(messageId);
  }

  const { evaluator } = deps;
  const messageId = await evaluator.interpolate(messageExpr, context);
  return channel.messages.fetch(messageId);
}

/**
 * Reply action handler
 */
const replyHandler: ActionHandler<ReplyAction> = {
  name: 'reply',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const interaction = context.interaction as
      | ChatInputCommandInteraction
      | ButtonInteraction
      | StringSelectMenuInteraction
      | ModalSubmitInteraction
      | undefined;

    if (!interaction) {
      return { success: false, error: new Error('No interaction to reply to') };
    }

    const options = await buildMessageOptions(config, context, deps);

    try {
      if (!interaction.replied && !interaction.deferred) {
        const reply = await interaction.reply({ ...options, fetchReply: true });
        return { success: true, data: reply };
      } else {
        const followUp = await interaction.followUp({ ...options, fetchReply: true });
        return { success: true, data: followUp };
      }
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Send message action handler
 */
const sendMessageHandler: ActionHandler<SendMessageAction> = {
  name: 'send_message',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;

    const channel = await resolveChannel(config.channel as string | undefined, context, deps);
    if (!channel) {
      return { success: false, error: new Error('Channel not found') };
    }

    const options = await buildMessageOptions(config, context, deps);

    try {
      const message = await channel.send(options);

      // Store in variable if requested
      if (config.as) {
        (context as Record<string, unknown>)[config.as] = message;
      }

      return { success: true, data: message };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Edit message action handler
 */
const editMessageHandler: ActionHandler<EditMessageAction> = {
  name: 'edit_message',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const channel = await resolveChannel(config.channel as string | undefined, context, deps);
    if (!channel) {
      return { success: false, error: new Error('Channel not found') };
    }

    const messageId = config.message || config.message_id;
    const message = await resolveMessage(channel, messageId as string | undefined, context, deps);
    if (!message) {
      return { success: false, error: new Error('Message not found') };
    }

    const options: MessageEditOptions = {};

    if (config.content) {
      options.content = await evaluator.interpolate(String(config.content), context);
    }

    if (config.embed) {
      const embed = await evaluateObject(config.embed as Record<string, unknown>, context, evaluator);
      options.embeds = [embed as any];
    }
    if (config.embeds) {
      options.embeds = await Promise.all(
        config.embeds.map((e) => evaluateObject(e as Record<string, unknown>, context, evaluator))
      ) as any[];
    }

    if (config.components) {
      if (Array.isArray(config.components)) {
        options.components = await Promise.all(
          config.components.map((c) => evaluateObject(c as unknown as Record<string, unknown>, context, evaluator))
        ) as any[];
      }
    }

    try {
      const edited = await message.edit(options);
      return { success: true, data: edited };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Delete message action handler
 */
const deleteMessageHandler: ActionHandler<DeleteMessageAction> = {
  name: 'delete_message',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;

    const channel = await resolveChannel(config.channel as string | undefined, context, deps);
    if (!channel) {
      return { success: false, error: new Error('Channel not found') };
    }

    const messageId = config.message || config.message_id;
    const message = await resolveMessage(channel, messageId as string | undefined, context, deps);
    if (!message) {
      return { success: false, error: new Error('Message not found') };
    }

    // Handle delay
    if (config.delay) {
      const delayMs = parseDuration(config.delay as string);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    try {
      await message.delete();
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Defer action handler
 */
const deferHandler: ActionHandler<DeferAction> = {
  name: 'defer',
  async execute(config, context): Promise<ActionResult> {
    const interaction = context.interaction as
      | ChatInputCommandInteraction
      | ButtonInteraction
      | StringSelectMenuInteraction
      | ModalSubmitInteraction
      | undefined;

    if (!interaction) {
      return { success: false, error: new Error('No interaction to defer') };
    }

    if (interaction.replied || interaction.deferred) {
      return { success: true };
    }

    try {
      await interaction.deferReply({ ephemeral: config.ephemeral });
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Update message action handler (for component interactions)
 */
const updateMessageHandler: ActionHandler<UpdateMessageAction> = {
  name: 'update_message',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const interaction = context.interaction as
      | ButtonInteraction
      | StringSelectMenuInteraction
      | undefined;

    if (!interaction || !('update' in interaction)) {
      return { success: false, error: new Error('No component interaction to update') };
    }

    const options: any = {};

    if (config.content) {
      options.content = await evaluator.interpolate(String(config.content), context);
    }

    if (config.embed) {
      const embed = await evaluateObject(config.embed as Record<string, unknown>, context, evaluator);
      options.embeds = [embed];
    }
    if (config.embeds) {
      options.embeds = await Promise.all(
        config.embeds.map((e) => evaluateObject(e as Record<string, unknown>, context, evaluator))
      );
    }

    if (config.components) {
      options.components = await Promise.all(
        config.components.map((c) => evaluateObject(c as unknown as Record<string, unknown>, context, evaluator))
      );
    }

    try {
      await interaction.update(options);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Add reaction action handler
 */
const addReactionHandler: ActionHandler<AddReactionAction> = {
  name: 'add_reaction',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const channel = await resolveChannel(config.channel as string | undefined, context, deps);
    if (!channel) {
      return { success: false, error: new Error('Channel not found') };
    }

    const messageId = config.message || config.message_id;
    const message = await resolveMessage(channel, messageId as string | undefined, context, deps);
    if (!message) {
      return { success: false, error: new Error('Message not found') };
    }

    const emoji = await evaluator.interpolate(String(config.emoji), context);

    try {
      await message.react(emoji);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Add multiple reactions action handler
 */
const addReactionsHandler: ActionHandler<AddReactionsAction> = {
  name: 'add_reactions',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const channel = await resolveChannel(undefined, context, deps);
    if (!channel) {
      return { success: false, error: new Error('Channel not found') };
    }

    const messageId = config.message_id;
    const message = await resolveMessage(channel, messageId as string | undefined, context, deps);
    if (!message) {
      return { success: false, error: new Error('Message not found') };
    }

    if (!config.emojis || !Array.isArray(config.emojis)) {
      return { success: false, error: new Error('Emojis array is required') };
    }

    try {
      // Add reactions sequentially to maintain order
      for (const emojiExpr of config.emojis) {
        const emoji = await evaluator.interpolate(String(emojiExpr), context);
        await message.react(emoji);
      }
      return { success: true, data: config.emojis.length };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Remove reaction action handler
 */
const removeReactionHandler: ActionHandler<RemoveReactionAction> = {
  name: 'remove_reaction',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, client } = deps;

    // Get channel from context
    const channelId = context.channelId || (context.channel as any)?.id;
    if (!channelId) {
      return { success: false, error: new Error('Channel not found') };
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
      return { success: false, error: new Error('Invalid channel type') };
    }

    const messageId = config.message_id
      ? await evaluator.interpolate(String(config.message_id), context)
      : context.messageId || (context.message as any)?.id;

    if (!messageId) {
      return { success: false, error: new Error('Message not found') };
    }

    const message = await (channel as TextChannel).messages.fetch(messageId);
    const emoji = await evaluator.interpolate(String(config.emoji), context);
    const userId = config.user_id
      ? await evaluator.interpolate(String(config.user_id), context)
      : context.userId || (context.user as any)?.id;

    try {
      const reaction = message.reactions.cache.get(emoji);
      if (reaction) {
        await reaction.users.remove(userId);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Clear reactions action handler
 */
const clearReactionsHandler: ActionHandler<ClearReactionsAction> = {
  name: 'clear_reactions',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, client } = deps;

    const channelId = context.channelId || (context.channel as any)?.id;
    if (!channelId) {
      return { success: false, error: new Error('Channel not found') };
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
      return { success: false, error: new Error('Invalid channel type') };
    }

    const messageId = config.message_id
      ? await evaluator.interpolate(String(config.message_id), context)
      : context.messageId || (context.message as any)?.id;

    if (!messageId) {
      return { success: false, error: new Error('Message not found') };
    }

    const message = await (channel as TextChannel).messages.fetch(messageId);

    try {
      if (config.emoji) {
        const emoji = await evaluator.interpolate(String(config.emoji), context);
        const reaction = message.reactions.cache.get(emoji);
        if (reaction) {
          await reaction.remove();
        }
      } else {
        await message.reactions.removeAll();
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Bulk delete action handler
 */
const bulkDeleteHandler: ActionHandler<BulkDeleteAction> = {
  name: 'bulk_delete',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;

    const channel = await resolveChannel(config.channel as string | undefined, context, deps);
    if (!channel) {
      return { success: false, error: new Error('Channel not found') };
    }

    const count = config.count || 100;

    try {
      const deleted = await channel.bulkDelete(count, true);
      return { success: true, data: deleted.size };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Parse duration string to milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h)?$/);
  if (!match) return 0;

  const value = parseInt(match[1]!, 10);
  const unit = match[2] ?? 'ms';

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      return value;
  }
}

/**
 * Register all message handlers
 */
export function registerMessageHandlers(
  registry: ActionRegistry,
  deps: HandlerDependencies
): void {
  registry.register(replyHandler);
  registry.register(sendMessageHandler);
  registry.register(editMessageHandler);
  registry.register(deleteMessageHandler);
  registry.register(deferHandler);
  registry.register(updateMessageHandler);
  registry.register(addReactionHandler);
  registry.register(addReactionsHandler);
  registry.register(removeReactionHandler);
  registry.register(clearReactionsHandler);
  registry.register(bulkDeleteHandler);
}
