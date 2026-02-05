/**
 * Analytics module
 */

import type { AnalyticsConfig } from '@furlow/schema';

export interface Counter {
  name: string;
  description?: string;
  labels: string[];
  values: Map<string, number>;
}

export interface Gauge {
  name: string;
  description?: string;
  value: number;
}

export interface Histogram {
  name: string;
  description?: string;
  buckets: number[];
  values: number[];
  sum: number;
  count: number;
  maxValues: number; // Maximum values to keep in memory
}

export class MetricsCollector {
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private enabled = false;

  /**
   * Configure the metrics collector
   */
  configure(config: AnalyticsConfig): void {
    this.enabled = config.enabled !== false;

    if (config.counters) {
      for (const [name, def] of Object.entries(config.counters)) {
        const counter: Counter = {
          name,
          labels: def.labels ?? [],
          values: new Map(),
        };
        if (def.description) {
          counter.description = def.description;
        }
        this.counters.set(name, counter);
      }
    }
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value = 1, labels?: Record<string, string>): void {
    if (!this.enabled) return;

    let counter = this.counters.get(name);
    if (!counter) {
      counter = { name, labels: [], values: new Map() };
      this.counters.set(name, counter);
    }

    const key = labels ? JSON.stringify(labels) : '';
    const current = counter.values.get(key) ?? 0;
    counter.values.set(key, current + value);
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number): void {
    if (!this.enabled) return;

    let gauge = this.gauges.get(name);
    if (!gauge) {
      gauge = { name, value: 0 };
      this.gauges.set(name, gauge);
    }
    gauge.value = value;
  }

  /**
   * Record a histogram value
   * Keeps only the most recent values in memory (sliding window)
   */
  recordHistogram(name: string, value: number, maxValues = 10000): void {
    if (!this.enabled) return;

    let histogram = this.histograms.get(name);
    if (!histogram) {
      histogram = {
        name,
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        values: [],
        sum: 0,
        count: 0,
        maxValues,
      };
      this.histograms.set(name, histogram);
    }

    // Add new value
    histogram.values.push(value);
    histogram.sum += value;
    histogram.count++;

    // Evict old values if over limit to prevent memory leak
    while (histogram.values.length > histogram.maxValues) {
      const evicted = histogram.values.shift();
      if (evicted !== undefined) {
        histogram.sum -= evicted;
        // Note: count represents total recorded, not current window size
      }
    }
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // Counters
    for (const counter of this.counters.values()) {
      if (counter.description) {
        lines.push(`# HELP ${counter.name} ${counter.description}`);
      }
      lines.push(`# TYPE ${counter.name} counter`);

      for (const [labelKey, value] of counter.values) {
        const labels = labelKey ? JSON.parse(labelKey) : {};
        const labelStr = Object.entries(labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        lines.push(`${counter.name}${labelStr ? `{${labelStr}}` : ''} ${value}`);
      }
    }

    // Gauges
    for (const gauge of this.gauges.values()) {
      if (gauge.description) {
        lines.push(`# HELP ${gauge.name} ${gauge.description}`);
      }
      lines.push(`# TYPE ${gauge.name} gauge`);
      lines.push(`${gauge.name} ${gauge.value}`);
    }

    // Histograms
    for (const histogram of this.histograms.values()) {
      if (histogram.description) {
        lines.push(`# HELP ${histogram.name} ${histogram.description}`);
      }
      lines.push(`# TYPE ${histogram.name} histogram`);

      for (const bucket of histogram.buckets) {
        const count = histogram.values.filter((v) => v <= bucket).length;
        lines.push(`${histogram.name}_bucket{le="${bucket}"} ${count}`);
      }
      lines.push(`${histogram.name}_bucket{le="+Inf"} ${histogram.count}`);
      lines.push(`${histogram.name}_sum ${histogram.sum}`);
      lines.push(`${histogram.name}_count ${histogram.count}`);
    }

    return lines.join('\n');
  }

  /**
   * Get counter value
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const counter = this.counters.get(name);
    if (!counter) return 0;

    const key = labels ? JSON.stringify(labels) : '';
    return counter.values.get(key) ?? 0;
  }

  /**
   * Get gauge value
   */
  getGauge(name: string): number {
    return this.gauges.get(name)?.value ?? 0;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const counter of this.counters.values()) {
      counter.values.clear();
    }
    for (const gauge of this.gauges.values()) {
      gauge.value = 0;
    }
    for (const histogram of this.histograms.values()) {
      histogram.values = [];
      histogram.sum = 0;
      histogram.count = 0;
      // Keep maxValues setting
    }
  }

  /**
   * Check if metrics are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Create a metrics collector
 */
export function createMetricsCollector(): MetricsCollector {
  return new MetricsCollector();
}
