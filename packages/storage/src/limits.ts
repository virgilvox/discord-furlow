/**
 * Storage-layer size caps. Enforced by adapters on every write path so no
 * single spec can fill disk, blow up the heap, or ship a 50MB blob into a
 * single state key.
 *
 * The CLI's per-handler quota (see `@furlow/core/flows/quota`) bounds the
 * number of writes per invocation. These constants bound the size of a
 * single write.
 */

/** Max serialized bytes for a single state value. 1 MB. */
export const MAX_STATE_VALUE_BYTES = 1_000_000;

/** Max length of any array stored in state (list_push, set_map, batch.items). 10k. */
export const MAX_ARRAY_LENGTH = 10_000;

/** Max bytes for a single log message after interpolation. 25 KB. */
export const MAX_LOG_MESSAGE_BYTES = 25_000;

export class ValueTooLargeError extends Error {
  readonly code = 'E_VALUE_TOO_LARGE';
  readonly limit: number;
  readonly observed: number;
  constructor(observed: number, limit: number) {
    super(`Value exceeds ${limit}-byte cap (observed ${observed} bytes)`);
    this.name = 'ValueTooLargeError';
    this.limit = limit;
    this.observed = observed;
  }
}

export class ArrayTooLongError extends Error {
  readonly code = 'E_ARRAY_TOO_LONG';
  readonly limit: number;
  readonly observed: number;
  constructor(observed: number, limit: number = MAX_ARRAY_LENGTH) {
    super(`Array exceeds ${limit}-item cap (observed ${observed} items)`);
    this.name = 'ArrayTooLongError';
    this.limit = limit;
    this.observed = observed;
  }
}

/**
 * Measure serialized byte length for size-cap comparisons. Uses
 * `Buffer.byteLength(JSON.stringify(value))`. Circular structures throw
 * their own TypeError from `JSON.stringify`; we let that propagate because
 * it signals a bug in the spec, not a cap violation.
 */
export function measureBytes(value: unknown): number {
  if (typeof value === 'string') return Buffer.byteLength(value, 'utf8');
  if (value === null || value === undefined) return 0;
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

/**
 * Assert a stored value is within the size cap. Call this on the value
 * portion of a `StoredValue` (i.e. `stored.value`), not the envelope.
 */
export function assertValueWithinCap(value: unknown, limit: number = MAX_STATE_VALUE_BYTES): void {
  const size = measureBytes(value);
  if (size > limit) throw new ValueTooLargeError(size, limit);
}

/**
 * Assert an array length is within the cap.
 */
export function assertArrayWithinCap(arr: readonly unknown[], limit: number = MAX_ARRAY_LENGTH): void {
  if (arr.length > limit) throw new ArrayTooLongError(arr.length, limit);
}
