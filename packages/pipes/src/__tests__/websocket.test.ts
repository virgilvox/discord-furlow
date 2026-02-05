/**
 * WebSocket Pipe Tests
 *
 * Tests for WebSocket pipe with a mock WebSocket implementation.
 * These tests verify actual WebSocketPipe behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Use vi.hoisted to define the mock before vi.mock is hoisted
const { MockWebSocket } = vi.hoisted(() => {
  const { EventEmitter } = require('events');

  // Track whether the NEXT connection should fail (per-class, not prototype)
  let nextConnectionShouldFail = false;

  class MockWebSocket extends EventEmitter {
    url: string;
    options: any;
    readyState: number;
    static OPEN = 1;
    static CLOSED = 3;
    static CONNECTING = 0;

    private static instances: MockWebSocket[] = [];

    private _sendQueue: string[] = [];
    private _shouldFail: boolean;

    constructor(url: string, options?: any) {
      super();
      this.url = url;
      this.options = options;
      this.readyState = MockWebSocket.CONNECTING;
      MockWebSocket.instances.push(this);

      // Capture whether THIS instance should fail (and reset flag)
      this._shouldFail = nextConnectionShouldFail;
      nextConnectionShouldFail = false;

      // Simulate async connection
      setImmediate(() => {
        if (!this._shouldFail) {
          this.readyState = MockWebSocket.OPEN;
          this.emit('open');
        } else {
          this.emit('error', new Error('Connection failed'));
          this.emit('close');
        }
      });
    }

    static getLastInstance(): MockWebSocket | undefined {
      return MockWebSocket.instances[MockWebSocket.instances.length - 1];
    }

    static clearInstances(): void {
      MockWebSocket.instances = [];
      nextConnectionShouldFail = false;
    }

    static failNextConnection(): void {
      // Only affects the NEXT instance created
      nextConnectionShouldFail = true;
    }

    send(data: string): void {
      if (this.readyState !== MockWebSocket.OPEN) {
        throw new Error('WebSocket is not open');
      }
      this._sendQueue.push(data);
    }

    getSentMessages(): string[] {
      return this._sendQueue;
    }

    simulateMessage(data: string | object): void {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.emit('message', Buffer.from(message));
    }

    simulateClose(): void {
      this.readyState = MockWebSocket.CLOSED;
      this.emit('close');
    }

    simulateError(error: Error): void {
      this.emit('error', error);
    }

    close(): void {
      this.readyState = MockWebSocket.CLOSED;
      this.emit('close');
    }
  }

  return { MockWebSocket };
});

// Mock the ws module using the hoisted MockWebSocket
vi.mock('ws', () => {
  return { default: MockWebSocket };
});

import { WebSocketPipe, createWebSocketPipe } from '../websocket/index.js';

describe('WebSocketPipe', () => {
  beforeEach(() => {
    MockWebSocket.clearInstances();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Creation', () => {
    it('should create a WebSocket pipe', () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      expect(pipe).toBeInstanceOf(WebSocketPipe);
      expect(pipe.name).toBe('test-ws');
      expect(pipe.type).toBe('websocket');
    });

    it('should not be connected initially', () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      expect(pipe.isConnected()).toBe(false);
    });
  });

  describe('Connection', () => {
    it('should connect successfully', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      expect(pipe.isConnected()).toBe(true);
    });

    it('should pass headers to WebSocket', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
          headers: {
            'Authorization': 'Bearer token123',
            'X-Custom': 'value',
          },
        },
      });

      await pipe.connect();

      const ws = MockWebSocket.getLastInstance();
      expect(ws?.options.headers).toEqual({
        'Authorization': 'Bearer token123',
        'X-Custom': 'value',
      });
    });

    it('should disconnect properly', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();
      expect(pipe.isConnected()).toBe(true);

      await pipe.disconnect();
      expect(pipe.isConnected()).toBe(false);
    });
  });

  describe('Sending Messages', () => {
    it('should send string messages', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();
      const result = pipe.send('hello world');

      expect(result).toBe(true);
      const ws = MockWebSocket.getLastInstance();
      expect(ws?.getSentMessages()).toContain('hello world');
    });

    it('should stringify object messages', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();
      pipe.send({ type: 'ping', data: 123 });

      const ws = MockWebSocket.getLastInstance();
      expect(ws?.getSentMessages()).toContain('{"type":"ping","data":123}');
    });

    it('should return false when not connected', () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      const result = pipe.send('hello');
      expect(result).toBe(false);
    });

    it('should stringify arrays', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();
      pipe.send([1, 2, 3]);

      const ws = MockWebSocket.getLastInstance();
      expect(ws?.getSentMessages()).toContain('[1,2,3]');
    });
  });

  describe('Receiving Messages', () => {
    it('should emit message event for incoming messages', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const handler = vi.fn();
      pipe.on('message', handler);

      const ws = MockWebSocket.getLastInstance();
      ws?.simulateMessage('hello world');

      expect(handler).toHaveBeenCalledWith('hello world');
    });

    it('should parse JSON messages', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const handler = vi.fn();
      pipe.on('message', handler);

      const ws = MockWebSocket.getLastInstance();
      ws?.simulateMessage({ type: 'data', value: 42 });

      expect(handler).toHaveBeenCalledWith({ type: 'data', value: 42 });
    });

    it('should emit typed events from event field', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const messageHandler = vi.fn();
      const userJoinHandler = vi.fn();
      pipe.on('message', messageHandler);
      pipe.on('user_join', userJoinHandler);

      const ws = MockWebSocket.getLastInstance();
      ws?.simulateMessage({ event: 'user_join', user: 'Alice' });

      expect(messageHandler).toHaveBeenCalledWith({ event: 'user_join', user: 'Alice' });
      expect(userJoinHandler).toHaveBeenCalledWith({ event: 'user_join', user: 'Alice' });
    });

    it('should not emit typed event for messages without event field', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const customHandler = vi.fn();
      pipe.on('custom', customHandler);

      const ws = MockWebSocket.getLastInstance();
      ws?.simulateMessage({ type: 'data' });

      expect(customHandler).not.toHaveBeenCalled();
    });
  });

  describe('Event Handlers', () => {
    it('should register event handlers', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      const handler = vi.fn();
      pipe.on('test', handler);

      // Handler should not be called yet
      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove event handlers', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const handler = vi.fn();
      pipe.on('message', handler);
      pipe.off('message', handler);

      const ws = MockWebSocket.getLastInstance();
      ws?.simulateMessage('test');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple handlers for same event', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      pipe.on('message', handler1);
      pipe.on('message', handler2);

      const ws = MockWebSocket.getLastInstance();
      ws?.simulateMessage('test');

      expect(handler1).toHaveBeenCalledWith('test');
      expect(handler2).toHaveBeenCalledWith('test');
    });

    it('should only remove the specific handler', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      pipe.on('message', handler1);
      pipe.on('message', handler2);
      pipe.off('message', handler1);

      const ws = MockWebSocket.getLastInstance();
      ws?.simulateMessage('test');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Request/Response Pattern', () => {
    it('should resolve on response', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const ws = MockWebSocket.getLastInstance();

      // Simulate response after a short delay
      setTimeout(() => {
        ws?.simulateMessage({ event: 'response', data: 'pong' });
      }, 10);

      const result = await pipe.request({ type: 'ping' }, { timeout: 1000 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ event: 'response', data: 'pong' });
    });

    it('should timeout when no response received', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const result = await pipe.request({ type: 'ping' }, { timeout: 50 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('should use custom response event', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const ws = MockWebSocket.getLastInstance();

      setTimeout(() => {
        ws?.simulateMessage({ event: 'pong', time: Date.now() });
      }, 10);

      const result = await pipe.request(
        { type: 'ping' },
        { timeout: 1000, responseEvent: 'pong' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('event', 'pong');
    });

    it('should fail when not connected', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      const result = await pipe.request({ type: 'ping' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected');
    });
  });

  describe('Heartbeat', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send heartbeat messages at interval', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
          heartbeat: {
            interval: '1s',
            message: 'ping',
          },
        },
      });

      // Start connect but don't await yet - we need to advance timers first
      const connectPromise = pipe.connect();

      // Advance to allow setImmediate to fire (connection event)
      await vi.advanceTimersByTimeAsync(0);
      await connectPromise;

      const ws = MockWebSocket.getLastInstance();

      // Advance time by 3 seconds
      await vi.advanceTimersByTimeAsync(3000);

      const messages = ws?.getSentMessages() ?? [];
      const pings = messages.filter((m) => m === 'ping');
      expect(pings.length).toBeGreaterThanOrEqual(3);

      await pipe.disconnect();
    });

    it('should stop heartbeat on disconnect', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
          heartbeat: {
            interval: '100ms',
            message: 'ping',
          },
        },
      });

      // Start connect but don't await yet
      const connectPromise = pipe.connect();
      await vi.advanceTimersByTimeAsync(0);
      await connectPromise;

      const ws = MockWebSocket.getLastInstance();

      await vi.advanceTimersByTimeAsync(500);
      const messagesBeforeDisconnect = ws?.getSentMessages().length ?? 0;

      await pipe.disconnect();

      await vi.advanceTimersByTimeAsync(500);
      const messagesAfterDisconnect = ws?.getSentMessages().length ?? 0;

      // No new messages should be sent after disconnect
      expect(messagesAfterDisconnect).toBe(messagesBeforeDisconnect);
    });
  });

  describe('Disconnection Handling', () => {
    it('should update connected status on close', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();
      expect(pipe.isConnected()).toBe(true);

      const ws = MockWebSocket.getLastInstance();
      ws?.simulateClose();

      expect(pipe.isConnected()).toBe(false);
    });
  });

  describe('Connection Failure', () => {
    it('should handle connection failure', async () => {
      MockWebSocket.failNextConnection();

      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      const errorHandler = vi.fn();
      pipe.on('error', errorHandler);

      // Connection should fail
      await expect(pipe.connect()).rejects.toThrow();

      expect(pipe.isConnected()).toBe(false);
    });

    it('should not affect subsequent connections after failure', async () => {
      // First connection fails
      MockWebSocket.failNextConnection();

      const pipe1 = createWebSocketPipe({
        name: 'test-ws-1',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      try {
        await pipe1.connect();
      } catch {
        // Expected
      }

      // Second connection should succeed (flag was reset)
      const pipe2 = createWebSocketPipe({
        name: 'test-ws-2',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe2.connect();
      expect(pipe2.isConnected()).toBe(true);
    });
  });

  describe('Multiple Concurrent Requests', () => {
    it('should handle multiple pending requests', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();
      const ws = MockWebSocket.getLastInstance();

      // Start multiple requests concurrently
      const request1 = pipe.request({ type: 'req1' }, { timeout: 1000, responseEvent: 'resp1' });
      const request2 = pipe.request({ type: 'req2' }, { timeout: 1000, responseEvent: 'resp2' });
      const request3 = pipe.request({ type: 'req3' }, { timeout: 1000, responseEvent: 'resp3' });

      // Respond to them in reverse order
      setTimeout(() => ws?.simulateMessage({ event: 'resp3', data: 'three' }), 10);
      setTimeout(() => ws?.simulateMessage({ event: 'resp2', data: 'two' }), 20);
      setTimeout(() => ws?.simulateMessage({ event: 'resp1', data: 'one' }), 30);

      const [result1, result2, result3] = await Promise.all([request1, request2, request3]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
      expect((result1.data as { data: string })?.data).toBe('one');
      expect((result2.data as { data: string })?.data).toBe('two');
      expect((result3.data as { data: string })?.data).toBe('three');
    });

    it('should handle response arriving after timeout', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();
      const ws = MockWebSocket.getLastInstance();

      // Request with short timeout
      const result = await pipe.request({ type: 'slow' }, { timeout: 10 });

      // Response arrives after timeout
      ws?.simulateMessage({ event: 'response', data: 'too late' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode messages', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const handler = vi.fn();
      pipe.on('message', handler);

      const ws = MockWebSocket.getLastInstance();
      ws?.simulateMessage({ text: '你好世界 🎉' });

      expect(handler).toHaveBeenCalledWith({ text: '你好世界 🎉' });
    });

    it('should handle large messages', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const handler = vi.fn();
      pipe.on('message', handler);

      const largeData = { data: 'x'.repeat(100000) };
      const ws = MockWebSocket.getLastInstance();
      ws?.simulateMessage(largeData);

      expect(handler).toHaveBeenCalledWith(largeData);
    });

    it('should handle invalid JSON as plain text', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const handler = vi.fn();
      pipe.on('message', handler);

      const ws = MockWebSocket.getLastInstance();
      // Simulate raw message that's not valid JSON
      ws?.emit('message', Buffer.from('not valid json {'));

      expect(handler).toHaveBeenCalledWith('not valid json {');
    });

    it('should handle empty messages', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const handler = vi.fn();
      pipe.on('message', handler);

      const ws = MockWebSocket.getLastInstance();
      ws?.emit('message', Buffer.from(''));

      expect(handler).toHaveBeenCalledWith('');
    });

    it('should handle handler errors gracefully', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      pipe.on('message', errorHandler);
      pipe.on('message', normalHandler);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const ws = MockWebSocket.getLastInstance();
      ws?.simulateMessage('test');

      // Normal handler should still be called despite first handler throwing
      expect(normalHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle async handlers', async () => {
      const pipe = createWebSocketPipe({
        name: 'test-ws',
        config: {
          type: 'websocket',
          url: 'wss://example.com/ws',
        },
      });

      await pipe.connect();

      let resolved = false;
      const asyncHandler = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 10));
        resolved = true;
      });

      pipe.on('message', asyncHandler);

      const ws = MockWebSocket.getLastInstance();
      ws?.simulateMessage('test');

      expect(asyncHandler).toHaveBeenCalled();

      // Wait for async handler to complete
      await new Promise((r) => setTimeout(r, 50));
      expect(resolved).toBe(true);
    });
  });
});
