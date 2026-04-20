/**
 * Database Pipe Integration Tests
 *
 * Tests actual DatabasePipe behavior with memory adapter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabasePipe, createDatabasePipe } from '../database/index.js';

describe('DatabasePipe Integration', () => {
  describe('Connection', () => {
    it('should connect with memory adapter', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      expect(pipe.isConnected()).toBe(false);

      await pipe.connect();

      expect(pipe.isConnected()).toBe(true);
    });

    it('should emit connected event', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const connectedHandler = vi.fn();
      pipe.on('connected', connectedHandler);

      await pipe.connect();

      expect(connectedHandler).toHaveBeenCalled();
    });

    it('should disconnect properly', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      await pipe.connect();
      expect(pipe.isConnected()).toBe(true);

      await pipe.disconnect();
      expect(pipe.isConnected()).toBe(false);
    });

    it('should emit disconnected event', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const disconnectedHandler = vi.fn();
      pipe.on('disconnected', disconnectedHandler);

      await pipe.connect();
      await pipe.disconnect();

      expect(disconnectedHandler).toHaveBeenCalled();
    });

    it('should handle multiple connect calls gracefully', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      await pipe.connect();
      await pipe.connect(); // Should not throw

      expect(pipe.isConnected()).toBe(true);
    });

    it('should handle multiple disconnect calls gracefully', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      await pipe.connect();
      await pipe.disconnect();
      await pipe.disconnect(); // Should not throw

      expect(pipe.isConnected()).toBe(false);
    });

    it('should reject unsupported adapter', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'mysql' as any,
          connection: 'mysql://localhost',
        },
      });

      await expect(pipe.connect()).rejects.toThrow('Unsupported adapter');
    });
  });

  describe('Query Operations', () => {
    it('should query data', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      await pipe.connect();

      const result = await pipe.query('SELECT * FROM users');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should fail query when not connected', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const result = await pipe.query('SELECT * FROM users');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected');
    });
  });

  describe('Insert Operations', () => {
    it('should insert data', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      await pipe.connect();

      const result = await pipe.insert('users', {
        name: 'John',
        email: 'john@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.data?.lastInsertRowid).toBe(1);
    });

    it('should emit insert event', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const insertHandler = vi.fn();
      pipe.on('insert', insertHandler);

      await pipe.connect();
      await pipe.insert('users', { name: 'John' });

      expect(insertHandler).toHaveBeenCalledWith({
        type: 'insert',
        table: 'users',
        data: { name: 'John' },
      });
    });

    it('should emit change event on insert', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const changeHandler = vi.fn();
      pipe.on('change', changeHandler);

      await pipe.connect();
      await pipe.insert('users', { name: 'John' });

      expect(changeHandler).toHaveBeenCalledWith({
        type: 'insert',
        table: 'users',
        data: { name: 'John' },
      });
    });

    it('should auto-increment IDs', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      await pipe.connect();

      const result1 = await pipe.insert('users', { name: 'John' });
      const result2 = await pipe.insert('users', { name: 'Jane' });

      expect(result1.data?.lastInsertRowid).toBe(1);
      expect(result2.data?.lastInsertRowid).toBe(2);
    });

    it('should fail insert when not connected', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const result = await pipe.insert('users', { name: 'John' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected');
    });
  });

  describe('Update Operations', () => {
    it('should update data', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      await pipe.connect();
      await pipe.insert('users', { name: 'John', email: 'john@old.com' });

      const result = await pipe.update(
        'users',
        { name: 'John' },
        { email: 'john@new.com' }
      );

      expect(result.success).toBe(true);
      expect(result.data?.changes).toBe(1);
    });

    it('should emit update event', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const updateHandler = vi.fn();
      pipe.on('update', updateHandler);

      await pipe.connect();
      await pipe.insert('users', { name: 'John' });
      await pipe.update('users', { name: 'John' }, { email: 'new@email.com' });

      expect(updateHandler).toHaveBeenCalledWith({
        type: 'update',
        table: 'users',
        data: { email: 'new@email.com' },
        oldData: { name: 'John' },
      });
    });

    it('should emit change event on update', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const changeHandler = vi.fn();
      pipe.on('change', changeHandler);

      await pipe.connect();
      await pipe.insert('users', { name: 'John' });
      changeHandler.mockClear(); // Clear the insert change event

      await pipe.update('users', { name: 'John' }, { email: 'new@email.com' });

      expect(changeHandler).toHaveBeenCalledWith({
        type: 'update',
        table: 'users',
        data: { email: 'new@email.com' },
        oldData: { name: 'John' },
      });
    });

    it('should update multiple rows', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      await pipe.connect();
      await pipe.insert('users', { name: 'John', active: true });
      await pipe.insert('users', { name: 'Jane', active: true });

      const result = await pipe.update(
        'users',
        { active: true },
        { active: false }
      );

      expect(result.success).toBe(true);
      expect(result.data?.changes).toBe(2);
    });

    it('should fail update when not connected', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const result = await pipe.update('users', { id: 1 }, { name: 'John' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected');
    });
  });

  describe('Delete Operations', () => {
    it('should delete data', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      await pipe.connect();
      await pipe.insert('users', { name: 'John' });

      const result = await pipe.delete('users', { name: 'John' });

      expect(result.success).toBe(true);
      expect(result.data?.changes).toBe(1);
    });

    it('should emit delete event', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const deleteHandler = vi.fn();
      pipe.on('delete', deleteHandler);

      await pipe.connect();
      await pipe.insert('users', { name: 'John' });
      await pipe.delete('users', { name: 'John' });

      expect(deleteHandler).toHaveBeenCalledWith({
        type: 'delete',
        table: 'users',
        data: { name: 'John' },
      });
    });

    it('should emit change event on delete', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const changeHandler = vi.fn();
      pipe.on('change', changeHandler);

      await pipe.connect();
      await pipe.insert('users', { name: 'John' });
      changeHandler.mockClear(); // Clear the insert change event

      await pipe.delete('users', { name: 'John' });

      expect(changeHandler).toHaveBeenCalledWith({
        type: 'delete',
        table: 'users',
        data: { name: 'John' },
      });
    });

    it('should delete multiple rows', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      await pipe.connect();
      await pipe.insert('users', { name: 'John', active: false });
      await pipe.insert('users', { name: 'Jane', active: false });

      const result = await pipe.delete('users', { active: false });

      expect(result.success).toBe(true);
      expect(result.data?.changes).toBe(2);
    });

    it('should fail delete when not connected', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const result = await pipe.delete('users', { id: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected');
    });
  });

  describe('Event Handler Management', () => {
    it('should allow removing event handlers', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const handler = vi.fn();
      pipe.on('insert', handler);
      pipe.off('insert', handler);

      await pipe.connect();
      await pipe.insert('users', { name: 'John' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple handlers for same event', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      pipe.on('insert', handler1);
      pipe.on('insert', handler2);

      await pipe.connect();
      await pipe.insert('users', { name: 'John' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Full Workflow', () => {
    it('should handle complete CRUD workflow', async () => {
      const pipe = createDatabasePipe({
        name: 'test-db',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });

      await pipe.connect();

      // Create
      const insertResult = await pipe.insert('users', {
        name: 'John',
        email: 'john@example.com',
      });
      expect(insertResult.success).toBe(true);

      // Read
      const queryResult = await pipe.query('SELECT * FROM users');
      expect(queryResult.success).toBe(true);
      expect((queryResult.data as any[]).length).toBe(1);

      // Update
      const updateResult = await pipe.update(
        'users',
        { name: 'John' },
        { email: 'john.updated@example.com' }
      );
      expect(updateResult.success).toBe(true);

      // Delete
      const deleteResult = await pipe.delete('users', { name: 'John' });
      expect(deleteResult.success).toBe(true);

      // Verify deletion
      const finalQueryResult = await pipe.query('SELECT * FROM users');
      expect(finalQueryResult.success).toBe(true);
      expect((finalQueryResult.data as any[]).length).toBe(0);

      await pipe.disconnect();
    });
  });

  describe('SQL injection defense', () => {
    // These tests assert the identifier validator in
    // `packages/pipes/src/database/index.ts` rejects every crafted table or
    // column name that attempts to break out of the identifier context.
    async function pipeFor(): Promise<DatabasePipe> {
      const pipe = createDatabasePipe({
        name: 'sqli-test',
        config: {
          type: 'database',
          adapter: 'memory',
          connection: ':memory:',
        },
      });
      await pipe.connect();
      return pipe;
    }

    const MALICIOUS_IDENTIFIERS = [
      'users; DROP TABLE users',
      "users'; DROP TABLE users; --",
      'users" OR "1"="1',
      'users/*comment*/',
      ' users',
      'users ',
      'users--',
      'users,products',
      '1users',
      '',
      'users.products',
      'users[0]',
      '`users`',
    ];

    it.each(MALICIOUS_IDENTIFIERS)(
      'insert() rejects malicious table name: %s',
      async (badTable) => {
        const pipe = await pipeFor();
        const result = await pipe.insert(badTable, { name: 'X' });
        expect(result.success).toBe(false);
        await pipe.disconnect();
      },
    );

    it('update() rejects injection via the where column name', async () => {
      const pipe = await pipeFor();
      const result = await pipe.update(
        'users',
        { 'name; DROP TABLE users; --': 'John' } as unknown as Record<string, string>,
        { email: 'x@y.z' },
      );
      expect(result.success).toBe(false);
      await pipe.disconnect();
    });

    it('update() rejects injection via the data column name', async () => {
      const pipe = await pipeFor();
      const result = await pipe.update(
        'users',
        { name: 'John' },
        { "email'; DROP TABLE users; --": 'x@y.z' } as unknown as Record<string, string>,
      );
      expect(result.success).toBe(false);
      await pipe.disconnect();
    });

    it('delete() rejects injection via the where column name', async () => {
      const pipe = await pipeFor();
      const result = await pipe.delete('users', {
        'name OR 1=1': 'anything',
      } as unknown as Record<string, unknown>);
      expect(result.success).toBe(false);
      await pipe.disconnect();
    });

    it('valid snake_case identifiers still work after hardening', async () => {
      const pipe = await pipeFor();
      const result = await pipe.insert('users', {
        name: 'Valid Name',
        email_address: 'user@example.com',
      });
      expect(result.success).toBe(true);
      await pipe.disconnect();
    });
  });
});
