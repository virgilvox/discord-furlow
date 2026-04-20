import { describe, it, expect } from 'vitest';
import {
  collectCronHandlers,
  intervalToMinutes,
  minutesToCron,
  synthesizeCronJobs,
} from '../event-cron.js';
import type { EventHandler } from '@furlow/schema';

describe('event-cron helpers', () => {
  describe('intervalToMinutes', () => {
    it('parses seconds, minutes, hours, days, and ms', () => {
      expect(intervalToMinutes('30s')).toBe(1); // rounds up to 1 min
      expect(intervalToMinutes('90s')).toBe(2);
      expect(intervalToMinutes('5m')).toBe(5);
      expect(intervalToMinutes('2h')).toBe(120);
      expect(intervalToMinutes('1d')).toBe(1440);
      expect(intervalToMinutes('120000')).toBe(2); // 120_000ms -> 2 min
    });

    it('treats raw numbers as milliseconds', () => {
      expect(intervalToMinutes(60_000)).toBe(1);
      expect(intervalToMinutes(600_000)).toBe(10);
    });

    it('returns null for unparseable input', () => {
      expect(intervalToMinutes('soon')).toBeNull();
      expect(intervalToMinutes('5x')).toBeNull();
      expect(intervalToMinutes('' as string)).toBeNull();
    });

    it('never returns less than 1 minute', () => {
      expect(intervalToMinutes('1ms')).toBe(1);
      expect(intervalToMinutes('1s')).toBe(1);
    });
  });

  describe('minutesToCron', () => {
    it('produces */n format for sub-hour intervals', () => {
      expect(minutesToCron(1)).toBe('*/1 * * * *');
      expect(minutesToCron(5)).toBe('*/5 * * * *');
      expect(minutesToCron(30)).toBe('*/30 * * * *');
    });

    it('rolls over to hours past 60 min', () => {
      expect(minutesToCron(60)).toBe('0 */1 * * *');
      expect(minutesToCron(180)).toBe('0 */3 * * *');
    });

    it('rolls over to days past 24h', () => {
      expect(minutesToCron(60 * 24)).toBe('0 0 */1 * *');
      expect(minutesToCron(60 * 48)).toBe('0 0 */2 * *');
    });
  });

  describe('collectCronHandlers', () => {
    it('returns empty for undefined or empty events', () => {
      expect(collectCronHandlers(undefined)).toEqual([]);
      expect(collectCronHandlers([])).toEqual([]);
    });

    it('extracts explicit cron expressions', () => {
      const events: (EventHandler & { cron?: string })[] = [
        { event: 'hourly_chime', actions: [], cron: '0 * * * *' } as never,
        { event: 'never_triggers', actions: [] }, // no cron/interval
      ];
      const out = collectCronHandlers(events as never);
      expect(out).toHaveLength(1);
      expect(out[0]!.cron).toBe('0 * * * *');
    });

    it('converts interval: strings to cron format', () => {
      const events: (EventHandler & { interval?: string })[] = [
        { event: 'every_five', actions: [], interval: '5m' } as never,
      ];
      const out = collectCronHandlers(events as never);
      expect(out[0]!.cron).toBe('*/5 * * * *');
    });

    it('skips handlers with unparseable intervals and logs a warning', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const events: (EventHandler & { interval?: string })[] = [
        { event: 'bad', actions: [], interval: 'soon' } as never,
      ];
      expect(collectCronHandlers(events as never)).toEqual([]);
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
    });
  });

  describe('synthesizeCronJobs', () => {
    it('builds jobs with stable names', () => {
      const jobs = synthesizeCronJobs([
        { event: 'tick', handler: { event: 'tick', actions: [] }, cron: '* * * * *' },
        { event: 'tick', handler: { event: 'tick', actions: [] }, cron: '0 * * * *' },
      ]);
      expect(jobs[0]!.name).toBe('event:tick#0');
      expect(jobs[1]!.name).toBe('event:tick#1');
      expect(jobs[0]!.enabled).toBe(true);
    });

    it('forwards when conditions onto the job', () => {
      const jobs = synthesizeCronJobs([
        {
          event: 'cron_when',
          handler: { event: 'cron_when', actions: [], when: 'true' },
          cron: '* * * * *',
        },
      ]);
      expect(jobs[0]!.when).toBe('true');
    });
  });
});

import { vi } from 'vitest';
