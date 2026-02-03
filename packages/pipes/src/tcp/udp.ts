/**
 * UDP pipe for datagram communication
 */

import { createSocket, Socket, RemoteInfo } from 'dgram';
import type { Pipe, PipeResponse, UdpPipeConfig } from '../types.js';

export interface UdpPipeOptions {
  name: string;
  config: UdpPipeConfig;
}

export interface UdpMessage {
  data: Buffer;
  rinfo: RemoteInfo;
}

export type UdpMessageHandler = (msg: UdpMessage) => void | Promise<void>;
export type UdpEventHandler = (data?: unknown) => void | Promise<void>;

export class UdpPipe implements Pipe {
  public readonly name: string;
  public readonly type = 'udp';
  private socket: Socket | null = null;
  private config: UdpPipeConfig;
  private bound = false;
  private messageHandlers: UdpMessageHandler[] = [];
  private eventHandlers: Map<string, UdpEventHandler[]> = new Map();

  constructor(options: UdpPipeOptions) {
    this.name = options.name;
    this.config = options.config;
  }

  /**
   * Bind to a port to receive messages
   */
  async bind(port?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = createSocket('udp4');

        this.socket.on('message', (msg, rinfo) => {
          this.handleMessage(msg, rinfo);
        });

        this.socket.on('error', (error) => {
          if (!this.bound) {
            reject(error);
          }
          this.emit('error', error);
        });

        this.socket.on('listening', () => {
          this.bound = true;
          const address = this.socket!.address();
          this.emit('listening', address);
          resolve();
        });

        // Setup broadcast if configured
        if (this.config.broadcast) {
          this.socket.setBroadcast(true);
        }

        // Bind to port
        const bindPort = port ?? this.config.port;
        const bindHost = this.config.host ?? '0.0.0.0';
        this.socket.bind(bindPort, bindHost, () => {
          // Join multicast group if configured
          if (this.config.multicast) {
            this.socket!.addMembership(this.config.multicast);
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Close the socket
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.close(() => {
          this.socket = null;
          this.bound = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Check if bound
   */
  isConnected(): boolean {
    return this.bound;
  }

  /**
   * Send data to a specific host and port
   */
  async send(
    data: Buffer | string,
    host: string,
    port: number
  ): Promise<PipeResponse> {
    if (!this.socket) {
      // Create socket if not exists (for send-only mode)
      this.socket = createSocket('udp4');
      if (this.config.broadcast) {
        this.socket.setBroadcast(true);
      }
    }

    const buffer = typeof data === 'string' ? Buffer.from(data) : data;

    return new Promise((resolve) => {
      this.socket!.send(buffer, port, host, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Broadcast data to all hosts on the network
   */
  async broadcast(
    data: Buffer | string,
    port: number,
    address = '255.255.255.255'
  ): Promise<PipeResponse> {
    if (!this.socket) {
      this.socket = createSocket('udp4');
      this.socket.setBroadcast(true);
    }

    const buffer = typeof data === 'string' ? Buffer.from(data) : data;

    return new Promise((resolve) => {
      this.socket!.send(buffer, port, address, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Send to multicast group
   */
  async multicast(
    data: Buffer | string,
    port: number,
    group?: string
  ): Promise<PipeResponse> {
    const multicastGroup = group ?? this.config.multicast;
    if (!multicastGroup) {
      return { success: false, error: 'No multicast group configured' };
    }

    return this.send(data, multicastGroup, port);
  }

  /**
   * Register a message handler
   */
  onMessage(handler: UdpMessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Remove a message handler
   */
  offMessage(handler: UdpMessageHandler): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index !== -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  /**
   * Register an event handler
   */
  on(event: string, handler: UdpEventHandler): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * Remove an event handler
   */
  off(event: string, handler: UdpEventHandler): void {
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
        console.error(`UDP handler error for "${event}":`, error);
      }
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: Buffer, rinfo: RemoteInfo): void {
    const msg: UdpMessage = { data, rinfo };

    for (const handler of this.messageHandlers) {
      try {
        handler(msg);
      } catch (error) {
        console.error('UDP message handler error:', error);
      }
    }

    this.emit('message', msg);
  }
}

/**
 * Create a UDP pipe
 */
export function createUdpPipe(options: UdpPipeOptions): UdpPipe {
  return new UdpPipe(options);
}
