/**
 * Per-handler observability (M8).
 *
 * A simple in-memory statistics store. The EventRouter (and optionally the
 * CLI command dispatcher) record one entry per handler id: how many times
 * it ran, when it last ran, and details about the most recent error.
 *
 * No persistence, no ring buffer rotation; a Map keyed on handler id. The
 * dashboard reads snapshots via `HandlerStats.snapshot()` and renders them.
 * Counter totals are also exposed for Prometheus scraping.
 */

export interface HandlerStatEntry {
  /** Opaque handler id (router-assigned or "cmd:<name>"). */
  id: string;
  /** Human-readable event or command name. */
  label: string;
  /** Invocation counter (successful and failed). */
  runCount: number;
  /** Error counter (subset of runCount). */
  errorCount: number;
  /** Timestamp (ms) of the most recent start. */
  lastRunAt: number | null;
  /** Timestamp (ms) of the most recent error. */
  lastErrorAt: number | null;
  /** Error message from the most recent failure, truncated to 500 chars. */
  lastError: string | null;
  /** Total nanoseconds spent inside the handler (for avg latency). */
  totalDurationMs: number;
}

export interface HandlerStatSnapshot extends HandlerStatEntry {
  avgDurationMs: number;
}

export class HandlerStats {
  private entries: Map<string, HandlerStatEntry> = new Map();

  /**
   * Record a successful invocation. `durationMs` is the wall-clock time
   * spent inside the handler's action sequence.
   */
  recordRun(id: string, label: string, durationMs: number): void {
    const e = this.entryFor(id, label);
    e.runCount++;
    e.lastRunAt = Date.now();
    e.totalDurationMs += Math.max(0, durationMs);
  }

  /**
   * Record a failed invocation. Counts toward runCount as well so totals
   * include both success and failure.
   */
  recordError(id: string, label: string, err: Error, durationMs: number): void {
    const e = this.entryFor(id, label);
    e.runCount++;
    e.errorCount++;
    const now = Date.now();
    e.lastRunAt = now;
    e.lastErrorAt = now;
    e.lastError = err.message.slice(0, 500);
    e.totalDurationMs += Math.max(0, durationMs);
  }

  /**
   * Snapshot all stats sorted by most-recently-run first.
   */
  snapshot(): HandlerStatSnapshot[] {
    return [...this.entries.values()]
      .map((e) => ({
        ...e,
        avgDurationMs: e.runCount > 0 ? e.totalDurationMs / e.runCount : 0,
      }))
      .sort((a, b) => (b.lastRunAt ?? 0) - (a.lastRunAt ?? 0));
  }

  /**
   * Total invocations across all handlers. Useful as a single Prometheus
   * counter.
   */
  totalRuns(): number {
    let sum = 0;
    for (const e of this.entries.values()) sum += e.runCount;
    return sum;
  }

  /**
   * Total errors across all handlers.
   */
  totalErrors(): number {
    let sum = 0;
    for (const e of this.entries.values()) sum += e.errorCount;
    return sum;
  }

  /**
   * Wipe all entries. Mostly useful in tests and on spec reload.
   */
  clear(): void {
    this.entries.clear();
  }

  private entryFor(id: string, label: string): HandlerStatEntry {
    let e = this.entries.get(id);
    if (!e) {
      e = {
        id,
        label,
        runCount: 0,
        errorCount: 0,
        lastRunAt: null,
        lastErrorAt: null,
        lastError: null,
        totalDurationMs: 0,
      };
      this.entries.set(id, e);
    }
    // Label can change if an anonymous handler is later given a name.
    if (label && e.label !== label) e.label = label;
    return e;
  }
}

let globalStats: HandlerStats | null = null;

/**
 * Shared statistics instance. Used by the CLI to surface stats to the
 * dashboard without threading the instance through every constructor.
 */
export function getHandlerStats(): HandlerStats {
  if (!globalStats) globalStats = new HandlerStats();
  return globalStats;
}

/**
 * Serialize snapshots into Prometheus-format exposition. Safe for direct
 * `/metrics` response bodies.
 */
export function renderPrometheus(stats: HandlerStats): string {
  const lines: string[] = [];
  lines.push('# HELP furlow_handler_runs_total Total handler invocations');
  lines.push('# TYPE furlow_handler_runs_total counter');
  lines.push(`furlow_handler_runs_total ${stats.totalRuns()}`);

  lines.push('# HELP furlow_handler_errors_total Total handler errors');
  lines.push('# TYPE furlow_handler_errors_total counter');
  lines.push(`furlow_handler_errors_total ${stats.totalErrors()}`);

  lines.push('# HELP furlow_handler_invocations Per-handler invocation count');
  lines.push('# TYPE furlow_handler_invocations counter');
  for (const s of stats.snapshot()) {
    const idLabel = s.id.replace(/"/g, '\\"');
    const nameLabel = s.label.replace(/"/g, '\\"');
    lines.push(`furlow_handler_invocations{id="${idLabel}",label="${nameLabel}"} ${s.runCount}`);
  }

  return lines.join('\n') + '\n';
}
