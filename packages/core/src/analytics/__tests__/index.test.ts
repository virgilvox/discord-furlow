/**
 * Metrics Collector Tests
 *
 * Tests for analytics and metrics collection with Prometheus export
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector, createMetricsCollector } from '../index.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('createMetricsCollector', () => {
    it('should create a new MetricsCollector instance', () => {
      const created = createMetricsCollector();
      expect(created).toBeInstanceOf(MetricsCollector);
    });
  });

  describe('configure', () => {
    it('should enable metrics by default', () => {
      collector.configure({});
      expect(collector.isEnabled()).toBe(true);
    });

    it('should disable metrics when enabled: false', () => {
      collector.configure({ enabled: false });
      expect(collector.isEnabled()).toBe(false);
    });

    it('should configure counters from config', () => {
      collector.configure({
        counters: {
          requests_total: {
            description: 'Total requests',
            labels: ['method', 'path'],
          },
        },
      });

      collector.incrementCounter('requests_total');
      expect(collector.getCounter('requests_total')).toBe(1);
    });

    it('should preserve counter description', () => {
      collector.configure({
        counters: {
          my_counter: {
            description: 'My custom counter',
          },
        },
      });

      const metrics = collector.getPrometheusMetrics();
      expect(metrics).toContain('# HELP my_counter My custom counter');
    });
  });

  describe('isEnabled', () => {
    it('should return false before configuration', () => {
      expect(collector.isEnabled()).toBe(false);
    });

    it('should return true after enabling', () => {
      collector.configure({ enabled: true });
      expect(collector.isEnabled()).toBe(true);
    });
  });

  describe('incrementCounter', () => {
    beforeEach(() => {
      collector.configure({ enabled: true });
    });

    it('should not increment when disabled', () => {
      collector.configure({ enabled: false });
      collector.incrementCounter('test_counter');
      expect(collector.getCounter('test_counter')).toBe(0);
    });

    it('should auto-create counter if not configured', () => {
      collector.incrementCounter('new_counter');
      expect(collector.getCounter('new_counter')).toBe(1);
    });

    it('should increment by 1 by default', () => {
      collector.incrementCounter('counter');
      collector.incrementCounter('counter');
      collector.incrementCounter('counter');
      expect(collector.getCounter('counter')).toBe(3);
    });

    it('should increment by custom value', () => {
      collector.incrementCounter('counter', 5);
      collector.incrementCounter('counter', 10);
      expect(collector.getCounter('counter')).toBe(15);
    });

    it('should support labeled counters', () => {
      collector.incrementCounter('requests', 1, { method: 'GET', path: '/api' });
      collector.incrementCounter('requests', 1, { method: 'POST', path: '/api' });
      collector.incrementCounter('requests', 1, { method: 'GET', path: '/api' });

      expect(collector.getCounter('requests', { method: 'GET', path: '/api' })).toBe(2);
      expect(collector.getCounter('requests', { method: 'POST', path: '/api' })).toBe(1);
    });

    it('should treat different labels as separate series', () => {
      collector.incrementCounter('errors', 1, { code: '404' });
      collector.incrementCounter('errors', 1, { code: '500' });

      expect(collector.getCounter('errors', { code: '404' })).toBe(1);
      expect(collector.getCounter('errors', { code: '500' })).toBe(1);
      expect(collector.getCounter('errors')).toBe(0); // No labels = different series
    });
  });

  describe('getCounter', () => {
    beforeEach(() => {
      collector.configure({ enabled: true });
    });

    it('should return 0 for non-existent counter', () => {
      expect(collector.getCounter('nonexistent')).toBe(0);
    });

    it('should return 0 for non-existent labels', () => {
      collector.incrementCounter('counter', 1, { label: 'value' });
      expect(collector.getCounter('counter', { label: 'other' })).toBe(0);
    });

    it('should return correct value for existing counter', () => {
      collector.incrementCounter('counter', 42);
      expect(collector.getCounter('counter')).toBe(42);
    });
  });

  describe('setGauge', () => {
    beforeEach(() => {
      collector.configure({ enabled: true });
    });

    it('should not set when disabled', () => {
      collector.configure({ enabled: false });
      collector.setGauge('test_gauge', 100);
      expect(collector.getGauge('test_gauge')).toBe(0);
    });

    it('should auto-create gauge if not exists', () => {
      collector.setGauge('new_gauge', 50);
      expect(collector.getGauge('new_gauge')).toBe(50);
    });

    it('should set gauge value', () => {
      collector.setGauge('memory_usage', 1024);
      expect(collector.getGauge('memory_usage')).toBe(1024);
    });

    it('should overwrite previous gauge value', () => {
      collector.setGauge('connections', 10);
      collector.setGauge('connections', 15);
      collector.setGauge('connections', 8);
      expect(collector.getGauge('connections')).toBe(8);
    });

    it('should support negative values', () => {
      collector.setGauge('temperature', -5);
      expect(collector.getGauge('temperature')).toBe(-5);
    });

    it('should support decimal values', () => {
      collector.setGauge('ratio', 0.75);
      expect(collector.getGauge('ratio')).toBe(0.75);
    });
  });

  describe('getGauge', () => {
    beforeEach(() => {
      collector.configure({ enabled: true });
    });

    it('should return 0 for non-existent gauge', () => {
      expect(collector.getGauge('nonexistent')).toBe(0);
    });

    it('should return correct value', () => {
      collector.setGauge('gauge', 123);
      expect(collector.getGauge('gauge')).toBe(123);
    });
  });

  describe('recordHistogram', () => {
    beforeEach(() => {
      collector.configure({ enabled: true });
    });

    it('should not record when disabled', () => {
      collector.configure({ enabled: false });
      collector.recordHistogram('test', 1.0);
      // Can't directly check histogram values, but can check Prometheus output
      expect(collector.getPrometheusMetrics()).not.toContain('test');
    });

    it('should auto-create histogram if not exists', () => {
      collector.recordHistogram('response_time', 0.5);
      const metrics = collector.getPrometheusMetrics();
      expect(metrics).toContain('response_time');
    });

    it('should track sum and count', () => {
      collector.recordHistogram('latency', 0.1);
      collector.recordHistogram('latency', 0.2);
      collector.recordHistogram('latency', 0.3);

      const metrics = collector.getPrometheusMetrics();
      expect(metrics).toContain('latency_sum 0.6');
      expect(metrics).toContain('latency_count 3');
    });

    it('should compute bucket counts', () => {
      // Default buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
      collector.recordHistogram('duration', 0.01);  // <= 0.01, 0.025, etc.
      collector.recordHistogram('duration', 0.1);   // <= 0.1, 0.25, etc.
      collector.recordHistogram('duration', 1.0);   // <= 1, 2.5, etc.

      const metrics = collector.getPrometheusMetrics();

      // Check specific bucket
      expect(metrics).toContain('duration_bucket{le="0.01"} 1');  // Only 0.01
      expect(metrics).toContain('duration_bucket{le="0.1"} 2');   // 0.01 and 0.1
      expect(metrics).toContain('duration_bucket{le="1"} 3');     // All 3
    });

    it('should include +Inf bucket with total count', () => {
      collector.recordHistogram('test', 100); // Way above all buckets

      const metrics = collector.getPrometheusMetrics();
      expect(metrics).toContain('test_bucket{le="+Inf"} 1');
    });

    it('should implement sliding window to prevent memory leaks', () => {
      // Record more than maxValues (default 10000)
      for (let i = 0; i < 100; i++) {
        collector.recordHistogram('test', i, 50); // maxValues = 50
      }

      // Should only keep last 50 values
      const metrics = collector.getPrometheusMetrics();
      // The count should reflect total recorded (100), but sum/buckets based on window
      expect(metrics).toContain('test_count 100');
    });

    it('should adjust sum when evicting old values', () => {
      // Fill with value 1.0
      for (let i = 0; i < 10; i++) {
        collector.recordHistogram('test', 1.0, 5); // maxValues = 5
      }

      // After 10 recordings with maxValues=5, sum should be ~5 (last 5 values)
      // But count should be 10
      const metrics = collector.getPrometheusMetrics();
      expect(metrics).toContain('test_count 10');
      expect(metrics).toContain('test_sum 5'); // 5 values of 1.0 each
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      collector.configure({ enabled: true });
    });

    it('should reset all counters to 0', () => {
      collector.incrementCounter('counter1', 10);
      collector.incrementCounter('counter2', 20);

      collector.reset();

      expect(collector.getCounter('counter1')).toBe(0);
      expect(collector.getCounter('counter2')).toBe(0);
    });

    it('should reset all gauges to 0', () => {
      collector.setGauge('gauge1', 100);
      collector.setGauge('gauge2', 200);

      collector.reset();

      expect(collector.getGauge('gauge1')).toBe(0);
      expect(collector.getGauge('gauge2')).toBe(0);
    });

    it('should reset histograms', () => {
      collector.recordHistogram('hist', 1.0);
      collector.recordHistogram('hist', 2.0);

      collector.reset();

      const metrics = collector.getPrometheusMetrics();
      expect(metrics).toContain('hist_sum 0');
      expect(metrics).toContain('hist_count 0');
    });

    it('should clear labeled counter values', () => {
      collector.incrementCounter('requests', 1, { method: 'GET' });
      collector.incrementCounter('requests', 1, { method: 'POST' });

      collector.reset();

      expect(collector.getCounter('requests', { method: 'GET' })).toBe(0);
      expect(collector.getCounter('requests', { method: 'POST' })).toBe(0);
    });
  });

  describe('getPrometheusMetrics', () => {
    beforeEach(() => {
      collector.configure({ enabled: true });
    });

    it('should return empty string when no metrics', () => {
      expect(collector.getPrometheusMetrics()).toBe('');
    });

    describe('counter format', () => {
      it('should format counter without labels', () => {
        collector.incrementCounter('http_requests_total', 42);

        const metrics = collector.getPrometheusMetrics();
        expect(metrics).toContain('# TYPE http_requests_total counter');
        expect(metrics).toContain('http_requests_total 42');
      });

      it('should format counter with labels', () => {
        collector.incrementCounter('http_requests_total', 10, {
          method: 'GET',
          status: '200',
        });

        const metrics = collector.getPrometheusMetrics();
        expect(metrics).toContain('http_requests_total{method="GET",status="200"} 10');
      });

      it('should include HELP comment when description present', () => {
        collector.configure({
          counters: {
            my_counter: {
              description: 'Number of things',
            },
          },
        });
        collector.incrementCounter('my_counter');

        const metrics = collector.getPrometheusMetrics();
        expect(metrics).toContain('# HELP my_counter Number of things');
      });

      it('should format multiple label combinations', () => {
        collector.incrementCounter('errors', 5, { code: '404', path: '/api' });
        collector.incrementCounter('errors', 3, { code: '500', path: '/api' });

        const metrics = collector.getPrometheusMetrics();
        expect(metrics).toContain('errors{code="404",path="/api"} 5');
        expect(metrics).toContain('errors{code="500",path="/api"} 3');
      });
    });

    describe('gauge format', () => {
      it('should format gauge', () => {
        collector.setGauge('temperature_celsius', 23.5);

        const metrics = collector.getPrometheusMetrics();
        expect(metrics).toContain('# TYPE temperature_celsius gauge');
        expect(metrics).toContain('temperature_celsius 23.5');
      });
    });

    describe('histogram format', () => {
      it('should format histogram with buckets', () => {
        collector.recordHistogram('request_duration_seconds', 0.05);
        collector.recordHistogram('request_duration_seconds', 0.2);

        const metrics = collector.getPrometheusMetrics();
        expect(metrics).toContain('# TYPE request_duration_seconds histogram');
        expect(metrics).toContain('request_duration_seconds_bucket{le="0.05"} 1');
        expect(metrics).toContain('request_duration_seconds_bucket{le="0.25"} 2');
        expect(metrics).toContain('request_duration_seconds_bucket{le="+Inf"} 2');
        expect(metrics).toContain('request_duration_seconds_sum 0.25');
        expect(metrics).toContain('request_duration_seconds_count 2');
      });

      it('should include all default buckets', () => {
        collector.recordHistogram('test', 100);

        const metrics = collector.getPrometheusMetrics();
        const expectedBuckets = ['0.005', '0.01', '0.025', '0.05', '0.1', '0.25', '0.5', '1', '2.5', '5', '10', '+Inf'];

        for (const bucket of expectedBuckets) {
          expect(metrics).toContain(`test_bucket{le="${bucket}"}`);
        }
      });
    });

    describe('combined output', () => {
      it('should output all metric types together', () => {
        collector.incrementCounter('counter', 10);
        collector.setGauge('gauge', 50);
        collector.recordHistogram('histogram', 0.5);

        const metrics = collector.getPrometheusMetrics();

        expect(metrics).toContain('# TYPE counter counter');
        expect(metrics).toContain('# TYPE gauge gauge');
        expect(metrics).toContain('# TYPE histogram histogram');
      });
    });
  });

  describe('concurrent operations', () => {
    beforeEach(() => {
      collector.configure({ enabled: true });
    });

    it('should handle concurrent counter increments', async () => {
      const increments = Array(100)
        .fill(null)
        .map(() => Promise.resolve().then(() => collector.incrementCounter('concurrent', 1)));

      await Promise.all(increments);

      expect(collector.getCounter('concurrent')).toBe(100);
    });

    it('should handle concurrent gauge updates', async () => {
      const updates = Array(100)
        .fill(null)
        .map((_, i) => Promise.resolve().then(() => collector.setGauge('concurrent', i)));

      await Promise.all(updates);

      // Last write wins - value should be one of the indices
      const value = collector.getGauge('concurrent');
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(100);
    });

    it('should handle concurrent histogram recordings', async () => {
      const recordings = Array(100)
        .fill(null)
        .map((_, i) =>
          Promise.resolve().then(() => collector.recordHistogram('concurrent', i * 0.1))
        );

      await Promise.all(recordings);

      const metrics = collector.getPrometheusMetrics();
      expect(metrics).toContain('concurrent_count 100');
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      collector.configure({ enabled: true });
    });

    it('should handle zero values', () => {
      collector.incrementCounter('counter', 0);
      collector.setGauge('gauge', 0);
      collector.recordHistogram('histogram', 0);

      expect(collector.getCounter('counter')).toBe(0);
      expect(collector.getGauge('gauge')).toBe(0);
    });

    it('should handle very large values', () => {
      collector.incrementCounter('large', Number.MAX_SAFE_INTEGER);
      expect(collector.getCounter('large')).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle very small histogram values', () => {
      collector.recordHistogram('tiny', 0.001);

      const metrics = collector.getPrometheusMetrics();
      expect(metrics).toContain('tiny_bucket{le="0.005"} 1'); // Below 0.005 bucket
    });

    it('should handle empty labels object', () => {
      collector.incrementCounter('test', 1, {});
      // Empty labels {} is stored as '{}' key (different from no labels which is '' key)
      expect(collector.getCounter('test', {})).toBe(1);
      // No labels is a different series
      expect(collector.getCounter('test')).toBe(0);
    });

    it('should handle special characters in label values', () => {
      collector.incrementCounter('test', 1, { path: '/api/v1/users' });

      const metrics = collector.getPrometheusMetrics();
      expect(metrics).toContain('path="/api/v1/users"');
    });
  });
});
