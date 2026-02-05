/**
 * Configurable error handler infrastructure for FURLOW
 *
 * This module provides a centralized error handling system that can be
 * configured to handle errors in different ways (log, emit events, throw, etc.)
 */

import { FurlowError, type FurlowErrorOptions } from './base.js';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Error categories for filtering and routing
 */
export type ErrorCategory =
  | 'scheduler'      // Cron and timer errors
  | 'event'          // Event router errors
  | 'action'         // Action execution errors
  | 'expression'     // Expression evaluation errors
  | 'database'       // Database operation errors
  | 'voice'          // Voice/audio errors
  | 'client'         // Discord client errors
  | 'pipe'           // External pipe connection errors
  | 'parser'         // YAML/spec parsing errors
  | 'unknown';       // Uncategorized errors

/**
 * Error context provided to handlers
 */
export interface ErrorContext {
  /** Error category for filtering */
  category: ErrorCategory;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Original error if available */
  error: Error;
  /** Additional context about the error */
  context?: Record<string, unknown>;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Source location if available */
  source?: {
    file?: string;
    line?: number;
    column?: number;
  };
}

/**
 * Error handler callback type
 */
export type ErrorHandlerCallback = (ctx: ErrorContext) => void | Promise<void>;

/**
 * Error handler options
 */
export interface ErrorHandlerOptions {
  /** Default behavior when no specific handler is set */
  defaultBehavior?: 'log' | 'throw' | 'silent';
  /** Minimum severity level to process (default: 'warn') */
  minSeverity?: ErrorSeverity;
  /** Categories to handle (default: all) */
  categories?: ErrorCategory[];
  /** Custom error handler callback */
  onError?: ErrorHandlerCallback;
  /** Whether to emit events (requires event emitter to be set) */
  emitEvents?: boolean;
}

const SEVERITY_ORDER: Record<ErrorSeverity, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

/**
 * Global error handler for FURLOW
 */
export class ErrorHandler {
  private static instance: ErrorHandler | null = null;
  private options: Required<Omit<ErrorHandlerOptions, 'onError'>> & { onError?: ErrorHandlerCallback };
  private handlers: Map<ErrorCategory, ErrorHandlerCallback[]> = new Map();
  private eventEmitter: { emit: (event: string, data: unknown) => void } | null = null;

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      defaultBehavior: options.defaultBehavior ?? 'log',
      minSeverity: options.minSeverity ?? 'warn',
      categories: options.categories ?? [],
      emitEvents: options.emitEvents ?? false,
      onError: options.onError,
    };
  }

  /**
   * Get or create the global error handler instance
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Configure the global error handler
   */
  static configure(options: ErrorHandlerOptions): ErrorHandler {
    ErrorHandler.instance = new ErrorHandler(options);
    return ErrorHandler.instance;
  }

  /**
   * Reset the global instance (mainly for testing)
   */
  static reset(): void {
    ErrorHandler.instance = null;
  }

  /**
   * Set the event emitter for error events
   */
  setEventEmitter(emitter: { emit: (event: string, data: unknown) => void }): void {
    this.eventEmitter = emitter;
  }

  /**
   * Register a handler for a specific error category
   */
  on(category: ErrorCategory, handler: ErrorHandlerCallback): () => void {
    const handlers = this.handlers.get(category) ?? [];
    handlers.push(handler);
    this.handlers.set(category, handlers);

    // Return unsubscribe function
    return () => {
      const currentHandlers = this.handlers.get(category) ?? [];
      const index = currentHandlers.indexOf(handler);
      if (index !== -1) {
        currentHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Handle an error
   */
  async handle(
    error: Error | string,
    category: ErrorCategory,
    severity: ErrorSeverity = 'error',
    context?: Record<string, unknown>
  ): Promise<void> {
    // Check severity threshold
    if (SEVERITY_ORDER[severity] < SEVERITY_ORDER[this.options.minSeverity]) {
      return;
    }

    // Check category filter
    if (this.options.categories.length > 0 && !this.options.categories.includes(category)) {
      return;
    }

    const err = typeof error === 'string' ? new Error(error) : error;

    const errorContext: ErrorContext = {
      category,
      severity,
      error: err,
      context,
      timestamp: Date.now(),
      source: err instanceof FurlowError ? {
        file: err.file,
        line: err.line,
        column: err.column,
      } : undefined,
    };

    // Call category-specific handlers
    const categoryHandlers = this.handlers.get(category) ?? [];
    for (const handler of categoryHandlers) {
      try {
        await handler(errorContext);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    }

    // Call global error handler if set
    if (this.options.onError) {
      try {
        await this.options.onError(errorContext);
      } catch (handlerError) {
        console.error('Error in global error handler:', handlerError);
      }
    }

    // Emit error event if configured
    if (this.options.emitEvents && this.eventEmitter) {
      this.eventEmitter.emit('furlow:error', errorContext);
    }

    // Default behavior
    switch (this.options.defaultBehavior) {
      case 'log':
        this.logError(errorContext);
        break;
      case 'throw':
        throw err;
      case 'silent':
        // Do nothing
        break;
    }
  }

  /**
   * Create a wrapped version of an async function that handles errors
   */
  wrap<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    category: ErrorCategory,
    severity: ErrorSeverity = 'error'
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        await this.handle(
          error instanceof Error ? error : new Error(String(error)),
          category,
          severity
        );
        return undefined;
      }
    }) as T;
  }

  /**
   * Log an error using the appropriate console method
   */
  private logError(ctx: ErrorContext): void {
    const prefix = `[${ctx.category}]`;
    const message = ctx.error.message;
    const contextStr = ctx.context ? ` ${JSON.stringify(ctx.context)}` : '';

    switch (ctx.severity) {
      case 'debug':
        console.debug(prefix, message, contextStr);
        break;
      case 'info':
        console.info(prefix, message, contextStr);
        break;
      case 'warn':
        console.warn(prefix, message, contextStr);
        break;
      case 'error':
      case 'fatal':
        console.error(prefix, message, contextStr);
        break;
    }
  }
}

/**
 * Convenience function to handle errors using the global handler
 */
export function handleError(
  error: Error | string,
  category: ErrorCategory,
  severity: ErrorSeverity = 'error',
  context?: Record<string, unknown>
): Promise<void> {
  return ErrorHandler.getInstance().handle(error, category, severity, context);
}

/**
 * Create a new error handler instance
 */
export function createErrorHandler(options?: ErrorHandlerOptions): ErrorHandler {
  return new ErrorHandler(options);
}
