# Custom Actions

Learn how to create custom action handlers for FURLOW.

## Overview

While FURLOW provides 84+ built-in actions, you may need custom functionality. Custom actions let you:

- Integrate with external services
- Implement complex business logic
- Add domain-specific operations
- Extend the action system

## Creating a Custom Action

### Basic Structure

```typescript
import { ActionHandler, ActionContext } from '@furlow/core';

export const myCustomAction: ActionHandler<MyActionConfig> = {
  name: 'my_action',
  schema: myActionSchema,
  async execute(config, context) {
    // Your action logic here
    return result;
  },
};
```

### Type Definition

```typescript
interface MyActionConfig {
  required_field: string;
  optional_field?: number;
}

const myActionSchema = {
  type: 'object',
  properties: {
    required_field: { type: 'string' },
    optional_field: { type: 'number' },
  },
  required: ['required_field'],
};
```

### Full Example

```typescript
import { ActionHandler, ActionContext } from '@furlow/core';
import { z } from 'zod';

// Schema for validation
const translateSchema = z.object({
  text: z.string(),
  from: z.string().optional().default('auto'),
  to: z.string(),
  as: z.string().optional(),
});

type TranslateConfig = z.infer<typeof translateSchema>;

export const translateAction: ActionHandler<TranslateConfig> = {
  name: 'translate',

  // JSON Schema for YAML validation
  schema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to translate' },
      from: { type: 'string', default: 'auto' },
      to: { type: 'string', description: 'Target language code' },
      as: { type: 'string', description: 'Variable name to store result' },
    },
    required: ['text', 'to'],
  },

  async execute(config, context: ActionContext) {
    // Resolve expressions in config
    const text = await context.resolveExpression(config.text);
    const from = await context.resolveExpression(config.from);
    const to = await context.resolveExpression(config.to);

    // Call translation API
    const response = await fetch('https://api.example.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from, to }),
    });

    const result = await response.json();

    // Store in variable if requested
    if (config.as) {
      context.setVariable(config.as, result.translation);
    }

    return result.translation;
  },
};
```

## Registering Custom Actions

### In Code

```typescript
import { Furlow } from '@furlow/core';
import { translateAction } from './actions/translate';

const furlow = new Furlow({
  token: process.env.DISCORD_TOKEN,
});

// Register custom action
furlow.registerAction(translateAction);

await furlow.start();
```

### As a Plugin

```typescript
import { FurlowPlugin } from '@furlow/core';
import { translateAction } from './actions/translate';
import { summarizeAction } from './actions/summarize';

export const aiPlugin: FurlowPlugin = {
  name: 'ai-tools',
  version: '1.0.0',
  actions: [translateAction, summarizeAction],
};

// Usage
furlow.use(aiPlugin);
```

## Action Context

The `ActionContext` provides access to:

### Discord Objects

```typescript
context.guild      // Current guild
context.channel    // Current channel
context.user       // Triggering user
context.member     // Guild member
context.message    // Triggering message (if applicable)
context.interaction // Interaction (if applicable)
```

### Expression Resolution

```typescript
// Resolve a single expression
const value = await context.resolveExpression('${user.id}');

// Resolve all expressions in an object
const resolved = await context.resolveConfig(config);
```

### State Management

```typescript
// Get state
const count = context.getState('guild', 'counter');

// Set state
context.setState('guild', 'counter', count + 1);

// Get scoped state
const userPrefs = context.getState('user', 'preferences');
```

### Variable Management

```typescript
// Set a local variable (available in subsequent actions)
context.setVariable('result', value);

// Get a variable
const result = context.getVariable('result');
```

### Logging

```typescript
context.log.debug('Debug message');
context.log.info('Info message');
context.log.warn('Warning message');
context.log.error('Error message');
```

## Error Handling

### Throwing Errors

```typescript
import { ActionError } from '@furlow/core';

async execute(config, context) {
  if (!config.required_field) {
    throw new ActionError('MISSING_FIELD', 'required_field is required');
  }

  try {
    // ... action logic
  } catch (error) {
    throw new ActionError('API_ERROR', 'Failed to call external API', error);
  }
}
```

### Error Codes

Use consistent error codes:

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid configuration |
| `PERMISSION_ERROR` | Missing permissions |
| `NOT_FOUND` | Resource not found |
| `API_ERROR` | External API failure |
| `RATE_LIMITED` | Rate limit exceeded |

## Best Practices

### 1. Validate Input

```typescript
async execute(config, context) {
  const validated = translateSchema.parse(config);
  // Use validated config
}
```

### 2. Handle Rate Limits

```typescript
import { RateLimiter } from '@furlow/core';

const limiter = new RateLimiter({ requests: 10, per: '1m' });

async execute(config, context) {
  await limiter.acquire();
  // ... make API call
}
```

### 3. Cache Results

```typescript
import { Cache } from '@furlow/core';

const cache = new Cache({ ttl: '5m' });

async execute(config, context) {
  const cacheKey = `translate:${config.text}:${config.to}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const result = await translate(config);
  cache.set(cacheKey, result);
  return result;
}
```

### 4. Support Expressions

Always resolve expressions in config values:

```typescript
const text = await context.resolveExpression(config.text);
// NOT: const text = config.text;
```

### 5. Document Your Action

Add JSDoc comments:

```typescript
/**
 * Translates text between languages using an external API.
 *
 * @example
 * - translate:
 *     text: "${message.content}"
 *     to: "es"
 *     as: translated
 *
 * @param config.text - Text to translate (supports expressions)
 * @param config.from - Source language (default: auto-detect)
 * @param config.to - Target language code
 * @param config.as - Variable name to store result
 */
export const translateAction: ActionHandler<TranslateConfig> = {
  // ...
};
```

## Testing Custom Actions

```typescript
import { createTestContext } from '@furlow/testing';
import { translateAction } from './translate';

describe('translateAction', () => {
  it('translates text', async () => {
    const context = createTestContext({
      guild: { id: '123' },
      user: { id: '456' },
    });

    const result = await translateAction.execute(
      { text: 'Hello', to: 'es' },
      context
    );

    expect(result).toBe('Hola');
  });
});
```

## Next Steps

- [Custom Expressions](custom-expressions.md) - Add custom expression functions
- [Performance Guide](performance.md) - Optimize your actions
- [Actions Reference](../reference/actions/_index.md) - Built-in actions
