/**
 * HTTP Pipe Integration Tests
 *
 * Tests actual HttpPipe behavior with mocked axios responses
 * More meaningful than just testing helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { HttpPipe, createHttpPipe } from '../http/index.js';

// Create a more realistic mock that captures actual behavior
vi.mock('axios', () => {
  const mockRequest = vi.fn();
  const mockInterceptorsUse = vi.fn();

  const mockAxios = {
    create: vi.fn(() => ({
      request: mockRequest,
      interceptors: {
        request: {
          use: mockInterceptorsUse,
        },
      },
    })),
    isAxiosError: (error: unknown): error is { isAxiosError: true; response?: { status: number; data: unknown }; message: string } => {
      return typeof error === 'object' && error !== null && 'isAxiosError' in error;
    },
  };

  return { default: mockAxios, __mockRequest: mockRequest, __mockInterceptorsUse: mockInterceptorsUse };
});

describe('HttpPipe Integration', () => {
  let pipe: HttpPipe;
  let mockRequest: ReturnType<typeof vi.fn>;
  let mockInterceptorsUse: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const axiosModule = await import('axios') as unknown as {
      __mockRequest: ReturnType<typeof vi.fn>;
      __mockInterceptorsUse: ReturnType<typeof vi.fn>;
    };
    mockRequest = axiosModule.__mockRequest;
    mockInterceptorsUse = axiosModule.__mockInterceptorsUse;
    mockRequest.mockReset();
    mockInterceptorsUse.mockReset();
  });

  describe('Request Methods', () => {
    beforeEach(() => {
      pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
        },
      });
    });

    it('should make GET request and return data', async () => {
      mockRequest.mockResolvedValueOnce({
        data: { users: [{ id: 1, name: 'Alice' }] },
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

      const result = await pipe.get<{ users: { id: number; name: string }[] }>('/users');

      expect(result.success).toBe(true);
      expect(result.data?.users).toHaveLength(1);
      expect(result.data?.users[0].name).toBe('Alice');
      expect(result.status).toBe(200);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/users',
        })
      );
    });

    it('should make POST request with body', async () => {
      mockRequest.mockResolvedValueOnce({
        data: { id: 123, created: true },
        status: 201,
        headers: {},
      });

      const result = await pipe.post<{ id: number; created: boolean }>(
        '/users',
        { name: 'Bob', email: 'bob@example.com' }
      );

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(123);
      expect(result.status).toBe(201);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/users',
          data: { name: 'Bob', email: 'bob@example.com' },
        })
      );
    });

    it('should make PUT request', async () => {
      mockRequest.mockResolvedValueOnce({
        data: { updated: true },
        status: 200,
        headers: {},
      });

      const result = await pipe.put('/users/1', { name: 'Updated' });

      expect(result.success).toBe(true);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/users/1',
        })
      );
    });

    it('should make PATCH request', async () => {
      mockRequest.mockResolvedValueOnce({
        data: { patched: true },
        status: 200,
        headers: {},
      });

      const result = await pipe.patch('/users/1', { email: 'new@example.com' });

      expect(result.success).toBe(true);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should make DELETE request', async () => {
      mockRequest.mockResolvedValueOnce({
        data: null,
        status: 204,
        headers: {},
      });

      const result = await pipe.delete('/users/1');

      expect(result.success).toBe(true);
      expect(result.status).toBe(204);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      pipe = createHttpPipe({
        name: 'test-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
        },
      });
    });

    it('should handle 4xx errors gracefully', async () => {
      const axiosError = {
        isAxiosError: true,
        message: 'Request failed with status code 404',
        response: {
          status: 404,
          data: { error: 'Not found' },
        },
      };
      mockRequest.mockRejectedValueOnce(axiosError);

      const result = await pipe.get('/nonexistent');

      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error).toContain('404');
    });

    it('should handle 5xx errors', async () => {
      const axiosError = {
        isAxiosError: true,
        message: 'Request failed with status code 500',
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      };
      mockRequest.mockRejectedValueOnce(axiosError);

      const result = await pipe.get('/api');

      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
    });

    it('should handle network errors', async () => {
      const networkError = {
        isAxiosError: true,
        message: 'Network Error',
        response: undefined,
      };
      mockRequest.mockRejectedValueOnce(networkError);

      const result = await pipe.get('/api');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network Error');
    });

    it('should handle non-axios errors', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Unexpected error'));

      const result = await pipe.get('/api');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected error');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      pipe = createHttpPipe({
        name: 'rate-limited-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          rate_limit: {
            requests: 2,
            per: '1m',
          },
        },
      });

      mockRequest.mockResolvedValue({ data: {}, status: 200, headers: {} });

      // First two requests should succeed
      const result1 = await pipe.get('/test');
      const result2 = await pipe.get('/test');
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Third request should be rate limited
      const result3 = await pipe.get('/test');
      expect(result3.success).toBe(false);
      expect(result3.status).toBe(429);
      expect(result3.error).toContain('Rate limit');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 5xx errors', async () => {
      pipe = createHttpPipe({
        name: 'retry-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          retry: {
            attempts: 2,
            delay: '10ms',
          },
        },
      });

      // First call fails with 500, second succeeds
      mockRequest
        .mockRejectedValueOnce({
          isAxiosError: true,
          message: 'Server error',
          response: { status: 500 },
        })
        .mockResolvedValueOnce({
          data: { success: true },
          status: 200,
          headers: {},
        });

      const result = await pipe.get('/api');

      expect(result.success).toBe(true);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors', async () => {
      pipe = createHttpPipe({
        name: 'retry-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          retry: {
            attempts: 3,
            delay: '10ms',
          },
        },
      });

      mockRequest.mockRejectedValueOnce({
        isAxiosError: true,
        message: 'Bad request',
        response: { status: 400, data: { error: 'Invalid input' } },
      });

      const result = await pipe.get('/api');

      expect(result.success).toBe(false);
      expect(mockRequest).toHaveBeenCalledTimes(1); // No retry on 4xx
    });

    it('should stop retrying after max attempts', async () => {
      pipe = createHttpPipe({
        name: 'retry-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          retry: {
            attempts: 2,
            delay: '10ms',
          },
        },
      });

      // All calls fail
      mockRequest.mockRejectedValue({
        isAxiosError: true,
        message: 'Server error',
        response: { status: 503 },
      });

      const result = await pipe.get('/api');

      expect(result.success).toBe(false);
      expect(mockRequest).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Authentication', () => {
    it('should add bearer auth interceptor', () => {
      pipe = createHttpPipe({
        name: 'auth-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          auth: {
            type: 'bearer',
            token: 'my-secret-token',
          },
        },
      });

      // Verify interceptor was added
      expect(mockInterceptorsUse).toHaveBeenCalled();
    });

    it('should add basic auth interceptor', () => {
      pipe = createHttpPipe({
        name: 'auth-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          auth: {
            type: 'basic',
            username: 'user',
            password: 'pass',
          },
        },
      });

      expect(mockInterceptorsUse).toHaveBeenCalled();
    });
  });

  describe('Custom Headers', () => {
    it('should pass custom headers in requests', async () => {
      pipe = createHttpPipe({
        name: 'custom-headers-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
          headers: {
            'X-Custom-Header': 'custom-value',
          },
        },
      });

      mockRequest.mockResolvedValueOnce({ data: {}, status: 200, headers: {} });

      await pipe.get('/test', {
        headers: { 'X-Request-Header': 'request-value' },
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'X-Request-Header': 'request-value' },
        })
      );
    });
  });

  describe('Query Parameters', () => {
    it('should pass query parameters', async () => {
      pipe = createHttpPipe({
        name: 'query-api',
        config: {
          type: 'http',
          base_url: 'https://api.example.com',
        },
      });

      mockRequest.mockResolvedValueOnce({ data: [], status: 200, headers: {} });

      await pipe.get('/search', {
        params: { q: 'test', page: '1' },
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { q: 'test', page: '1' },
        })
      );
    });
  });
});
