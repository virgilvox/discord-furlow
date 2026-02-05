/**
 * WebSocket pipe for bidirectional communication
 */

import WebSocket from 'ws';
import type { Pipe, PipeResponse, WebSocketPipeConfig } from '../types.js';

export interface WebSocketPipeOptions {
  name: string;
  config: WebSocketPipeConfig;
}

export type WebSocketMessageHandler = (data: unknown) => void | Promise<void>;

export class WebSocketPipe implements Pipe {
  public readonly name: string;
  public readonly type = 'websocket';
  private ws: WebSocket | null = null;
  private config: WebSocketPipeConfig;
  private reconnectAttempts = 0;
  private reconnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, WebSocketMessageHandler[]> = new Map();
  private connected = false;

  constructor(options: WebSocketPipeOptions) {
    this.name = options.name;
    this.config = options.config;
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const headers = this.config.headers as Record<string, string>;
        this.ws = new WebSocket(this.config.url, { headers });

        this.ws.on('open', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.reconnecting = false;
          this.startHeartbeat();
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('close', () => {
          this.connected = false;
          this.stopHeartbeat();
          this.handleDisconnect();
        });

        this.ws.on('error', (error) => {
          if (!this.connected) {
            reject(error);
          }
          this.emit('error', error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.reconnecting = false;

    // Clear any pending reconnect timer to prevent memory leaks
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Send a message
   */
  send(data: unknown): boolean {
    if (!this.isConnected()) {
      return false;
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.ws!.send(message);
    return true;
  }

  /**
   * Send and wait for a response (request-response pattern)
   */
  async request<T = unknown>(
    data: unknown,
    options: { timeout?: number; responseEvent?: string } = {}
  ): Promise<PipeResponse<T>> {
    const { timeout = 30000, responseEvent = 'response' } = options;

    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    return new Promise((resolve) => {
      let resolved = false;

      const cleanup = () => {
        this.off(responseEvent, handler);
      };

      const timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve({ success: false, error: 'Request timeout' });
      }, timeout);

      const handler = (response: unknown) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        cleanup();
        resolve({ success: true, data: response as T });
      };

      this.on(responseEvent, handler);
      this.send(data);
    });
  }

  /**
   * Register a message handler
   */
  on(event: string, handler: WebSocketMessageHandler): void {
    const handlers = this.messageHandlers.get(event) ?? [];
    handlers.push(handler);
    this.messageHandlers.set(event, handlers);
  }

  /**
   * Remove a message handler
   */
  off(event: string, handler: WebSocketMessageHandler): void {
    const handlers = this.messageHandlers.get(event) ?? [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit an event to handlers
   */
  private emit(event: string, data: unknown): void {
    const handlers = this.messageHandlers.get(event) ?? [];
    for (const handler of handlers) {
      try {
        const result = handler(data);
        // Handle async handlers properly
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error(`WebSocket async handler error for "${event}":`, error);
          });
        }
      } catch (error) {
        console.error(`WebSocket handler error for "${event}":`, error);
      }
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(rawData: WebSocket.RawData): void {
    let data: unknown;

    try {
      const str = rawData.toString();
      data = JSON.parse(str);
    } catch {
      data = rawData.toString();
    }

    // Emit to 'message' handlers
    this.emit('message', data);

    // Check for event field in JSON messages
    if (typeof data === 'object' && data !== null && 'event' in data) {
      const event = (data as { event: string }).event;
      this.emit(event, data);
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    if (!this.config.reconnect?.enabled || this.reconnecting) {
      return;
    }

    const maxAttempts = this.config.reconnect.max_attempts ?? 10;
    const delay = this.parseDuration(this.config.reconnect.delay ?? '5s');

    if (this.reconnectAttempts >= maxAttempts) {
      this.emit('reconnect_failed', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnecting = true;
    this.reconnectAttempts++;

    // Track the timer so it can be cleared on disconnect
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect()
        .then(() => {
          this.emit('reconnected', { attempts: this.reconnectAttempts });
        })
        .catch(() => {
          this.reconnecting = false;
          this.handleDisconnect();
        });
    }, delay);
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    if (!this.config.heartbeat?.interval) return;

    const interval = this.parseDuration(this.config.heartbeat.interval);
    const message = this.config.heartbeat.message ?? 'ping';

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send(message);
      }
    }, interval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Parse duration string to milliseconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(ms|s|m|h)?$/);
    if (!match) return 5000;

    const value = parseInt(match[1]!, 10);
    const unit = match[2] ?? 's';

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
        return value * 1000;
    }
  }
}

/**
 * Create a WebSocket pipe
 */
export function createWebSocketPipe(options: WebSocketPipeOptions): WebSocketPipe {
  return new WebSocketPipe(options);
}
