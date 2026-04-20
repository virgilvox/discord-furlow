/**
 * Handlers observability page. Renders the HandlerStats snapshot from the
 * core runtime (M8) so operators can see which handlers fire, how often,
 * and where errors are accumulating.
 */

import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { userApi, type User } from '../api/client';

interface HandlerSnapshot {
  id: string;
  label: string;
  runCount: number;
  errorCount: number;
  lastRunAt: number | null;
  lastErrorAt: number | null;
  lastError: string | null;
  totalDurationMs: number;
  avgDurationMs: number;
}

function formatTimestamp(ms: number | null): string {
  if (!ms) return 'never';
  const diff = Date.now() - ms;
  if (diff < 1000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export function Handlers() {
  const [user, setUser] = useState<User | null>(null);
  const [handlers, setHandlers] = useState<HandlerSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userApi.getUser().then(setUser).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch('/api/handlers', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { handlers: HandlerSnapshot[] };
        if (!cancelled) {
          setHandlers(body.handlers);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <Layout user={user}>
      <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ color: '#fff', marginBottom: '0.5rem' }}>Handler Stats</h1>
        <p style={{ color: '#b9bbbe', marginBottom: '2rem' }}>
          Live invocation counts and error details from the core runtime.
          Refreshes every 5 seconds.
        </p>

        {loading && <p style={{ color: '#b9bbbe' }}>Loading...</p>}
        {error && (
          <div style={{
            padding: '1rem',
            background: '#3b1018',
            color: '#ffb4b4',
            borderRadius: 8,
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        {!loading && handlers.length === 0 && !error && (
          <p style={{ color: '#b9bbbe' }}>
            No handlers have fired yet. Trigger an event or run a command
            to populate this page.
          </p>
        )}

        {handlers.length > 0 && (
          <table style={{
            width: '100%',
            background: '#16213e',
            borderRadius: 8,
            borderCollapse: 'separate',
            borderSpacing: 0,
            color: '#fff',
          }}>
            <thead>
              <tr style={{ background: '#0f3460' }}>
                <th style={th}>Handler</th>
                <th style={th}>Event / Command</th>
                <th style={thNum}>Runs</th>
                <th style={thNum}>Errors</th>
                <th style={thNum}>Avg (ms)</th>
                <th style={th}>Last run</th>
                <th style={th}>Last error</th>
              </tr>
            </thead>
            <tbody>
              {handlers.map((h) => (
                <tr key={h.id}>
                  <td style={td}><code>{h.id}</code></td>
                  <td style={td}>{h.label}</td>
                  <td style={tdNum}>{h.runCount}</td>
                  <td style={{ ...tdNum, color: h.errorCount > 0 ? '#ff7171' : '#b9bbbe' }}>
                    {h.errorCount}
                  </td>
                  <td style={tdNum}>{h.avgDurationMs.toFixed(1)}</td>
                  <td style={td}>{formatTimestamp(h.lastRunAt)}</td>
                  <td style={{ ...td, color: h.lastError ? '#ffb4b4' : '#b9bbbe', fontSize: 12 }}>
                    {h.lastError ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontWeight: 600,
  fontSize: 14,
};
const thNum: React.CSSProperties = { ...th, textAlign: 'right' };
const td: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontSize: 14,
  borderTop: '1px solid #0f3460',
};
const tdNum: React.CSSProperties = { ...td, textAlign: 'right' };
