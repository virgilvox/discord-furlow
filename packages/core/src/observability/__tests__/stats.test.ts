import { describe, it, expect } from 'vitest';
import { HandlerStats, renderPrometheus, getHandlerStats } from '../index.js';

describe('HandlerStats (M8)', () => {
  it('records runs and snapshots them', () => {
    const s = new HandlerStats();
    s.recordRun('h1', 'message_create', 10);
    s.recordRun('h1', 'message_create', 20);

    const snap = s.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0]!.runCount).toBe(2);
    expect(snap[0]!.errorCount).toBe(0);
    expect(snap[0]!.avgDurationMs).toBe(15);
    expect(snap[0]!.lastRunAt).toBeGreaterThan(0);
  });

  it('records errors and captures the message', () => {
    const s = new HandlerStats();
    s.recordError('h2', 'member_join', new Error('boom'), 5);

    const snap = s.snapshot();
    expect(snap[0]!.runCount).toBe(1);
    expect(snap[0]!.errorCount).toBe(1);
    expect(snap[0]!.lastError).toBe('boom');
    expect(snap[0]!.lastErrorAt).toBeGreaterThan(0);
  });

  it('truncates long error messages to 500 chars', () => {
    const s = new HandlerStats();
    const big = 'x'.repeat(2000);
    s.recordError('h3', 'x', new Error(big), 1);
    expect(s.snapshot()[0]!.lastError!.length).toBe(500);
  });

  it('sorts snapshots by most-recent run first', async () => {
    const s = new HandlerStats();
    s.recordRun('a', 'a', 1);
    await new Promise((r) => setTimeout(r, 2));
    s.recordRun('b', 'b', 1);

    const snap = s.snapshot();
    expect(snap[0]!.id).toBe('b');
    expect(snap[1]!.id).toBe('a');
  });

  it('totalRuns and totalErrors aggregate correctly', () => {
    const s = new HandlerStats();
    s.recordRun('a', 'a', 1);
    s.recordError('a', 'a', new Error('x'), 1);
    s.recordRun('b', 'b', 1);

    expect(s.totalRuns()).toBe(3);
    expect(s.totalErrors()).toBe(1);
  });

  it('clear wipes all entries', () => {
    const s = new HandlerStats();
    s.recordRun('a', 'a', 1);
    s.clear();
    expect(s.snapshot()).toEqual([]);
    expect(s.totalRuns()).toBe(0);
  });

  it('renderPrometheus emits counters and per-handler lines', () => {
    const s = new HandlerStats();
    s.recordRun('h1', 'message_create', 1);
    s.recordError('h2', 'guild_delete', new Error('oops'), 1);

    const text = renderPrometheus(s);
    expect(text).toContain('furlow_handler_runs_total 2');
    expect(text).toContain('furlow_handler_errors_total 1');
    expect(text).toContain('furlow_handler_invocations{id="h1",label="message_create"} 1');
    expect(text).toContain('furlow_handler_invocations{id="h2",label="guild_delete"} 1');
  });

  it('getHandlerStats returns the same instance across calls', () => {
    expect(getHandlerStats()).toBe(getHandlerStats());
  });
});
