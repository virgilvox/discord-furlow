/**
 * Cron scheduler for scheduled jobs
 */

import type { CronJob, SchedulerConfig } from '@furlow/schema';
import type { ActionExecutor } from '../actions/executor.js';
import type { ActionContext } from '../actions/types.js';
import type { ExpressionEvaluator } from '../expression/evaluator.js';
import { handleError } from '../errors/handler.js';

interface ScheduledJob {
  id: string;
  config: CronJob;
  nextRun: Date;
  interval: NodeJS.Timeout | null;
}

export class CronScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private timezone: string = 'UTC';
  private running = false;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Configure the scheduler
   */
  configure(config: SchedulerConfig): void {
    this.timezone = config.timezone ?? 'UTC';

    // Register all jobs
    for (const job of config.jobs) {
      this.register(job);
    }
  }

  /**
   * Register a cron job
   */
  register(job: CronJob): string {
    const id = job.name;

    if (this.jobs.has(id)) {
      this.unregister(id);
    }

    const nextRun = this.getNextRun(job.cron, job.timezone ?? this.timezone);

    this.jobs.set(id, {
      id,
      config: job,
      nextRun,
      interval: null,
    });

    return id;
  }

  /**
   * Unregister a job
   */
  unregister(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (job.interval) {
      clearInterval(job.interval);
    }

    return this.jobs.delete(id);
  }

  /**
   * Start the scheduler
   */
  start(
    executor: ActionExecutor,
    evaluator: ExpressionEvaluator,
    contextBuilder: () => ActionContext
  ): void {
    if (this.running) return;
    this.running = true;

    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkJobs(executor, evaluator, contextBuilder).catch((err) => {
        handleError(
          err instanceof Error ? err : new Error(String(err)),
          'scheduler',
          'error',
          { phase: 'periodic_check' }
        );
      });
    }, 60000);

    // Initial check
    this.checkJobs(executor, evaluator, contextBuilder).catch((err) => {
      handleError(
        err instanceof Error ? err : new Error(String(err)),
        'scheduler',
        'error',
        { phase: 'initial_check' }
      );
    });
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.running = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    for (const job of this.jobs.values()) {
      if (job.interval) {
        clearInterval(job.interval);
        job.interval = null;
      }
    }
  }

  /**
   * Check and run due jobs
   */
  private async checkJobs(
    executor: ActionExecutor,
    evaluator: ExpressionEvaluator,
    contextBuilder: () => ActionContext
  ): Promise<void> {
    const now = new Date();

    for (const job of this.jobs.values()) {
      if (!job.config.enabled) continue;
      if (job.nextRun > now) continue;

      // Build context
      const context = contextBuilder();

      // Check when condition
      if (job.config.when) {
        const condition = typeof job.config.when === 'string'
          ? job.config.when
          : (job.config.when.expr ?? 'true');
        const shouldRun = await evaluator.evaluate<boolean>(condition, context);
        if (!shouldRun) {
          job.nextRun = this.getNextRun(
            job.config.cron,
            job.config.timezone ?? this.timezone
          );
          continue;
        }
      }

      // Normalize and execute actions
      try {
        const normalizedActions = normalizeActions(job.config.actions);
        await executor.executeSequence(normalizedActions, context);
      } catch (err) {
        handleError(
          err instanceof Error ? err : new Error(String(err)),
          'scheduler',
          'error',
          { jobId: job.id, cron: job.config.cron }
        );
      }

      // Schedule next run
      job.nextRun = this.getNextRun(
        job.config.cron,
        job.config.timezone ?? this.timezone
      );
    }
  }

  /**
   * Get the next run time for a cron expression
   * Supports standard 5-field cron: minute hour day-of-month month day-of-week
   * Special values: star (any), star/n (every n), n-m (range), n,m (list)
   */
  private getNextRun(cron: string, _timezone: string): Date {
    const parts = cron.split(/\s+/);

    if (parts.length < 5) {
      console.warn(`Invalid cron expression "${cron}", defaulting to 1 minute`);
      return new Date(Date.now() + 60000);
    }

    const [minuteSpec, hourSpec, daySpec, monthSpec, dowSpec] = parts;

    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Add 1 minute to start searching from next minute
    next.setMinutes(next.getMinutes() + 1);

    // Search up to 1 year ahead
    const maxIterations = 525600; // ~1 year of minutes
    for (let i = 0; i < maxIterations; i++) {
      const minute = next.getMinutes();
      const hour = next.getHours();
      const day = next.getDate();
      const month = next.getMonth() + 1; // 1-12
      const dow = next.getDay(); // 0-6 (Sunday = 0)

      if (
        this.matchesCronField(minuteSpec!, minute, 0, 59) &&
        this.matchesCronField(hourSpec!, hour, 0, 23) &&
        this.matchesCronField(daySpec!, day, 1, 31) &&
        this.matchesCronField(monthSpec!, month, 1, 12) &&
        this.matchesCronField(dowSpec!, dow, 0, 6)
      ) {
        return next;
      }

      // Advance by 1 minute
      next.setMinutes(next.getMinutes() + 1);
    }

    // Fallback - should rarely reach here
    console.warn(`Could not find next run for cron "${cron}", defaulting to 1 hour`);
    return new Date(Date.now() + 3600000);
  }

  /**
   * Check if a value matches a cron field specification
   */
  private matchesCronField(spec: string, value: number, min: number, max: number): boolean {
    // Any value
    if (spec === '*') {
      return true;
    }

    // Step value (*/n or n/m)
    if (spec.includes('/')) {
      const [rangeOrStar, stepStr] = spec.split('/');
      const step = parseInt(stepStr!, 10);
      if (isNaN(step) || step <= 0) return false;

      let start = min;
      if (rangeOrStar !== '*') {
        start = parseInt(rangeOrStar!, 10);
        if (isNaN(start)) return false;
      }
      return (value - start) % step === 0 && value >= start;
    }

    // List (n,m,o)
    if (spec.includes(',')) {
      const values = spec.split(',').map((s) => {
        // Handle ranges within lists
        if (s.includes('-')) {
          const [startStr, endStr] = s.split('-');
          const start = parseInt(startStr!, 10);
          const end = parseInt(endStr!, 10);
          // Cap range size to prevent memory exhaustion (max 100 elements per range)
          const MAX_RANGE_SIZE = 100;
          if (isNaN(start) || isNaN(end) || end - start > MAX_RANGE_SIZE) {
            console.warn(`Cron range too large or invalid: ${s}, capping at ${MAX_RANGE_SIZE}`);
            return [];
          }
          const range: number[] = [];
          for (let i = start; i <= Math.min(end, start + MAX_RANGE_SIZE); i++) range.push(i);
          return range;
        }
        return [parseInt(s, 10)];
      });
      return values.flat().includes(value);
    }

    // Range (n-m)
    if (spec.includes('-')) {
      const [startStr, endStr] = spec.split('-');
      const start = parseInt(startStr!, 10);
      const end = parseInt(endStr!, 10);
      return value >= start && value <= end;
    }

    // Exact value
    const exact = parseInt(spec, 10);
    return value === exact;
  }

  /**
   * Get all job names
   */
  getJobNames(): string[] {
    return [...this.jobs.keys()];
  }

  /**
   * Get job info
   */
  getJob(id: string): ScheduledJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.running;
  }
}

/**
 * Normalize actions from YAML shorthand format to schema format
 * YAML allows: { reply: { content: "..." } }
 * Schema expects: { action: "reply", content: "..." }
 */
function normalizeActions(actions: any[]): any[] {
  return actions.map((action) => {
    // If action already has 'action' property, it's in schema format
    if (action.action) {
      return action;
    }

    // Convert shorthand to schema format
    for (const [key, value] of Object.entries(action)) {
      if (key === 'when' || key === 'error_handler') continue;

      // Found the action type
      const normalized: any = {
        action: key,
        ...((typeof value === 'object' && value !== null) ? value : {}),
      };

      // Copy over when and error_handler if present
      if (action.when) normalized.when = action.when;
      if (action.error_handler) normalized.error_handler = action.error_handler;

      return normalized;
    }

    return action;
  });
}

/**
 * Create a cron scheduler
 */
export function createCronScheduler(): CronScheduler {
  return new CronScheduler();
}
