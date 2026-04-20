/**
 * Tests for M5 declarative cooldowns.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../../state/manager.js';
import { MemoryAdapter } from '@furlow/storage';
import {
  parseCooldownDuration,
  buildCooldownKey,
  checkAndConsumeCooldown,
} from '../index.js';

describe('cooldowns', () => {
  describe('parseCooldownDuration', () => {
    it('parses known suffixes', () => {
      expect(parseCooldownDuration('500ms')).toBe(500);
      expect(parseCooldownDuration('30s')).toBe(30_000);
      expect(parseCooldownDuration('5m')).toBe(300_000);
      expect(parseCooldownDuration('2h')).toBe(7_200_000);
      expect(parseCooldownDuration('1d')).toBe(86_400_000);
    });

    it('returns 0 for unparseable input', () => {
      expect(parseCooldownDuration('soon')).toBe(0);
      expect(parseCooldownDuration('')).toBe(0);
      expect(parseCooldownDuration('-5s')).toBe(0);
    });

    it('accepts raw numbers', () => {
      expect(parseCooldownDuration(1234)).toBe(1234);
      expect(parseCooldownDuration(0)).toBe(0);
    });
  });

  describe('buildCooldownKey', () => {
    it('builds per-user keys', () => {
      expect(buildCooldownKey('daily', 'user', { userId: 'u1' })).toBe('cooldown:daily:user:u1');
    });

    it('builds per-channel keys', () => {
      expect(buildCooldownKey('trivia', 'channel', { channelId: 'c1' })).toBe('cooldown:trivia:channel:c1');
    });

    it('builds per-guild keys', () => {
      expect(buildCooldownKey('announce', 'guild', { guildId: 'g1' })).toBe('cooldown:announce:guild:g1');
    });

    it('builds global keys with no scope id', () => {
      expect(buildCooldownKey('broadcast', 'global', {})).toBe('cooldown:broadcast:global:');
    });
  });

  describe('checkAndConsumeCooldown', () => {
    let manager: StateManager;

    beforeEach(() => {
      manager = new StateManager(new MemoryAdapter());
    });

    it('allows the first invocation and stores the cooldown', async () => {
      const result = await checkAndConsumeCooldown(
        manager,
        'daily',
        { per: 'user', duration: '1h' },
        { userId: 'u1' },
      );
      expect(result.allowed).toBe(true);
    });

    it('blocks subsequent invocations inside the window', async () => {
      await checkAndConsumeCooldown(
        manager,
        'daily',
        { per: 'user', duration: '1h', message: 'Wait' },
        { userId: 'u1' },
      );
      const second = await checkAndConsumeCooldown(
        manager,
        'daily',
        { per: 'user', duration: '1h', message: 'Wait' },
        { userId: 'u1' },
      );
      expect(second.allowed).toBe(false);
      expect(second.remainingMs).toBeGreaterThan(0);
      expect(second.message).toBe('Wait');
    });

    it('allows different users independently', async () => {
      await checkAndConsumeCooldown(
        manager,
        'daily',
        { per: 'user', duration: '1h' },
        { userId: 'u1' },
      );
      const other = await checkAndConsumeCooldown(
        manager,
        'daily',
        { per: 'user', duration: '1h' },
        { userId: 'u2' },
      );
      expect(other.allowed).toBe(true);
    });

    it('distinguishes handler ids', async () => {
      await checkAndConsumeCooldown(
        manager,
        'daily',
        { per: 'user', duration: '1h' },
        { userId: 'u1' },
      );
      const fish = await checkAndConsumeCooldown(
        manager,
        'fish',
        { per: 'user', duration: '1h' },
        { userId: 'u1' },
      );
      expect(fish.allowed).toBe(true);
    });

    it('is an immediate no-op when duration parses to 0', async () => {
      const r = await checkAndConsumeCooldown(
        manager,
        'noop',
        { per: 'user', duration: 'bogus' },
        { userId: 'u1' },
      );
      expect(r.allowed).toBe(true);
    });

    it('unblocks after the configured duration elapses', async () => {
      // Use injectable `now` so we do not have to actually sleep.
      let fakeNow = 1_000_000_000;
      const now = () => fakeNow;

      const first = await checkAndConsumeCooldown(
        manager,
        'daily',
        { per: 'user', duration: '1s' },
        { userId: 'u1' },
        now,
      );
      expect(first.allowed).toBe(true);

      fakeNow += 500;
      const second = await checkAndConsumeCooldown(
        manager,
        'daily',
        { per: 'user', duration: '1s' },
        { userId: 'u1' },
        now,
      );
      expect(second.allowed).toBe(false);

      fakeNow += 600; // past the window
      const third = await checkAndConsumeCooldown(
        manager,
        'daily',
        { per: 'user', duration: '1s' },
        { userId: 'u1' },
        now,
      );
      expect(third.allowed).toBe(true);
    });
  });
});
