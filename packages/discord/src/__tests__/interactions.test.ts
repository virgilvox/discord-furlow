/**
 * Interaction Handler Tests
 *
 * Tests the InteractionHandler class with mocked Discord.js interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractionHandler, createInteractionHandler } from '../interactions/index.js';

// Mock discord.js
vi.mock('discord.js', () => {
  const mockREST = vi.fn().mockImplementation(() => ({
    setToken: vi.fn().mockReturnThis(),
    put: vi.fn().mockResolvedValue(undefined),
  }));

  return {
    Client: vi.fn(),
    REST: mockREST,
    MessageFlags: {
      Ephemeral: 64,
    },
    Routes: {
      applicationGuildCommands: vi.fn((clientId, guildId) => `/applications/${clientId}/guilds/${guildId}/commands`),
      applicationCommands: vi.fn((clientId) => `/applications/${clientId}/commands`),
    },
    SlashCommandBuilder: vi.fn().mockImplementation(() => ({
      setName: vi.fn().mockReturnThis(),
      setDescription: vi.fn().mockReturnThis(),
      setDMPermission: vi.fn().mockReturnThis(),
      setNSFW: vi.fn().mockReturnThis(),
      addStringOption: vi.fn().mockReturnThis(),
      addIntegerOption: vi.fn().mockReturnThis(),
      addBooleanOption: vi.fn().mockReturnThis(),
      addUserOption: vi.fn().mockReturnThis(),
      addChannelOption: vi.fn().mockReturnThis(),
      addRoleOption: vi.fn().mockReturnThis(),
      addSubcommand: vi.fn().mockReturnThis(),
      addSubcommandGroup: vi.fn().mockReturnThis(),
      toJSON: vi.fn().mockReturnValue({ name: 'test', description: 'test' }),
    })),
    ContextMenuCommandBuilder: vi.fn().mockImplementation(() => ({
      setName: vi.fn().mockReturnThis(),
      setType: vi.fn().mockReturnThis(),
      toJSON: vi.fn().mockReturnValue({ name: 'test', type: 2 }),
    })),
    ApplicationCommandType: {
      User: 2,
      Message: 3,
    },
  };
});

describe('InteractionHandler', () => {
  let handler: InteractionHandler;
  let mockClient: any;
  let interactionListeners: Map<string, Function>;

  beforeEach(() => {
    interactionListeners = new Map();

    mockClient = {
      on: vi.fn((event: string, listener: Function) => {
        interactionListeners.set(event, listener);
      }),
    };

    handler = createInteractionHandler({
      client: mockClient,
      token: 'test-token',
      clientId: '123456789',
    });
  });

  describe('Handler Registration', () => {
    it('should register command handlers', async () => {
      const commandHandler = vi.fn();
      handler.onCommand('ping', commandHandler);

      // Simulate a command interaction
      const mockInteraction = createMockCommandInteraction('ping');
      await triggerInteraction(mockInteraction);

      expect(commandHandler).toHaveBeenCalledWith(mockInteraction);
    });

    it('should register button handlers', async () => {
      const buttonHandler = vi.fn();
      handler.onButton('confirm_action', buttonHandler);

      const mockInteraction = createMockButtonInteraction('confirm_action');
      await triggerInteraction(mockInteraction);

      expect(buttonHandler).toHaveBeenCalledWith(mockInteraction);
    });

    it('should register select menu handlers', async () => {
      const selectHandler = vi.fn();
      handler.onSelect('role_select', selectHandler);

      const mockInteraction = createMockSelectInteraction('role_select');
      await triggerInteraction(mockInteraction);

      expect(selectHandler).toHaveBeenCalledWith(mockInteraction);
    });

    it('should register modal handlers', async () => {
      const modalHandler = vi.fn();
      handler.onModal('feedback_modal', modalHandler);

      const mockInteraction = createMockModalInteraction('feedback_modal');
      await triggerInteraction(mockInteraction);

      expect(modalHandler).toHaveBeenCalledWith(mockInteraction);
    });

    it('should register user context menu handlers', async () => {
      const contextHandler = vi.fn();
      handler.onUserContext('Get User Info', contextHandler);

      const mockInteraction = createMockUserContextInteraction('Get User Info');
      await triggerInteraction(mockInteraction);

      expect(contextHandler).toHaveBeenCalledWith(mockInteraction);
    });

    it('should register message context menu handlers', async () => {
      const contextHandler = vi.fn();
      handler.onMessageContext('Report Message', contextHandler);

      const mockInteraction = createMockMessageContextInteraction('Report Message');
      await triggerInteraction(mockInteraction);

      expect(contextHandler).toHaveBeenCalledWith(mockInteraction);
    });
  });

  describe('Wildcard Pattern Matching', () => {
    it('should match button with wildcard prefix', async () => {
      const handler1 = vi.fn();
      handler.onButton('ticket_close_*', handler1);

      const interaction1 = createMockButtonInteraction('ticket_close_12345');
      await triggerInteraction(interaction1);
      expect(handler1).toHaveBeenCalledWith(interaction1);

      const interaction2 = createMockButtonInteraction('ticket_close_67890');
      await triggerInteraction(interaction2);
      expect(handler1).toHaveBeenCalledTimes(2);
    });

    it('should prefer exact match over wildcard', async () => {
      const exactHandler = vi.fn();
      const wildcardHandler = vi.fn();

      handler.onButton('button_special', exactHandler);
      handler.onButton('button_*', wildcardHandler);

      const interaction = createMockButtonInteraction('button_special');
      await triggerInteraction(interaction);

      expect(exactHandler).toHaveBeenCalled();
      expect(wildcardHandler).not.toHaveBeenCalled();
    });

    it('should match select menu with wildcard', async () => {
      const selectHandler = vi.fn();
      handler.onSelect('role_*', selectHandler);

      const interaction = createMockSelectInteraction('role_assign_member');
      await triggerInteraction(interaction);

      expect(selectHandler).toHaveBeenCalled();
    });

    it('should match modal with wildcard', async () => {
      const modalHandler = vi.fn();
      handler.onModal('edit_*', modalHandler);

      const interaction = createMockModalInteraction('edit_profile_123');
      await triggerInteraction(interaction);

      expect(modalHandler).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should catch handler errors and reply with error message', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      handler.onCommand('failing', errorHandler);

      const mockInteraction = createMockCommandInteraction('failing');
      mockInteraction.reply = vi.fn().mockResolvedValue(undefined);

      // Should not throw
      await triggerInteraction(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('error'),
          flags: expect.anything(),
        })
      );
    });

    it('should not reply if interaction already replied', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      handler.onCommand('failing', errorHandler);

      const mockInteraction = createMockCommandInteraction('failing');
      mockInteraction.replied = true;
      mockInteraction.reply = vi.fn();

      await triggerInteraction(mockInteraction);

      expect(mockInteraction.reply).not.toHaveBeenCalled();
    });

    it('should not reply if interaction already deferred', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      handler.onCommand('failing', errorHandler);

      const mockInteraction = createMockCommandInteraction('failing');
      mockInteraction.deferred = true;
      mockInteraction.reply = vi.fn();

      await triggerInteraction(mockInteraction);

      expect(mockInteraction.reply).not.toHaveBeenCalled();
    });
  });

  describe('Unhandled Interactions', () => {
    it('should silently ignore unhandled commands', async () => {
      const interaction = createMockCommandInteraction('unknown_command');

      // Should not throw
      await triggerInteraction(interaction);
    });

    it('should silently ignore unhandled buttons', async () => {
      const interaction = createMockButtonInteraction('unknown_button');

      // Should not throw
      await triggerInteraction(interaction);
    });
  });

  // Helper functions to create mock interactions
  function createMockCommandInteraction(commandName: string) {
    return {
      isChatInputCommand: () => true,
      isButton: () => false,
      isStringSelectMenu: () => false,
      isModalSubmit: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isRepliable: () => true,
      replied: false,
      deferred: false,
      commandName,
      reply: vi.fn().mockResolvedValue(undefined),
    };
  }

  function createMockButtonInteraction(customId: string) {
    return {
      isChatInputCommand: () => false,
      isButton: () => true,
      isStringSelectMenu: () => false,
      isModalSubmit: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isRepliable: () => true,
      replied: false,
      deferred: false,
      customId,
      reply: vi.fn().mockResolvedValue(undefined),
    };
  }

  function createMockSelectInteraction(customId: string) {
    return {
      isChatInputCommand: () => false,
      isButton: () => false,
      isStringSelectMenu: () => true,
      isModalSubmit: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isRepliable: () => true,
      replied: false,
      deferred: false,
      customId,
      reply: vi.fn().mockResolvedValue(undefined),
    };
  }

  function createMockModalInteraction(customId: string) {
    return {
      isChatInputCommand: () => false,
      isButton: () => false,
      isStringSelectMenu: () => false,
      isModalSubmit: () => true,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isRepliable: () => true,
      replied: false,
      deferred: false,
      customId,
      reply: vi.fn().mockResolvedValue(undefined),
    };
  }

  function createMockUserContextInteraction(commandName: string) {
    return {
      isChatInputCommand: () => false,
      isButton: () => false,
      isStringSelectMenu: () => false,
      isModalSubmit: () => false,
      isUserContextMenuCommand: () => true,
      isMessageContextMenuCommand: () => false,
      isRepliable: () => true,
      replied: false,
      deferred: false,
      commandName,
      reply: vi.fn().mockResolvedValue(undefined),
    };
  }

  function createMockMessageContextInteraction(commandName: string) {
    return {
      isChatInputCommand: () => false,
      isButton: () => false,
      isStringSelectMenu: () => false,
      isModalSubmit: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => true,
      isRepliable: () => true,
      replied: false,
      deferred: false,
      commandName,
      reply: vi.fn().mockResolvedValue(undefined),
    };
  }

  async function triggerInteraction(interaction: any) {
    const listener = interactionListeners.get('interactionCreate');
    if (listener) {
      await listener(interaction);
    }
  }
});

describe('Command Registration', () => {
  it('should build slash commands correctly', async () => {
    const mockClient = {
      on: vi.fn(),
    };

    const handler = createInteractionHandler({
      client: mockClient as any,
      token: 'test-token',
      clientId: '123456789',
      guildId: '987654321',
    });

    // This tests that registerCommands doesn't throw
    await handler.registerCommands([
      {
        name: 'test',
        description: 'A test command',
        options: [
          { name: 'input', description: 'Test input', type: 'string', required: true },
          { name: 'count', description: 'Test count', type: 'integer' },
          { name: 'flag', description: 'Test flag', type: 'boolean' },
        ],
      },
    ]);
  });

  it('should build context menu commands correctly', async () => {
    const mockClient = {
      on: vi.fn(),
    };

    const handler = createInteractionHandler({
      client: mockClient as any,
      token: 'test-token',
      clientId: '123456789',
    });

    await handler.registerCommands(
      [],
      [
        { name: 'Get Info', type: 'user' },
        { name: 'Report', type: 'message' },
      ]
    );
  });
});
