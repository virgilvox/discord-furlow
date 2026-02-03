/**
 * TCP pipe for raw socket communication
 */

import { Socket, createConnection, createServer, Server } from 'net';
import type { Pipe, PipeResponse, TcpPipeConfig } from '../types.js';

export interface TcpPipeOptions {
  name: string;
  config: TcpPipeConfig;
}

export type TcpDataHandler = (data: Buffer | string) => void | Promise<void>;
export type TcpEventHandler = (data?: unknown) => void | Promise<void>;

export class TcpPipe implements Pipe {
  public readonly name: string;
  public readonly type = 'tcp';
  private socket: Socket | null = null;
  private server: Server | null = null;
  private config: TcpPipeConfig;
  private connected = false;
  private reconnectAttempts = 0;
  private reconnecting = false;
  private dataHandlers: TcpDataHandler[] = [];
  private eventHandlers: Map<string, TcpEventHandler[]> = new Map();

  constructor(options: TcpPipeOptions) {
    this.name = options.name;
    this.config = options.config;
  }

  /**
   * Connect to a TCP server (client mode)
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = createConnection({
          host: this.config.host,
          port: this.config.port,
        });

        this.socket.setEncoding(this.config.encoding ?? 'utf8');

        this.socket.on('connect', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.reconnecting = false;
          this.emit('connected');
          resolve();
        });

        this.socket.on('data', (data) => {
          this.handleData(data);
        });

        this.socket.on('close', () => {
          this.connected = false;
          this.emit('disconnected');
          this.handleDisconnect();
        });

        this.socket.on('error', (error) => {
          if (!this.connected) {
            reject(error);
          }
          this.emit('error', error);
        });

        this.socket.on('end', () => {
          this.connected = false;
          this.emit('end');
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Start a TCP server (server mode)
   */
  async listen(port?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer((socket) => {
          socket.setEncoding(this.config.encoding ?? 'utf8');

          socket.on('data', (data) => {
            this.handleData(data);
          });

          socket.on('error', (error) => {
            this.emit('client_error', error);
          });

          this.emit('connection', socket);
        });

        this.server.on('error', (error) => {
          reject(error);
        });

        this.server.listen(port ?? this.config.port, () => {
          this.connected = true;
          this.emit('listening');
          resolve();
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect / close
   */
  async disconnect(): Promise<void> {
    this.reconnecting = false;

    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.end(() => {
          this.socket?.destroy();
          this.socket = null;
          this.connected = false;
          resolve();
        });
      } else if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.connected = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send data
   */
  async send(data: Buffer | string): Promise<PipeResponse> {
    if (!this.socket || !this.connected) {
      return { success: false, error: 'Not connected' };
    }

    return new Promise((resolve) => {
      this.socket!.write(data, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Send and wait for response (request-response pattern)
   */
  async request<T = string>(
    data: Buffer | string,
    options: { timeout?: number } = {}
  ): Promise<PipeResponse<T>> {
    const { timeout = 30000 } = options;

    if (!this.socket || !this.connected) {
      return { success: false, error: 'Not connected' };
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.offData(handler);
        resolve({ success: false, error: 'Request timeout' });
      }, timeout);

      const handler = (response: Buffer | string) => {
        clearTimeout(timer);
        this.offData(handler);
        resolve({ success: true, data: response as T });
      };

      this.onData(handler);
      this.send(data);
    });
  }

  /**
   * Register a data handler
   */
  onData(handler: TcpDataHandler): void {
    this.dataHandlers.push(handler);
  }

  /**
   * Remove a data handler
   */
  offData(handler: TcpDataHandler): void {
    const index = this.dataHandlers.indexOf(handler);
    if (index !== -1) {
      this.dataHandlers.splice(index, 1);
    }
  }

  /**
   * Register an event handler
   */
  on(event: string, handler: TcpEventHandler): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * Remove an event handler
   */
  off(event: string, handler: TcpEventHandler): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit an event
   */
  private emit(event: string, data?: unknown): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`TCP handler error for "${event}":`, error);
      }
    }
  }

  /**
   * Handle incoming data
   */
  private handleData(data: Buffer | string): void {
    for (const handler of this.dataHandlers) {
      try {
        handler(data);
      } catch (error) {
        console.error('TCP data handler error:', error);
      }
    }
    this.emit('data', data);
  }

  /**
   * Handle disconnection with reconnect logic
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

    setTimeout(async () => {
      try {
        await this.connect();
        this.emit('reconnected', { attempts: this.reconnectAttempts });
      } catch {
        this.reconnecting = false;
        this.handleDisconnect();
      }
    }, delay);
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
 * Create a TCP pipe
 */
export function createTcpPipe(options: TcpPipeOptions): TcpPipe {
  return new TcpPipe(options);
}

// Re-export UDP pipe
export * from './udp.js';
