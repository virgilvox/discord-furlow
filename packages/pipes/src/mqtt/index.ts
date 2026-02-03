/**
 * MQTT pipe for IoT and real-time integrations
 */

import mqtt, { MqttClient, IClientOptions, IClientPublishOptions } from 'mqtt';
import type { Pipe, PipeResponse, MqttPipeConfig, MqttQoS } from '../types.js';

export interface MqttPipeOptions {
  name: string;
  config: MqttPipeConfig;
}

export type MqttMessageHandler = (
  topic: string,
  payload: Buffer | string | Record<string, unknown>,
  packet: unknown
) => void | Promise<void>;

export class MqttPipe implements Pipe {
  public readonly name: string;
  public readonly type = 'mqtt';
  private client: MqttClient | null = null;
  private config: MqttPipeConfig;
  private connected = false;
  private reconnectAttempts = 0;
  private messageHandlers: Map<string, MqttMessageHandler[]> = new Map();
  private wildcardHandlers: Map<string, MqttMessageHandler[]> = new Map();

  constructor(options: MqttPipeOptions) {
    this.name = options.name;
    this.config = options.config;
  }

  /**
   * Connect to the MQTT broker
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = this.config.protocol ?? 'mqtt';
      const port = this.config.port ?? (protocol === 'mqtts' || protocol === 'wss' ? 8883 : 1883);
      const url = `${protocol}://${this.config.broker}:${port}`;

      const options: IClientOptions = {
        keepalive: this.config.keepalive ?? 60,
        clean: this.config.clean ?? true,
        reconnectPeriod: this.config.reconnect?.enabled !== false
          ? this.parseDuration(this.config.reconnect?.delay ?? '5s')
          : 0,
      };

      // Authentication
      if (this.config.auth) {
        if (this.config.auth.username) options.username = this.config.auth.username;
        if (this.config.auth.password) options.password = this.config.auth.password;
        if (this.config.auth.clientId) options.clientId = this.config.auth.clientId;
      }

      // Last Will and Testament
      if (this.config.will) {
        options.will = {
          topic: this.config.will.topic,
          payload: Buffer.from(this.config.will.payload),
          qos: this.config.will.qos ?? 0,
          retain: this.config.will.retain ?? false,
        };
      }

      try {
        this.client = mqtt.connect(url, options);

        this.client.on('connect', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.emit('connected', {});
          resolve();
        });

        this.client.on('message', (topic, payload, packet) => {
          this.handleMessage(topic, payload, packet);
        });

        this.client.on('error', (error) => {
          if (!this.connected) {
            reject(error);
          }
          this.emit('error', error);
        });

        this.client.on('close', () => {
          this.connected = false;
          this.emit('disconnected', {});
        });

        this.client.on('reconnect', () => {
          this.reconnectAttempts++;
          this.emit('reconnecting', { attempts: this.reconnectAttempts });
        });

        this.client.on('offline', () => {
          this.connected = false;
          this.emit('offline', {});
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the broker
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, {}, () => {
          this.client = null;
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
    return this.connected && this.client?.connected === true;
  }

  /**
   * Subscribe to a topic
   */
  async subscribe(
    topic: string,
    options: { qos?: MqttQoS } = {}
  ): Promise<PipeResponse> {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    return new Promise((resolve) => {
      this.client!.subscribe(topic, { qos: options.qos ?? 0 }, (error, granted) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true, data: granted });
        }
      });
    });
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(topic: string): Promise<PipeResponse> {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    return new Promise((resolve) => {
      this.client!.unsubscribe(topic, {}, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Publish a message to a topic
   */
  async publish(
    topic: string,
    message: string | Buffer | Record<string, unknown>,
    options: { qos?: MqttQoS; retain?: boolean } = {}
  ): Promise<PipeResponse> {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    const payload = typeof message === 'object' && !Buffer.isBuffer(message)
      ? JSON.stringify(message)
      : message;

    const publishOptions: IClientPublishOptions = {
      qos: options.qos ?? 0,
      retain: options.retain ?? false,
    };

    return new Promise((resolve) => {
      this.client!.publish(topic, payload, publishOptions, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Register a handler for a specific topic
   * Supports MQTT wildcards: + (single level), # (multi level)
   */
  on(topic: string, handler: MqttMessageHandler): void {
    if (topic.includes('+') || topic.includes('#')) {
      // Wildcard topic - store in wildcardHandlers
      const handlers = this.wildcardHandlers.get(topic) ?? [];
      handlers.push(handler);
      this.wildcardHandlers.set(topic, handlers);
    } else {
      // Exact topic
      const handlers = this.messageHandlers.get(topic) ?? [];
      handlers.push(handler);
      this.messageHandlers.set(topic, handlers);
    }
  }

  /**
   * Remove a handler
   */
  off(topic: string, handler: MqttMessageHandler): void {
    const map = topic.includes('+') || topic.includes('#')
      ? this.wildcardHandlers
      : this.messageHandlers;

    const handlers = map.get(topic) ?? [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit to handlers
   */
  private emit(event: string, data: unknown): void {
    const handlers = this.messageHandlers.get(event) ?? [];
    for (const handler of handlers) {
      try {
        handler(event, data as Buffer, {});
      } catch (error) {
        console.error(`MQTT handler error for "${event}":`, error);
      }
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(topic: string, payload: Buffer, packet: unknown): void {
    // Parse payload
    let parsedPayload: Buffer | string | Record<string, unknown> = payload;
    try {
      const str = payload.toString();
      parsedPayload = JSON.parse(str);
    } catch {
      parsedPayload = payload.toString();
    }

    // Call exact topic handlers
    const exactHandlers = this.messageHandlers.get(topic) ?? [];
    for (const handler of exactHandlers) {
      try {
        handler(topic, parsedPayload, packet);
      } catch (error) {
        console.error(`MQTT handler error for topic "${topic}":`, error);
      }
    }

    // Check wildcard handlers
    for (const [pattern, handlers] of this.wildcardHandlers) {
      if (this.topicMatches(pattern, topic)) {
        for (const handler of handlers) {
          try {
            handler(topic, parsedPayload, packet);
          } catch (error) {
            console.error(`MQTT wildcard handler error for pattern "${pattern}":`, error);
          }
        }
      }
    }

    // Emit to generic message handlers
    this.emit('message', { topic, payload: parsedPayload, packet });
  }

  /**
   * Check if a topic matches a pattern with MQTT wildcards
   */
  private topicMatches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];

      // Multi-level wildcard matches everything remaining
      if (patternPart === '#') {
        return true;
      }

      // Topic is shorter than pattern
      if (i >= topicParts.length) {
        return false;
      }

      // Single-level wildcard matches any single level
      if (patternPart === '+') {
        continue;
      }

      // Exact match required
      if (patternPart !== topicParts[i]) {
        return false;
      }
    }

    // Pattern and topic should be same length (unless # was used)
    return patternParts.length === topicParts.length;
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
 * Create an MQTT pipe
 */
export function createMqttPipe(options: MqttPipeOptions): MqttPipe {
  return new MqttPipe(options);
}
