/**
 * Webhook pipe for incoming and outgoing webhooks
 */

import { createHmac } from 'node:crypto';
import type { Pipe, PipeResponse, WebhookPipeConfig } from '../types.js';

export interface WebhookPipeOptions {
  name: string;
  config: WebhookPipeConfig;
}

export type WebhookHandler = (
  body: unknown,
  headers: Record<string, string>
) => void | Promise<void>;

export class WebhookPipe implements Pipe {
  public readonly name: string;
  public readonly type = 'webhook';
  private config: WebhookPipeConfig;
  private handlers: WebhookHandler[] = [];

  constructor(options: WebhookPipeOptions) {
    this.name = options.name;
    this.config = options.config;
  }

  isConnected(): boolean {
    return true;
  }

  /**
   * Get the webhook path
   */
  getPath(): string {
    return this.config.path;
  }

  /**
   * Get the expected method
   */
  getMethod(): string {
    return this.config.method ?? 'POST';
  }

  /**
   * Register a handler for incoming webhooks
   */
  onWebhook(handler: WebhookHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index !== -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  /**
   * Handle an incoming webhook request
   */
  async handleRequest(
    body: unknown,
    headers: Record<string, string>
  ): Promise<PipeResponse> {
    // Verify signature if configured
    if (this.config.verification) {
      const valid = this.verifySignature(body, headers);
      if (!valid) {
        return { success: false, error: 'Invalid signature', status: 401 };
      }
    }

    // Call handlers
    for (const handler of this.handlers) {
      try {
        await handler(body, headers);
      } catch (error) {
        console.error(`Webhook handler error:`, error);
      }
    }

    // Check for config handlers
    if (this.config.handlers) {
      // These would be processed by the action executor
    }

    return { success: true, status: 200 };
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(
    body: unknown,
    headers: Record<string, string>
  ): boolean {
    if (!this.config.verification) return true;

    const { type, secret, header, algorithm } = this.config.verification;
    const signatureHeader = header ?? 'x-signature';
    const receivedSignature = headers[signatureHeader.toLowerCase()];

    if (!receivedSignature || !secret) {
      return false;
    }

    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

    switch (type) {
      case 'hmac': {
        const algo = algorithm ?? 'sha256';
        const expectedSignature = createHmac(algo, secret)
          .update(bodyString)
          .digest('hex');

        // Handle both raw and prefixed signatures
        const cleanReceived = receivedSignature.replace(/^sha\d+=/, '');
        return this.timingSafeEqual(cleanReceived, expectedSignature);
      }

      case 'token': {
        return receivedSignature === secret;
      }

      case 'signature': {
        // Custom signature verification - fail closed by default
        // Requires both a header configuration and a secret to be provided
        const signatureValue = headers[signatureHeader.toLowerCase()];
        if (!signatureValue) {
          return false;
        }
        // Compare the provided signature with the secret using timing-safe comparison
        return this.timingSafeEqual(signatureValue, secret);
      }

      default:
        // Unknown verification type - fail closed for security
        return false;
    }
  }

  /**
   * Timing-safe string comparison
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

/**
 * Outgoing webhook sender
 */
export class WebhookSender {
  /**
   * Send a Discord webhook
   */
  static async sendDiscordWebhook(
    url: string,
    options: {
      content?: string;
      username?: string;
      avatar_url?: string;
      embeds?: Record<string, unknown>[];
    }
  ): Promise<PipeResponse> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          status: response.status,
        };
      }

      return { success: true, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a generic webhook
   */
  static async send(
    url: string,
    body: unknown,
    options: { headers?: Record<string, string>; method?: string } = {}
  ): Promise<PipeResponse> {
    try {
      const response = await fetch(url, {
        method: options.method ?? 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      return {
        success: response.ok,
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Create a webhook pipe
 */
export function createWebhookPipe(options: WebhookPipeOptions): WebhookPipe {
  return new WebhookPipe(options);
}
