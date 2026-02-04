/**
 * Mock utilities tests
 */

import { describe, it, expect } from 'vitest';
import {
  createMockUser,
  createMockMember,
  createMockGuild,
  createMockChannel,
  createMockMessage,
  createMockRole,
  createMockVoiceChannel,
  createMockThread,
  createMockInteraction,
  createMockButton,
  createMockSelectMenu,
  createMockSelectOption,
  MockDiscordClient,
} from '../mocks/index.js';

describe('Mock Utilities', () => {
  describe('createMockUser', () => {
    it('should create a user with default values', () => {
      const user = createMockUser();

      expect(user.id).toBe('123456789012345678');
      expect(user.username).toBe('testuser');
      expect(user.discriminator).toBe('0001');
      expect(user.tag).toBe('testuser#0001');
      expect(user.avatar).toBeNull();
      expect(user.bot).toBe(false);
    });

    it('should allow overriding values', () => {
      const user = createMockUser({
        id: 'custom-id',
        username: 'custom-user',
        bot: true,
      });

      expect(user.id).toBe('custom-id');
      expect(user.username).toBe('custom-user');
      expect(user.bot).toBe(true);
    });
  });

  describe('createMockMember', () => {
    it('should create a member with default values', () => {
      const member = createMockMember();

      expect(member.id).toBeDefined();
      expect(member.nickname).toBeNull();
      expect(member.roles).toEqual([]);
      expect(member.joinedAt).toBeInstanceOf(Date);
    });

    it('should inherit user properties', () => {
      const member = createMockMember();

      expect(member.username).toBe('testuser');
      expect(member.bot).toBe(false);
    });

    it('should allow overriding values', () => {
      const member = createMockMember({
        nickname: 'Cool User',
        roles: ['role1', 'role2'],
      });

      expect(member.nickname).toBe('Cool User');
      expect(member.roles).toEqual(['role1', 'role2']);
    });
  });

  describe('createMockGuild', () => {
    it('should create a guild with default values', () => {
      const guild = createMockGuild();

      expect(guild.id).toBe('987654321098765432');
      expect(guild.name).toBe('Test Server');
      expect(guild.ownerId).toBe('123456789012345678');
      expect(guild.memberCount).toBe(100);
    });

    it('should allow overriding values', () => {
      const guild = createMockGuild({
        name: 'Custom Server',
        memberCount: 500,
      });

      expect(guild.name).toBe('Custom Server');
      expect(guild.memberCount).toBe(500);
    });
  });

  describe('createMockChannel', () => {
    it('should create a channel with default values', () => {
      const channel = createMockChannel();

      expect(channel.id).toBe('111222333444555666');
      expect(channel.name).toBe('general');
      expect(channel.type).toBe('text');
      expect(channel.guildId).toBe('987654321098765432');
    });

    it('should allow overriding values', () => {
      const channel = createMockChannel({
        name: 'announcements',
        nsfw: true,
      });

      expect(channel.name).toBe('announcements');
      expect(channel.nsfw).toBe(true);
    });
  });

  describe('createMockMessage', () => {
    it('should create a message with default values', () => {
      const message = createMockMessage();

      expect(message.id).toBe('999888777666555444');
      expect(message.content).toBe('Hello, world!');
      expect(message.authorId).toBe('123456789012345678');
      expect(message.channelId).toBe('111222333444555666');
      expect(message.guildId).toBe('987654321098765432');
      expect(message.createdAt).toBeInstanceOf(Date);
    });

    it('should allow overriding values', () => {
      const message = createMockMessage({
        content: 'Custom message',
      });

      expect(message.content).toBe('Custom message');
    });
  });

  describe('createMockRole', () => {
    it('should create a role with default values', () => {
      const role = createMockRole();

      expect(role.id).toBe('444555666777888999');
      expect(role.name).toBe('Test Role');
      expect(role.color).toBe(0x5865f2);
      expect(role.hoist).toBe(false);
      expect(role.position).toBe(1);
      expect(role.permissions).toBe('0');
      expect(role.mentionable).toBe(false);
      expect(role.guildId).toBe('987654321098765432');
    });

    it('should allow overriding values', () => {
      const role = createMockRole({
        name: 'Admin',
        color: 0xff0000,
        hoist: true,
        mentionable: true,
      });

      expect(role.name).toBe('Admin');
      expect(role.color).toBe(0xff0000);
      expect(role.hoist).toBe(true);
      expect(role.mentionable).toBe(true);
    });
  });

  describe('createMockVoiceChannel', () => {
    it('should create a voice channel with default values', () => {
      const channel = createMockVoiceChannel();

      expect(channel.id).toBe('222333444555666777');
      expect(channel.name).toBe('General Voice');
      expect(channel.type).toBe('voice');
      expect(channel.bitrate).toBe(64000);
      expect(channel.userLimit).toBe(0);
      expect(channel.rtcRegion).toBeNull();
    });

    it('should allow overriding values', () => {
      const channel = createMockVoiceChannel({
        name: 'Music',
        bitrate: 96000,
        userLimit: 10,
      });

      expect(channel.name).toBe('Music');
      expect(channel.bitrate).toBe(96000);
      expect(channel.userLimit).toBe(10);
    });
  });

  describe('createMockThread', () => {
    it('should create a thread with default values', () => {
      const thread = createMockThread();

      expect(thread.id).toBe('333444555666777888');
      expect(thread.name).toBe('Test Thread');
      expect(thread.type).toBe('thread');
      expect(thread.parentId).toBe('111222333444555666');
      expect(thread.ownerId).toBe('123456789012345678');
      expect(thread.archived).toBe(false);
      expect(thread.locked).toBe(false);
      expect(thread.messageCount).toBe(10);
      expect(thread.memberCount).toBe(3);
    });

    it('should allow overriding values', () => {
      const thread = createMockThread({
        name: 'Help Thread',
        archived: true,
        locked: true,
      });

      expect(thread.name).toBe('Help Thread');
      expect(thread.archived).toBe(true);
      expect(thread.locked).toBe(true);
    });
  });

  describe('createMockInteraction', () => {
    it('should create an interaction with default values', () => {
      const interaction = createMockInteraction();

      expect(interaction.id).toBe('555666777888999000');
      expect(interaction.type).toBe(2); // APPLICATION_COMMAND
      expect(interaction.guildId).toBe('987654321098765432');
      expect(interaction.channelId).toBe('111222333444555666');
      expect(interaction.userId).toBe('123456789012345678');
      expect(interaction.token).toBe('mock-interaction-token');
      expect(interaction.commandName).toBe('test');
      expect(interaction.replied).toBe(false);
      expect(interaction.deferred).toBe(false);
    });

    it('should allow overriding values', () => {
      const interaction = createMockInteraction({
        type: 3, // MESSAGE_COMPONENT
        customId: 'button-click',
        replied: true,
      });

      expect(interaction.type).toBe(3);
      expect(interaction.customId).toBe('button-click');
      expect(interaction.replied).toBe(true);
    });
  });

  describe('createMockButton', () => {
    it('should create a button with default values', () => {
      const button = createMockButton();

      expect(button.customId).toBe('test-button');
      expect(button.label).toBe('Click Me');
      expect(button.style).toBe(1); // PRIMARY
      expect(button.disabled).toBe(false);
    });

    it('should allow overriding values', () => {
      const button = createMockButton({
        customId: 'confirm',
        label: 'Confirm',
        style: 3, // SUCCESS
        emoji: { name: '✅' },
      });

      expect(button.customId).toBe('confirm');
      expect(button.label).toBe('Confirm');
      expect(button.style).toBe(3);
      expect(button.emoji).toEqual({ name: '✅' });
    });
  });

  describe('createMockSelectMenu', () => {
    it('should create a select menu with default values', () => {
      const select = createMockSelectMenu();

      expect(select.customId).toBe('test-select');
      expect(select.placeholder).toBe('Select an option');
      expect(select.minValues).toBe(1);
      expect(select.maxValues).toBe(1);
      expect(select.disabled).toBe(false);
      expect(select.options).toHaveLength(2);
    });

    it('should allow overriding values', () => {
      const select = createMockSelectMenu({
        customId: 'roles-select',
        placeholder: 'Choose roles',
        maxValues: 5,
        options: [
          { label: 'Role A', value: 'role-a' },
          { label: 'Role B', value: 'role-b' },
          { label: 'Role C', value: 'role-c' },
        ],
      });

      expect(select.customId).toBe('roles-select');
      expect(select.placeholder).toBe('Choose roles');
      expect(select.maxValues).toBe(5);
      expect(select.options).toHaveLength(3);
    });
  });

  describe('createMockSelectOption', () => {
    it('should create a select option with default values', () => {
      const option = createMockSelectOption();

      expect(option.label).toBe('Option');
      expect(option.value).toBe('option');
    });

    it('should allow overriding values', () => {
      const option = createMockSelectOption({
        label: 'Premium',
        value: 'premium-tier',
        description: 'Access premium features',
        default: true,
      });

      expect(option.label).toBe('Premium');
      expect(option.value).toBe('premium-tier');
      expect(option.description).toBe('Access premium features');
      expect(option.default).toBe(true);
    });
  });

  describe('MockDiscordClient', () => {
    it('should create a client with default guild and channel', () => {
      const client = new MockDiscordClient();

      expect(client.user.bot).toBe(true);
      expect(client.guilds.size).toBe(1);
      expect(client.channels.size).toBe(1);
    });

    it('should allow registering and emitting events', () => {
      const client = new MockDiscordClient();
      let called = false;

      client.on('testEvent', () => {
        called = true;
      });

      client.emit('testEvent');
      expect(called).toBe(true);
    });

    it('should emit ready event on login', async () => {
      const client = new MockDiscordClient();
      let readyCalled = false;

      client.on('ready', () => {
        readyCalled = true;
      });

      await client.login('mock-token');
      expect(readyCalled).toBe(true);
    });

    it('should return true for isReady', () => {
      const client = new MockDiscordClient();
      expect(client.isReady()).toBe(true);
    });

    it('should clear listeners on destroy', async () => {
      const client = new MockDiscordClient();
      let called = false;

      client.on('testEvent', () => {
        called = true;
      });

      await client.destroy();
      client.emit('testEvent');

      expect(called).toBe(false);
    });
  });
});
