/**
 * Miscellaneous action handlers (pipes, webhooks, timers, metrics, canvas)
 */

import type { ActionRegistry } from '../registry.js';
import type { ActionHandler, ActionContext, ActionResult } from '../types.js';
import type { HandlerDependencies } from './index.js';
import { handleError } from '../../errors/handler.js';
import type {
  PipeRequestAction,
  PipeSendAction,
  WebhookSendAction,
  CreateTimerAction,
  CancelTimerAction,
  CounterIncrementAction,
  RecordMetricAction,
  CanvasRenderAction,
  RenderLayersAction,
  CanvasGenerator,
} from '@furlow/schema';
import { createCanvasRenderer, type CanvasRenderer } from '../../canvas/index.js';

// Lazy-loaded canvas renderer instance
let canvasRenderer: CanvasRenderer | null = null;

/**
 * Get or create canvas renderer (lazy initialization)
 */
function getCanvasRenderer(evaluator: any): CanvasRenderer {
  if (!canvasRenderer) {
    canvasRenderer = createCanvasRenderer({ evaluator });
  }
  return canvasRenderer;
}

/**
 * Parse duration string to milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h)?$/);
  if (!match) return 0;

  const value = parseInt(match[1]!, 10);
  const unit = match[2] ?? 'ms';

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      return value;
  }
}

/**
 * Pipe request action handler (HTTP requests)
 */
const pipeRequestHandler: ActionHandler<PipeRequestAction> = {
  name: 'pipe_request',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    // Get pipe configuration from context
    const pipes = (context as any)._pipes;
    const pipeConfig = pipes?.[config.pipe];

    if (!pipeConfig) {
      return { success: false, error: new Error(`Pipe "${config.pipe}" not found`) };
    }

    // Build URL
    let url = pipeConfig.url || pipeConfig.base_url;
    if (config.path) {
      const path = await evaluator.interpolate(String(config.path), context);
      url = url.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...pipeConfig.headers,
    };

    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        headers[key] = await evaluator.interpolate(String(value), context);
      }
    }

    // Build body
    let body: string | undefined;
    if (config.body) {
      const bodyData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(config.body)) {
        bodyData[key] = await evaluator.evaluate(String(value), context);
      }
      body = JSON.stringify(bodyData);
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        method: config.method || 'GET',
        headers,
        body: config.method !== 'GET' ? body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json().catch(() => response.text());

      if (config.as) {
        (context as Record<string, unknown>)[config.as] = {
          status: response.status,
          ok: response.ok,
          data,
        };
      }

      return { success: response.ok, data };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Pipe send action handler (WebSocket/MQTT/etc.)
 */
const pipeSendHandler: ActionHandler<PipeSendAction> = {
  name: 'pipe_send',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    // Get pipe from context
    const pipeConnections = (context as any)._pipeConnections;
    const connection = pipeConnections?.[config.pipe];

    if (!connection) {
      return { success: false, error: new Error(`Pipe connection "${config.pipe}" not found`) };
    }

    // Build data
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config.data)) {
      data[key] = await evaluator.evaluate(String(value), context);
    }

    try {
      // Send based on connection type
      if (typeof connection.send === 'function') {
        connection.send(JSON.stringify(data));
      } else if (typeof connection.publish === 'function') {
        // MQTT-style
        connection.publish(config.pipe, JSON.stringify(data));
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Webhook send action handler
 */
const webhookSendHandler: ActionHandler<WebhookSendAction> = {
  name: 'webhook_send',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const url = await evaluator.interpolate(String(config.url), context);

    const body: any = {};

    if (config.content) {
      body.content = await evaluator.interpolate(String(config.content), context);
    }

    if (config.username) {
      body.username = await evaluator.interpolate(String(config.username), context);
    }

    if (config.avatar_url) {
      body.avatar_url = await evaluator.interpolate(String(config.avatar_url), context);
    }

    if (config.embeds) {
      body.embeds = await Promise.all(
        config.embeds.map(async (embed) => {
          const result: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(embed)) {
            if (typeof value === 'string') {
              result[key] = await evaluator.interpolate(value, context);
            } else if (Array.isArray(value)) {
              result[key] = await Promise.all(
                value.map(async (item) => {
                  if (typeof item === 'object' && item !== null) {
                    const itemResult: Record<string, unknown> = {};
                    for (const [k, v] of Object.entries(item)) {
                      if (typeof v === 'string') {
                        itemResult[k] = await evaluator.interpolate(v, context);
                      } else {
                        itemResult[k] = v;
                      }
                    }
                    return itemResult;
                  }
                  return item;
                })
              );
            } else if (typeof value === 'object' && value !== null) {
              const objResult: Record<string, unknown> = {};
              for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
                if (typeof v === 'string') {
                  objResult[k] = await evaluator.interpolate(v, context);
                } else {
                  objResult[k] = v;
                }
              }
              result[key] = objResult;
            } else {
              result[key] = value;
            }
          }
          return result;
        })
      );
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      return { success: response.ok };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Create timer action handler
 */
const createTimerHandler: ActionHandler<CreateTimerAction> = {
  name: 'create_timer',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const durationMs = parseDuration(String(config.duration));

    // Build event data
    const data: Record<string, unknown> = {};
    if (config.data) {
      for (const [key, value] of Object.entries(config.data)) {
        data[key] = await evaluator.evaluate(String(value), context);
      }
    }

    // Store timer reference
    const timers = ((context as any)._timers = (context as any)._timers || {});
    const eventRouter = (context as any)._eventRouter;

    const timerId = setTimeout(() => {
      delete timers[config.id];

      // Emit the event with proper error handling
      if (eventRouter && typeof eventRouter.emit === 'function') {
        Promise.resolve(eventRouter.emit(config.event, { ...context, ...data })).catch((err) => {
          handleError(
            err instanceof Error ? err : new Error(String(err)),
            'scheduler',
            'error',
            { timerId: config.id, event: config.event }
          );
        });
      }
    }, durationMs);

    timers[config.id] = timerId;

    return { success: true, data: { id: config.id, duration: durationMs } };
  },
};

/**
 * Cancel timer action handler
 */
const cancelTimerHandler: ActionHandler<CancelTimerAction> = {
  name: 'cancel_timer',
  async execute(config, context): Promise<ActionResult> {
    const timers = (context as any)._timers;

    if (!timers || !timers[config.id]) {
      return { success: false, error: new Error(`Timer "${config.id}" not found`) };
    }

    clearTimeout(timers[config.id]);
    delete timers[config.id];

    return { success: true };
  },
};

/**
 * Counter increment action handler
 */
const counterIncrementHandler: ActionHandler<CounterIncrementAction> = {
  name: 'counter_increment',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    // Get metrics registry from context
    const metrics = ((context as any)._metrics = (context as any)._metrics || {});
    const counters = (metrics.counters = metrics.counters || {});

    // Build label key
    let labelKey = config.name;
    if (config.labels) {
      const labelParts: string[] = [];
      for (const [key, value] of Object.entries(config.labels)) {
        const resolvedValue = await evaluator.interpolate(String(value), context);
        labelParts.push(`${key}=${resolvedValue}`);
      }
      labelKey = `${config.name}{${labelParts.join(',')}}`;
    }

    // Increment counter
    const value = config.value ?? 1;
    counters[labelKey] = (counters[labelKey] || 0) + value;

    return { success: true, data: counters[labelKey] };
  },
};

/**
 * Record metric action handler
 */
const recordMetricHandler: ActionHandler<RecordMetricAction> = {
  name: 'record_metric',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    // Get metrics registry from context
    const metrics = ((context as any)._metrics = (context as any)._metrics || {});

    // Build label key
    let labelKey = config.name;
    if (config.labels) {
      const labelParts: string[] = [];
      for (const [key, value] of Object.entries(config.labels)) {
        const resolvedValue = await evaluator.interpolate(String(value), context);
        labelParts.push(`${key}=${resolvedValue}`);
      }
      labelKey = `${config.name}{${labelParts.join(',')}}`;
    }

    switch (config.type) {
      case 'counter': {
        const counters = (metrics.counters = metrics.counters || {});
        counters[labelKey] = (counters[labelKey] || 0) + config.value;
        break;
      }
      case 'gauge': {
        const gauges = (metrics.gauges = metrics.gauges || {});
        gauges[labelKey] = config.value;
        break;
      }
      case 'histogram': {
        const histograms = (metrics.histograms = metrics.histograms || {});
        const hist = (histograms[labelKey] = histograms[labelKey] || { values: [], sum: 0, count: 0 });
        hist.values.push(config.value);
        hist.sum += config.value;
        hist.count++;
        break;
      }
    }

    return { success: true };
  },
};

/**
 * Canvas render action handler
 * Renders a named generator defined in spec.canvas.generators
 */
const canvasRenderHandler: ActionHandler<CanvasRenderAction> = {
  name: 'canvas_render',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    // Get canvas generators from context
    const generators = (context as any)._canvasGenerators;
    const generatorName = await evaluator.interpolate(String(config.generator), context);
    const generator = generators?.[generatorName] as CanvasGenerator | undefined;

    if (!generator) {
      return { success: false, error: new Error(`Canvas generator "${generatorName}" not found`) };
    }

    // Build render context
    const renderContext: Record<string, unknown> = { ...context };
    const contextDebug: Record<string, { input: string; output: unknown }> = {};
    if (config.context) {
      for (const [key, value] of Object.entries(config.context)) {
        const strValue = String(value);
        let result: unknown;
        // Support both ${expr} interpolation syntax and raw expressions
        if (strValue.includes('${')) {
          result = await evaluator.interpolate(strValue, context);
        } else {
          result = await evaluator.evaluate(strValue, context);
        }
        renderContext[key] = result;
        contextDebug[key] = { input: strValue, output: result };
      }
    }

    // Store debug info for verbose logging
    (context as any)._canvasContextDebug = contextDebug;

    try {
      // Get or create canvas renderer
      const renderer = getCanvasRenderer(evaluator);

      // Render the generator
      const result = await renderer.renderGenerator(generator, renderContext);

      if (config.as) {
        (context as Record<string, unknown>)[config.as] = result;
      }

      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Render layers action handler
 * Renders canvas layers inline without requiring a pre-defined generator
 */
const renderLayersHandler: ActionHandler<RenderLayersAction> = {
  name: 'render_layers',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    try {
      // Get or create canvas renderer
      const renderer = getCanvasRenderer(evaluator);

      // Resolve background color if it's an expression
      let background: string | undefined;
      if (config.background) {
        background = await evaluator.interpolate(String(config.background), context);
      }

      // Render layers directly
      const result = await renderer.renderLayers(
        config.width,
        config.height,
        config.layers as any[],
        context as Record<string, unknown>,
        {
          background,
          format: config.format,
          quality: config.quality,
        }
      );

      if (config.as) {
        (context as Record<string, unknown>)[config.as] = result;
      }

      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Register all misc handlers
 */
export function registerMiscHandlers(
  registry: ActionRegistry,
  deps: HandlerDependencies
): void {
  registry.register(pipeRequestHandler);
  registry.register(pipeSendHandler);
  registry.register(webhookSendHandler);
  registry.register(createTimerHandler);
  registry.register(cancelTimerHandler);
  registry.register(counterIncrementHandler);
  registry.register(recordMetricHandler);
  registry.register(canvasRenderHandler);
  registry.register(renderLayersHandler);
}
