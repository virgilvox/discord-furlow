/**
 * HTTP Pipe Tests
 *
 * Tests real HTTP behavior using MSW (Mock Service Worker).
 * These tests verify actual request/response cycles, not mocked internals.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { HttpPipe, createHttpPipe } from '../http/index.js';

// MSW server setup
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('HttpPipe', () => {
  describe('Basic Requests', () => {
    it('should make a GET request and receive JSON response', async () => {
      server.use(
        http.get('https://api.example.com/users', () => {
          return HttpResponse.json([
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ]);
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.get('/users');

      expect(response.success).toBe(true);
      expect(response.data).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      expect(response.status).toBe(200);
    });

    it('should make a POST request with body', async () => {
      let receivedBody: unknown;

      server.use(
        http.post('https://api.example.com/users', async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({ id: 3, name: 'Charlie' }, { status: 201 });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.post('/users', { name: 'Charlie' });

      expect(response.success).toBe(true);
      expect(response.status).toBe(201);
      expect(response.data).toEqual({ id: 3, name: 'Charlie' });
      expect(receivedBody).toEqual({ name: 'Charlie' });
    });

    it('should make a PUT request', async () => {
      let receivedBody: unknown;

      server.use(
        http.put('https://api.example.com/users/1', async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({ id: 1, name: 'Updated' });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.put('/users/1', { name: 'Updated' });

      expect(response.success).toBe(true);
      expect(receivedBody).toEqual({ name: 'Updated' });
    });

    it('should make a PATCH request', async () => {
      server.use(
        http.patch('https://api.example.com/users/1', () => {
          return HttpResponse.json({ id: 1, name: 'Patched' });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.patch('/users/1', { name: 'Patched' });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: 1, name: 'Patched' });
    });

    it('should make a DELETE request', async () => {
      server.use(
        http.delete('https://api.example.com/users/1', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.delete('/users/1');

      expect(response.success).toBe(true);
      expect(response.status).toBe(204);
    });

    it('should pass query parameters', async () => {
      let receivedParams: URLSearchParams | null = null;

      server.use(
        http.get('https://api.example.com/search', ({ request }) => {
          receivedParams = new URL(request.url).searchParams;
          return HttpResponse.json({ results: [] });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      await pipe.get('/search', { params: { q: 'test', limit: '10' } });

      expect(receivedParams!.get('q')).toBe('test');
      expect(receivedParams!.get('limit')).toBe('10');
    });

    it('should pass custom headers', async () => {
      let receivedHeaders: Headers | null = null;

      server.use(
        http.get('https://api.example.com/data', ({ request }) => {
          receivedHeaders = request.headers;
          return HttpResponse.json({});
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      await pipe.get('/data', { headers: { 'X-Custom-Header': 'custom-value' } });

      expect(receivedHeaders!.get('X-Custom-Header')).toBe('custom-value');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      server.use(
        http.get('https://api.example.com/not-found', () => {
          return HttpResponse.json(
            { error: 'Resource not found' },
            { status: 404 }
          );
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.get('/not-found');

      expect(response.success).toBe(false);
      expect(response.status).toBe(404);
    });

    it('should handle 400 validation errors', async () => {
      server.use(
        http.post('https://api.example.com/users', () => {
          return HttpResponse.json(
            { errors: ['name is required', 'email is invalid'] },
            { status: 400 }
          );
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.post('/users', {});

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(response.data).toEqual({ errors: ['name is required', 'email is invalid'] });
    });

    it('should handle 401 unauthorized errors', async () => {
      server.use(
        http.get('https://api.example.com/protected', () => {
          return HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.get('/protected');

      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should handle 500 server errors', async () => {
      server.use(
        http.get('https://api.example.com/error', () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.get('/error');

      expect(response.success).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should handle network errors', async () => {
      server.use(
        http.get('https://api.example.com/network-error', () => {
          return HttpResponse.error();
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.get('/network-error');

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should apply bearer token authentication', async () => {
      let receivedAuth: string | null = null;

      server.use(
        http.get('https://api.example.com/me', ({ request }) => {
          receivedAuth = request.headers.get('Authorization');
          return HttpResponse.json({ id: 1 });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          auth: { type: 'bearer', token: 'my-secret-token' },
        },
      });

      await pipe.get('/me');

      expect(receivedAuth).toBe('Bearer my-secret-token');
    });

    it('should apply basic authentication', async () => {
      let receivedAuth: string | null = null;

      server.use(
        http.get('https://api.example.com/me', ({ request }) => {
          receivedAuth = request.headers.get('Authorization');
          return HttpResponse.json({ id: 1 });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          auth: { type: 'basic', username: 'user', password: 'pass123' },
        },
      });

      await pipe.get('/me');

      const expectedCredentials = Buffer.from('user:pass123').toString('base64');
      expect(receivedAuth).toBe(`Basic ${expectedCredentials}`);
    });

    it('should apply custom header authentication', async () => {
      let receivedApiKey: string | null = null;

      server.use(
        http.get('https://api.example.com/data', ({ request }) => {
          receivedApiKey = request.headers.get('X-API-Key');
          return HttpResponse.json({});
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          auth: { type: 'header', header_name: 'X-API-Key', token: 'api-key-123' },
        },
      });

      await pipe.get('/data');

      expect(receivedApiKey).toBe('api-key-123');
    });

    it('should use Authorization header by default for header auth', async () => {
      let receivedAuth: string | null = null;

      server.use(
        http.get('https://api.example.com/data', ({ request }) => {
          receivedAuth = request.headers.get('Authorization');
          return HttpResponse.json({});
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          auth: { type: 'header', token: 'custom-token' },
        },
      });

      await pipe.get('/data');

      expect(receivedAuth).toBe('custom-token');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit', async () => {
      server.use(
        http.get('https://api.example.com/data', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          rate_limit: { requests: 3, per: '1m' },
        },
      });

      // First 3 requests should succeed
      const responses = await Promise.all([
        pipe.get('/data'),
        pipe.get('/data'),
        pipe.get('/data'),
      ]);

      expect(responses[0].success).toBe(true);
      expect(responses[1].success).toBe(true);
      expect(responses[2].success).toBe(true);

      // 4th request should be rate limited
      const limitedResponse = await pipe.get('/data');
      expect(limitedResponse.success).toBe(false);
      expect(limitedResponse.status).toBe(429);
      expect(limitedResponse.error).toBe('Rate limit exceeded');
    });

    it('should reset rate limit after window expires', async () => {
      vi.useFakeTimers();

      server.use(
        http.get('https://api.example.com/data', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          rate_limit: { requests: 2, per: '1s' },
        },
      });

      // Use up the rate limit
      await pipe.get('/data');
      await pipe.get('/data');

      // Should be rate limited
      const limited = await pipe.get('/data');
      expect(limited.success).toBe(false);
      expect(limited.status).toBe(429);

      // Advance time past the window
      vi.advanceTimersByTime(1100);

      // Should work again
      const afterReset = await pipe.get('/data');
      expect(afterReset.success).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 500 errors', async () => {
      let attemptCount = 0;

      server.use(
        http.get('https://api.example.com/flaky', () => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.json({ error: 'Server error' }, { status: 500 });
          }
          return HttpResponse.json({ success: true });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          retry: { attempts: 3, delay: '10ms' },
        },
      });

      const response = await pipe.get('/flaky');

      expect(response.success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    it('should retry on 502 gateway errors', async () => {
      let attemptCount = 0;

      server.use(
        http.get('https://api.example.com/gateway', () => {
          attemptCount++;
          if (attemptCount < 2) {
            return HttpResponse.json({ error: 'Bad Gateway' }, { status: 502 });
          }
          return HttpResponse.json({ ok: true });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          retry: { attempts: 3, delay: '10ms' },
        },
      });

      const response = await pipe.get('/gateway');

      expect(response.success).toBe(true);
      expect(attemptCount).toBe(2);
    });

    it('should retry on 503 service unavailable', async () => {
      let attemptCount = 0;

      server.use(
        http.get('https://api.example.com/unavailable', () => {
          attemptCount++;
          if (attemptCount < 2) {
            return HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 });
          }
          return HttpResponse.json({ ok: true });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          retry: { attempts: 3, delay: '10ms' },
        },
      });

      const response = await pipe.get('/unavailable');

      expect(response.success).toBe(true);
      expect(attemptCount).toBe(2);
    });

    it('should NOT retry on 4xx errors', async () => {
      let attemptCount = 0;

      server.use(
        http.get('https://api.example.com/bad-request', () => {
          attemptCount++;
          return HttpResponse.json({ error: 'Bad Request' }, { status: 400 });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          retry: { attempts: 3, delay: '10ms' },
        },
      });

      const response = await pipe.get('/bad-request');

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(attemptCount).toBe(1); // No retries
    });

    it('should stop retrying after max attempts', async () => {
      let attemptCount = 0;

      server.use(
        http.get('https://api.example.com/always-fails', () => {
          attemptCount++;
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          retry: { attempts: 3, delay: '10ms' },
        },
      });

      const response = await pipe.get('/always-fails');

      expect(response.success).toBe(false);
      expect(response.status).toBe(500);
      expect(attemptCount).toBe(4); // Initial + 3 retries
    });

    it('should retry on network errors', async () => {
      let attemptCount = 0;

      server.use(
        http.get('https://api.example.com/network', () => {
          attemptCount++;
          if (attemptCount < 2) {
            return HttpResponse.error();
          }
          return HttpResponse.json({ ok: true });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          retry: { attempts: 3, delay: '10ms' },
        },
      });

      const response = await pipe.get('/network');

      expect(response.success).toBe(true);
      expect(attemptCount).toBe(2);
    });
  });

  describe('Response Headers', () => {
    it('should include response headers in successful response', async () => {
      server.use(
        http.get('https://api.example.com/data', () => {
          return HttpResponse.json(
            { data: 'test' },
            {
              headers: {
                'X-Request-ID': 'abc123',
                'X-RateLimit-Remaining': '99',
              },
            }
          );
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.get('/data');

      expect(response.success).toBe(true);
      expect(response.headers).toBeDefined();
      expect(response.headers?.['x-request-id']).toBe('abc123');
      expect(response.headers?.['x-ratelimit-remaining']).toBe('99');
    });
  });

  describe('Configuration', () => {
    it('should use default headers', async () => {
      let receivedHeaders: Headers | null = null;

      server.use(
        http.get('https://api.example.com/data', ({ request }) => {
          receivedHeaders = request.headers;
          return HttpResponse.json({});
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          headers: {
            'X-Client-Version': '1.0.0',
            'Accept': 'application/json',
          },
        },
      });

      await pipe.get('/data');

      expect(receivedHeaders!.get('X-Client-Version')).toBe('1.0.0');
      expect(receivedHeaders!.get('Accept')).toBe('application/json');
    });

    it('should report as connected (HTTP is stateless)', () => {
      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      expect(pipe.isConnected()).toBe(true);
    });

    it('should have correct name and type', () => {
      const pipe = createHttpPipe({
        name: 'my-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      expect(pipe.name).toBe('my-api');
      expect(pipe.type).toBe('http');
    });
  });

  describe('Request Method Routing', () => {
    it('should route request() method correctly', async () => {
      const methods: string[] = [];

      server.use(
        http.get('https://api.example.com/test', () => {
          methods.push('GET');
          return HttpResponse.json({});
        }),
        http.post('https://api.example.com/test', () => {
          methods.push('POST');
          return HttpResponse.json({});
        }),
        http.put('https://api.example.com/test', () => {
          methods.push('PUT');
          return HttpResponse.json({});
        }),
        http.patch('https://api.example.com/test', () => {
          methods.push('PATCH');
          return HttpResponse.json({});
        }),
        http.delete('https://api.example.com/test', () => {
          methods.push('DELETE');
          return HttpResponse.json({});
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      await pipe.request('GET', '/test');
      await pipe.request('POST', '/test');
      await pipe.request('PUT', '/test');
      await pipe.request('PATCH', '/test');
      await pipe.request('DELETE', '/test');

      expect(methods).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response body', async () => {
      server.use(
        http.get('https://api.example.com/empty', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.get('/empty');

      expect(response.success).toBe(true);
      expect(response.status).toBe(204);
    });

    it('should handle large JSON response', async () => {
      const largeData = Array(1000).fill(null).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: 'x'.repeat(100),
      }));

      server.use(
        http.get('https://api.example.com/large', () => {
          return HttpResponse.json(largeData);
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const response = await pipe.get('/large');

      expect(response.success).toBe(true);
      expect((response.data as any[]).length).toBe(1000);
    });

    it('should handle special characters in URL path', async () => {
      let receivedPath: string | null = null;

      server.use(
        http.get('https://api.example.com/users/:id', ({ request }) => {
          receivedPath = new URL(request.url).pathname;
          return HttpResponse.json({ id: 'user@test.com' });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      await pipe.get('/users/user@test.com');

      expect(receivedPath).toBe('/users/user@test.com');
    });

    it('should handle unicode in request body', async () => {
      let receivedBody: unknown;

      server.use(
        http.post('https://api.example.com/data', async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({ received: true });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      await pipe.post('/data', {
        message: '你好世界',
        emoji: '🎉',
        mixed: 'Hello 世界 🌍',
      });

      expect(receivedBody).toEqual({
        message: '你好世界',
        emoji: '🎉',
        mixed: 'Hello 世界 🌍',
      });
    });

    it('should handle null values in request body', async () => {
      let receivedBody: unknown;

      server.use(
        http.post('https://api.example.com/data', async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({});
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      await pipe.post('/data', {
        value: null,
        nested: { inner: null },
      });

      expect(receivedBody).toEqual({
        value: null,
        nested: { inner: null },
      });
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      server.use(
        http.get('https://api.example.com/item/:id', async ({ params }) => {
          // Add small delay to simulate real API
          await new Promise(resolve => setTimeout(resolve, 10));
          return HttpResponse.json({ id: params.id });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: { type: 'http', base_url: 'https://api.example.com' },
      });

      const requests = Array(10).fill(null).map((_, i) =>
        pipe.get(`/item/${i}`)
      );

      const responses = await Promise.all(requests);

      for (let i = 0; i < 10; i++) {
        expect(responses[i].success).toBe(true);
        expect((responses[i].data as any).id).toBe(String(i));
      }
    });

    it('should track rate limits correctly under concurrent requests', async () => {
      server.use(
        http.get('https://api.example.com/data', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      const pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          rate_limit: { requests: 5, per: '1m' },
        },
      });

      // Fire 10 concurrent requests
      const responses = await Promise.all(
        Array(10).fill(null).map(() => pipe.get('/data'))
      );

      const successful = responses.filter(r => r.success).length;
      const rateLimited = responses.filter(r => r.status === 429).length;

      // With rate limit of 5, exactly 5 should succeed and 5 should be rate limited
      expect(successful).toBe(5);
      expect(rateLimited).toBe(5);
    });
  });
});
