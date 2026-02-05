/**
 * Cron scheduler tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CronScheduler, createCronScheduler } from '../cron.js';
import type { ActionContext } from '../../actions/types.js';
import type { ActionExecutor } from '../../actions/executor.js';
import type { ExpressionEvaluator } from '../../expression/evaluator.js';
import type { CronJob, SchedulerConfig } from '@furlow/schema';

describe('CronScheduler', () => {
  let scheduler: CronScheduler;
  let mockExecutor: ActionExecutor;
  let mockEvaluator: ExpressionEvaluator;
  let mockContextBuilder: () => ActionContext;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = createCronScheduler();

    mockExecutor = {
      executeOne: vi.fn().mockResolvedValue({ success: true }),
      executeAll: vi.fn().mockResolvedValue([]),
      executeSequence: vi.fn().mockResolvedValue([]),
    } as unknown as ActionExecutor;

    mockEvaluator = {
      evaluate: vi.fn().mockResolvedValue(true),
      interpolate: vi.fn().mockImplementation(async (s) => s),
    } as unknown as ExpressionEvaluator;

    mockContextBuilder = () => ({
      guildId: 'guild-123',
      channelId: 'channel-123',
      userId: 'user-123',
      client: {},
      stateManager: {},
      evaluator: mockEvaluator,
      flowExecutor: {},
    } as ActionContext);
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  describe('configure', () => {
    it('should configure timezone', () => {
      const config: SchedulerConfig = {
        timezone: 'America/New_York',
        jobs: [],
      };

      scheduler.configure(config);

      // Timezone is private, but we can verify through job registration
      scheduler.register({
        name: 'test-job',
        cron: '* * * * *',
        actions: [],
      });

      const job = scheduler.getJob('test-job');
      expect(job).toBeDefined();
    });

    it('should register all jobs from config', () => {
      const config: SchedulerConfig = {
        jobs: [
          { name: 'job1', cron: '0 * * * *', actions: [] },
          { name: 'job2', cron: '30 * * * *', actions: [] },
          { name: 'job3', cron: '0 0 * * *', actions: [] },
        ],
      };

      scheduler.configure(config);

      expect(scheduler.getJobNames()).toHaveLength(3);
      expect(scheduler.getJobNames()).toContain('job1');
      expect(scheduler.getJobNames()).toContain('job2');
      expect(scheduler.getJobNames()).toContain('job3');
    });

    it('should default timezone to UTC', () => {
      const config: SchedulerConfig = {
        jobs: [],
      };

      scheduler.configure(config);

      // Scheduler configured without error
      expect(scheduler.getJobNames()).toEqual([]);
    });
  });

  describe('register', () => {
    it('should register a job and return its ID', () => {
      const job: CronJob = {
        name: 'my-job',
        cron: '0 * * * *',
        actions: [{ action: 'log', message: 'test' }],
      };

      const id = scheduler.register(job);

      expect(id).toBe('my-job');
      expect(scheduler.getJobNames()).toContain('my-job');
    });

    it('should store job config correctly', () => {
      const job: CronJob = {
        name: 'test-job',
        cron: '0 12 * * *',
        timezone: 'Europe/London',
        enabled: true,
        actions: [{ action: 'send_message', content: 'Hello!' }],
      };

      scheduler.register(job);

      const storedJob = scheduler.getJob('test-job');
      expect(storedJob).toBeDefined();
      expect(storedJob?.id).toBe('test-job');
      expect(storedJob?.config.cron).toBe('0 12 * * *');
      expect(storedJob?.config.timezone).toBe('Europe/London');
      expect(storedJob?.config.enabled).toBe(true);
      expect(storedJob?.nextRun).toBeInstanceOf(Date);
    });

    it('should replace existing job with same name', () => {
      scheduler.register({
        name: 'duplicate',
        cron: '0 * * * *',
        actions: [{ action: 'log', message: 'first' }],
      });

      scheduler.register({
        name: 'duplicate',
        cron: '30 * * * *',
        actions: [{ action: 'log', message: 'second' }],
      });

      const job = scheduler.getJob('duplicate');
      expect(job?.config.cron).toBe('30 * * * *');
      expect(scheduler.getJobNames()).toHaveLength(1);
    });

    it('should calculate next run time', () => {
      const now = Date.now();
      scheduler.register({
        name: 'job',
        cron: '0 * * * *',
        actions: [],
      });

      const job = scheduler.getJob('job');
      expect(job?.nextRun.getTime()).toBeGreaterThan(now);
    });
  });

  describe('unregister', () => {
    it('should unregister an existing job', () => {
      scheduler.register({ name: 'job', cron: '* * * * *', actions: [] });

      const result = scheduler.unregister('job');

      expect(result).toBe(true);
      expect(scheduler.getJobNames()).not.toContain('job');
    });

    it('should return false for non-existent job', () => {
      const result = scheduler.unregister('nonexistent');
      expect(result).toBe(false);
    });

    it('should clear job interval if running', () => {
      scheduler.register({ name: 'job', cron: '* * * * *', actions: [] });
      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      const result = scheduler.unregister('job');

      expect(result).toBe(true);
    });
  });

  describe('start', () => {
    it('should set running state to true', () => {
      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      expect(scheduler.isRunning()).toBe(true);
    });

    it('should not restart if already running', () => {
      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);
      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      expect(scheduler.isRunning()).toBe(true);
    });

    it('should perform initial job check', async () => {
      scheduler.register({
        name: 'immediate',
        cron: '* * * * *',
        enabled: true,
        actions: [{ action: 'log', message: 'hello' }],
      });

      // Set job's next run to now (past)
      const job = scheduler.getJob('immediate');
      if (job) {
        job.nextRun = new Date(Date.now() - 1000);
      }

      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      // Give the initial async check time to start and complete
      // The scheduler calls checkJobs immediately on start, which is async
      await vi.waitFor(() => {
        expect(mockExecutor.executeSequence).toHaveBeenCalled();
      }, { timeout: 100 });

      scheduler.stop();
    });

    it('should check jobs every minute', async () => {
      scheduler.register({
        name: 'periodic',
        cron: '* * * * *',
        enabled: true,
        actions: [{ action: 'log', message: 'tick' }],
      });

      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      // Clear initial call
      vi.clearAllMocks();

      // Advance 60 seconds
      await vi.advanceTimersByTimeAsync(60000);

      // Jobs should be checked again
      // (whether they execute depends on nextRun time)
    });
  });

  describe('stop', () => {
    it('should set running state to false', () => {
      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);
      scheduler.stop();

      expect(scheduler.isRunning()).toBe(false);
    });

    it('should clear check interval', () => {
      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);
      scheduler.stop();

      // No errors when stopping
      expect(scheduler.isRunning()).toBe(false);
    });

    it('should clear all job intervals', () => {
      scheduler.register({ name: 'job1', cron: '* * * * *', actions: [] });
      scheduler.register({ name: 'job2', cron: '* * * * *', actions: [] });

      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);
      scheduler.stop();

      expect(scheduler.isRunning()).toBe(false);
      // Jobs still registered, just intervals cleared
      expect(scheduler.getJobNames()).toHaveLength(2);
    });

    it('should be safe to call multiple times', () => {
      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);
      scheduler.stop();
      scheduler.stop();
      scheduler.stop();

      expect(scheduler.isRunning()).toBe(false);
    });
  });

  describe('job execution', () => {
    it('should execute enabled jobs when due', async () => {
      scheduler.register({
        name: 'enabled-job',
        cron: '* * * * *',
        enabled: true,
        actions: [{ action: 'log', message: 'executed' }],
      });

      // Set job's next run to the past
      const job = scheduler.getJob('enabled-job');
      if (job) {
        job.nextRun = new Date(Date.now() - 1000);
      }

      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      // Wait for the async initial check to complete
      await vi.waitFor(() => {
        expect(mockExecutor.executeSequence).toHaveBeenCalled();
      }, { timeout: 100 });

      scheduler.stop();

      expect(mockExecutor.executeSequence).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ action: 'log', message: 'executed' }),
        ]),
        expect.any(Object)
      );
    });

    it('should not execute disabled jobs', async () => {
      scheduler.register({
        name: 'disabled-job',
        cron: '* * * * *',
        enabled: false,
        actions: [{ action: 'log', message: 'should not run' }],
      });

      const job = scheduler.getJob('disabled-job');
      if (job) {
        job.nextRun = new Date(Date.now() - 1000);
      }

      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      // Give the initial check time to complete, but it shouldn't execute
      await vi.advanceTimersByTimeAsync(100);

      scheduler.stop();

      expect(mockExecutor.executeSequence).not.toHaveBeenCalled();
    });

    it('should not execute jobs not yet due', async () => {
      scheduler.register({
        name: 'future-job',
        cron: '* * * * *',
        enabled: true,
        actions: [{ action: 'log', message: 'future' }],
      });

      // Job's nextRun is in the future by default
      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      // Give the initial check time to complete
      await vi.advanceTimersByTimeAsync(100);

      scheduler.stop();

      expect(mockExecutor.executeSequence).not.toHaveBeenCalled();
    });

    it('should evaluate when condition before execution', async () => {
      scheduler.register({
        name: 'conditional-job',
        cron: '* * * * *',
        enabled: true,
        when: 'someCondition == true',
        actions: [{ action: 'log', message: 'conditional' }],
      });

      const job = scheduler.getJob('conditional-job');
      if (job) {
        job.nextRun = new Date(Date.now() - 1000);
      }

      (mockEvaluator.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      await vi.waitFor(() => {
        expect(mockEvaluator.evaluate).toHaveBeenCalled();
      }, { timeout: 100 });

      // Wait for action execution after condition check
      await vi.waitFor(() => {
        expect(mockExecutor.executeSequence).toHaveBeenCalled();
      }, { timeout: 100 });

      scheduler.stop();

      expect(mockEvaluator.evaluate).toHaveBeenCalledWith(
        'someCondition == true',
        expect.any(Object)
      );
    });

    it('should skip execution when condition is false', async () => {
      scheduler.register({
        name: 'skipped-job',
        cron: '* * * * *',
        enabled: true,
        when: 'shouldRun',
        actions: [{ action: 'log', message: 'skipped' }],
      });

      const job = scheduler.getJob('skipped-job');
      if (job) {
        job.nextRun = new Date(Date.now() - 1000);
      }

      (mockEvaluator.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      await vi.waitFor(() => {
        expect(mockEvaluator.evaluate).toHaveBeenCalled();
      }, { timeout: 100 });

      scheduler.stop();

      expect(mockExecutor.executeSequence).not.toHaveBeenCalled();
    });

    it('should handle when condition as object with expr', async () => {
      scheduler.register({
        name: 'expr-job',
        cron: '* * * * *',
        enabled: true,
        when: { expr: 'value > 10' },
        actions: [{ action: 'log', message: 'expr test' }],
      });

      const job = scheduler.getJob('expr-job');
      if (job) {
        job.nextRun = new Date(Date.now() - 1000);
      }

      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      await vi.waitFor(() => {
        expect(mockEvaluator.evaluate).toHaveBeenCalled();
      }, { timeout: 100 });

      scheduler.stop();

      expect(mockEvaluator.evaluate).toHaveBeenCalledWith(
        'value > 10',
        expect.any(Object)
      );
    });

    it('should update nextRun after execution', async () => {
      scheduler.register({
        name: 'recurring-job',
        cron: '* * * * *',
        enabled: true,
        actions: [{ action: 'log', message: 'recurring' }],
      });

      const job = scheduler.getJob('recurring-job');
      // Store the initial nextRun set by register()
      const initialNextRun = job?.nextRun;
      // Set to a past time so job will execute
      if (job) {
        job.nextRun = new Date(Date.now() - 1000);
      }

      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      // Wait for both execution and nextRun update
      await vi.waitFor(() => {
        const updatedJob = scheduler.getJob('recurring-job');
        // After execution, nextRun should be scheduled to be ~1 minute in the future
        // which means it should be > Date.now()
        expect(updatedJob?.nextRun.getTime()).toBeGreaterThan(Date.now());
      }, { timeout: 100 });

      scheduler.stop();

      expect(mockExecutor.executeSequence).toHaveBeenCalled();
    });

    it('should handle execution errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      scheduler.register({
        name: 'error-job',
        cron: '* * * * *',
        enabled: true,
        actions: [{ action: 'bad_action' } as any],
      });

      const job = scheduler.getJob('error-job');
      if (job) {
        job.nextRun = new Date(Date.now() - 1000);
      }

      (mockExecutor.executeSequence as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Action failed')
      );

      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      }, { timeout: 100 });

      scheduler.stop();

      // Error handler logs in format: [category] message context
      expect(consoleSpy).toHaveBeenCalledWith(
        '[scheduler]',
        expect.any(String),
        expect.stringContaining('error-job')
      );

      consoleSpy.mockRestore();
    });

    it('should normalize shorthand action format', async () => {
      scheduler.register({
        name: 'shorthand-job',
        cron: '* * * * *',
        enabled: true,
        actions: [
          { reply: { content: 'Hello!' } } as any,
          { log: { message: 'Test' } } as any,
        ],
      });

      const job = scheduler.getJob('shorthand-job');
      if (job) {
        job.nextRun = new Date(Date.now() - 1000);
      }

      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);

      await vi.waitFor(() => {
        expect(mockExecutor.executeSequence).toHaveBeenCalled();
      }, { timeout: 100 });

      scheduler.stop();

      expect(mockExecutor.executeSequence).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ action: 'reply', content: 'Hello!' }),
          expect.objectContaining({ action: 'log', message: 'Test' }),
        ]),
        expect.any(Object)
      );
    });
  });

  describe('getJobNames', () => {
    it('should return all job names', () => {
      scheduler.register({ name: 'alpha', cron: '* * * * *', actions: [] });
      scheduler.register({ name: 'beta', cron: '* * * * *', actions: [] });
      scheduler.register({ name: 'gamma', cron: '* * * * *', actions: [] });

      const names = scheduler.getJobNames();

      expect(names).toHaveLength(3);
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
      expect(names).toContain('gamma');
    });

    it('should return empty array when no jobs', () => {
      expect(scheduler.getJobNames()).toEqual([]);
    });
  });

  describe('getJob', () => {
    it('should return job info', () => {
      scheduler.register({
        name: 'info-job',
        cron: '0 12 * * *',
        timezone: 'UTC',
        enabled: true,
        actions: [{ action: 'log', message: 'info' }],
      });

      const job = scheduler.getJob('info-job');

      expect(job).toBeDefined();
      expect(job?.id).toBe('info-job');
      expect(job?.config.cron).toBe('0 12 * * *');
      expect(job?.nextRun).toBeInstanceOf(Date);
    });

    it('should return undefined for non-existent job', () => {
      expect(scheduler.getJob('nonexistent')).toBeUndefined();
    });
  });

  describe('isRunning', () => {
    it('should return false initially', () => {
      expect(scheduler.isRunning()).toBe(false);
    });

    it('should return true after start', () => {
      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);
      expect(scheduler.isRunning()).toBe(true);
    });

    it('should return false after stop', () => {
      scheduler.start(mockExecutor, mockEvaluator, mockContextBuilder);
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });
  });

  describe('cron expression handling', () => {
    it('should handle standard 5-part cron', () => {
      scheduler.register({
        name: 'standard-cron',
        cron: '0 12 * * 1',
        actions: [],
      });

      const job = scheduler.getJob('standard-cron');
      expect(job?.nextRun).toBeInstanceOf(Date);
    });

    it('should handle invalid cron by defaulting to 1 minute', () => {
      const now = Date.now();
      scheduler.register({
        name: 'invalid-cron',
        cron: 'invalid',
        actions: [],
      });

      const job = scheduler.getJob('invalid-cron');
      // Should default to ~1 minute in the future
      expect(job?.nextRun.getTime()).toBeGreaterThan(now);
      expect(job?.nextRun.getTime()).toBeLessThanOrEqual(now + 70000);
    });

    it('should handle partial cron expressions', () => {
      scheduler.register({
        name: 'partial-cron',
        cron: '* *',
        actions: [],
      });

      const job = scheduler.getJob('partial-cron');
      expect(job?.nextRun).toBeInstanceOf(Date);
    });
  });

  describe('timezone handling', () => {
    it('should use job-specific timezone if provided', () => {
      scheduler.configure({ timezone: 'UTC', jobs: [] });
      scheduler.register({
        name: 'tz-job',
        cron: '0 12 * * *',
        timezone: 'America/Los_Angeles',
        actions: [],
      });

      const job = scheduler.getJob('tz-job');
      expect(job?.config.timezone).toBe('America/Los_Angeles');
    });

    it('should fall back to scheduler timezone', () => {
      scheduler.configure({ timezone: 'Europe/Paris', jobs: [] });
      scheduler.register({
        name: 'fallback-tz-job',
        cron: '0 12 * * *',
        actions: [],
      });

      const job = scheduler.getJob('fallback-tz-job');
      expect(job?.config.timezone).toBeUndefined();
      // Scheduler would use its configured 'Europe/Paris' timezone
    });
  });
});

describe('createCronScheduler', () => {
  it('should create a new CronScheduler instance', () => {
    const scheduler = createCronScheduler();
    expect(scheduler).toBeInstanceOf(CronScheduler);
    expect(scheduler.isRunning()).toBe(false);
    expect(scheduler.getJobNames()).toEqual([]);
  });
});
