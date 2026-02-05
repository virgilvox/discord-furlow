/**
 * Jexl-based expression evaluator with LRU caching
 */

import Jexl from 'jexl';
import { ExpressionSyntaxError, UndefinedVariableError } from '../errors/index.js';
import { registerFunctions } from './functions.js';
import { registerTransforms } from './transforms.js';
import type { StateManager } from '../state/manager.js';

export interface EvaluatorOptions {
  /** Maximum expression evaluation time in milliseconds */
  timeout?: number;
  /** Whether to allow undefined variables (false = error) */
  allowUndefined?: boolean;
  /** Maximum number of cached compiled expressions (default: 1000) */
  cacheSize?: number;
}

const DEFAULT_OPTIONS: Required<EvaluatorOptions> = {
  timeout: 5000,
  allowUndefined: false,
  cacheSize: 1000,
};

/**
 * Simple LRU cache for compiled expressions
 */
class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Create a new expression evaluator instance
 */
export function createEvaluator(options: EvaluatorOptions = {}): ExpressionEvaluator {
  return new ExpressionEvaluator({ ...DEFAULT_OPTIONS, ...options });
}

export class ExpressionEvaluator {
  private jexl: Jexl.Jexl;
  private options: Required<EvaluatorOptions>;
  private expressionCache: LRUCache<string, Jexl.Expression>;
  private templateCache: LRUCache<string, { pattern: RegExp; matches: string[] }>;

  // Stats for monitoring
  private stats = {
    evaluations: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(options: Required<EvaluatorOptions>) {
    this.options = options;
    this.jexl = new Jexl.Jexl();
    this.expressionCache = new LRUCache(options.cacheSize);
    this.templateCache = new LRUCache(Math.floor(options.cacheSize / 2));

    // Register built-in functions and transforms
    registerFunctions(this.jexl);
    registerTransforms(this.jexl);
  }

  /**
   * Get cache statistics
   */
  getStats(): { evaluations: number; cacheHits: number; cacheMisses: number; hitRate: number; cacheSize: number } {
    const hitRate = this.stats.evaluations > 0
      ? (this.stats.cacheHits / this.stats.evaluations) * 100
      : 0;
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      cacheSize: this.expressionCache.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.expressionCache.clear();
    this.templateCache.clear();
    this.stats = { evaluations: 0, cacheHits: 0, cacheMisses: 0 };
  }

  /**
   * Get a compiled expression from cache or compile it
   */
  private getCompiledExpression(expression: string): Jexl.Expression {
    let compiled = this.expressionCache.get(expression);
    if (compiled) {
      this.stats.cacheHits++;
    } else {
      this.stats.cacheMisses++;
      compiled = this.jexl.compile(expression);
      this.expressionCache.set(expression, compiled);
    }
    return compiled;
  }

  /**
   * Add a custom function
   */
  addFunction(name: string, fn: (...args: unknown[]) => unknown): void {
    this.jexl.addFunction(name, fn);
  }

  /**
   * Add a custom transform
   */
  addTransform(name: string, fn: (value: unknown, ...args: unknown[]) => unknown): void {
    this.jexl.addTransform(name, fn);
  }

  /**
   * Evaluate an expression (cached compilation)
   */
  async evaluate<T = unknown>(
    expression: string,
    context: Record<string, unknown> = {}
  ): Promise<T> {
    this.stats.evaluations++;

    // Track timeout for cleanup
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      // Get compiled expression from cache
      const compiled = this.getCompiledExpression(expression);

      // Wrap evaluation with timeout (and proper cleanup)
      const result = await Promise.race([
        compiled.eval(context),
        new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Expression evaluation timeout')),
            this.options.timeout
          );
        }),
      ]);

      return result as T;
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('undefined')) {
          const match = err.message.match(/undefined variable "?([^"]+)"?/i);
          if (match?.[1]) {
            throw new UndefinedVariableError(match[1], expression);
          }
        }
        throw new ExpressionSyntaxError(expression, err.message);
      }
      throw err;
    } finally {
      // Always clean up the timeout to prevent memory leaks
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Evaluate an expression with state variables loaded from StateManager.
   * This allows expressions to reference state variables directly by name.
   */
  async evaluateWithState<T = unknown>(
    expression: string,
    context: Record<string, unknown>,
    stateManager: StateManager,
    scopeContext: { guildId?: string; channelId?: string; userId?: string }
  ): Promise<T> {
    // Load all registered state variables into context
    const stateVars = await this.loadStateVariables(stateManager, scopeContext);
    const enrichedContext = { ...context, ...stateVars };
    return this.evaluate<T>(expression, enrichedContext);
  }

  /**
   * Load all registered state variables from StateManager
   */
  private async loadStateVariables(
    stateManager: StateManager,
    scopeContext: { guildId?: string; channelId?: string; userId?: string }
  ): Promise<Record<string, unknown>> {
    const vars: Record<string, unknown> = {};
    const variableNames = stateManager.getVariableNames();
    for (const name of variableNames) {
      vars[name] = await stateManager.get(name, scopeContext);
    }
    return vars;
  }

  /**
   * Evaluate an expression synchronously (cached, no timeout)
   */
  evaluateSync<T = unknown>(
    expression: string,
    context: Record<string, unknown> = {}
  ): T {
    this.stats.evaluations++;

    try {
      const compiled = this.getCompiledExpression(expression);
      return compiled.evalSync(context) as T;
    } catch (err) {
      if (err instanceof Error) {
        throw new ExpressionSyntaxError(expression, err.message);
      }
      throw err;
    }
  }

  /**
   * Interpolate a string with ${...} expressions
   */
  async interpolate(
    template: string,
    context: Record<string, unknown> = {}
  ): Promise<string> {
    const pattern = /\$\{([^}]+)\}/g;
    const matches = [...template.matchAll(pattern)];

    if (matches.length === 0) {
      return template;
    }

    let result = template;
    for (const match of matches) {
      const fullMatch = match[0];
      const expression = match[1]?.trim();
      if (!expression) continue;

      const value = await this.evaluate(expression, context);
      result = result.replace(fullMatch, String(value ?? ''));
    }

    return result;
  }

  /**
   * Interpolate synchronously
   */
  interpolateSync(
    template: string,
    context: Record<string, unknown> = {}
  ): string {
    const pattern = /\$\{([^}]+)\}/g;
    return template.replace(pattern, (_, expression: string) => {
      const value = this.evaluateSync(expression.trim(), context);
      return String(value ?? '');
    });
  }

  /**
   * Evaluate a template, preserving non-string types when the template
   * is exactly "${expression}". For mixed templates, interpolates as string.
   *
   * This is critical for file attachments where Buffer values must not
   * be converted to "[object Buffer]".
   */
  async evaluateTemplate(
    template: unknown,
    context: Record<string, unknown> = {}
  ): Promise<unknown> {
    // Pass through non-strings directly (Buffer, number, object, etc.)
    if (typeof template !== 'string') {
      return template;
    }

    // Check if template is exactly "${expression}" (no other text)
    const exactMatch = template.match(/^\$\{([^}]+)\}$/);
    if (exactMatch) {
      // Return raw value without string conversion
      return this.evaluate(exactMatch[1]!.trim(), context);
    }
    // Otherwise, interpolate as string (mixed content)
    return this.interpolate(template, context);
  }

  /**
   * Check if a string contains expressions
   */
  hasExpressions(template: string): boolean {
    return /\$\{[^}]+\}/.test(template);
  }

  /**
   * Compile an expression for repeated evaluation
   */
  compile(expression: string): Jexl.Expression {
    return this.jexl.compile(expression);
  }
}
