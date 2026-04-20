/**
 * Where-clause helpers (M7).
 *
 * Extends `db_query.where` from plain equality lookups to support pattern
 * operators. Each adapter consumes `WhereClauseEntry` values uniformly and
 * chooses its own SQL translation (or in-memory implementation for the
 * memory adapter).
 *
 * Usage:
 *
 *   where:
 *     name:
 *       op: startswith
 *       value: "admin_"
 *     guild_id: "123"            # plain values still mean equality
 *
 * Operators:
 *   - eq         value === operand (default when a plain value is given)
 *   - like       SQL LIKE pattern (user supplies `%` / `_`); 256-char cap
 *   - startswith value begins with the operand
 *   - endswith   value ends with the operand
 *   - contains   value contains the operand
 */

export type WhereOp = 'eq' | 'like' | 'startswith' | 'endswith' | 'contains';

export interface WhereClauseEntry {
  op: WhereOp;
  value: string;
}

/** Maximum pattern length for any LIKE-flavoured clause. */
export const MAX_WHERE_PATTERN_LENGTH = 256;

export class InvalidWhereClauseError extends Error {
  readonly code = 'E_INVALID_WHERE';
  constructor(reason: string) {
    super(`Invalid where clause: ${reason}`);
    this.name = 'InvalidWhereClauseError';
  }
}

/**
 * Detect whether a where-entry uses the operator form.
 */
export function isWhereClauseEntry(value: unknown): value is WhereClauseEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'op' in value &&
    'value' in value &&
    typeof (value as { op: unknown }).op === 'string'
  );
}

/**
 * Validate an operator entry. Throws InvalidWhereClauseError on bad input so
 * query callers can surface the reason to the user.
 */
export function validateWhereClauseEntry(entry: WhereClauseEntry): void {
  const allowed: WhereOp[] = ['eq', 'like', 'startswith', 'endswith', 'contains'];
  if (!allowed.includes(entry.op)) {
    throw new InvalidWhereClauseError(`unknown operator "${entry.op}"`);
  }
  if (typeof entry.value !== 'string') {
    throw new InvalidWhereClauseError(`value must be a string for op "${entry.op}"`);
  }
  if (entry.value.length > MAX_WHERE_PATTERN_LENGTH) {
    throw new InvalidWhereClauseError(
      `value exceeds ${MAX_WHERE_PATTERN_LENGTH}-char cap for op "${entry.op}"`,
    );
  }
}

/**
 * Escape `%` and `_` in user-supplied strings so they do not carry special
 * meaning in a SQL LIKE pattern. Used by startswith/endswith/contains to
 * build safe LIKE patterns around literal content.
 */
export function escapeLikeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Test a value against a single where-entry in JavaScript. Used by the
 * memory adapter and tests; SQL adapters translate to their native forms.
 */
export function matchWhereValue(rowValue: unknown, entry: WhereClauseEntry): boolean {
  const target = String(rowValue ?? '');
  const needle = entry.value;
  switch (entry.op) {
    case 'eq':         return rowValue === needle;
    case 'startswith': return target.startsWith(needle);
    case 'endswith':   return target.endsWith(needle);
    case 'contains':   return target.includes(needle);
    case 'like': {
      // Translate SQL LIKE into a JS regex: % = .*, _ = ., everything else
      // escaped. Backslash acts as an escape for % and _.
      let re = '';
      let i = 0;
      while (i < needle.length) {
        const ch = needle[i]!;
        if (ch === '\\' && i + 1 < needle.length) {
          re += needle[i + 1]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          i += 2;
          continue;
        }
        if (ch === '%') re += '.*';
        else if (ch === '_') re += '.';
        else re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        i++;
      }
      return new RegExp(`^${re}$`).test(target);
    }
    default:
      return false;
  }
}
