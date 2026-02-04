# Custom Expressions

Learn how to add custom expression functions and transforms to FURLOW.

## Overview

FURLOW's expression language supports custom:

- **Functions**: `myFunc(arg1, arg2)`
- **Transforms**: `value | myTransform(arg)`
- **Operators**: Custom comparison operators

## Adding Custom Functions

### Basic Function

```typescript
import { Furlow } from '@furlow/core';

const furlow = new Furlow({ token: process.env.DISCORD_TOKEN });

// Add a simple function
furlow.addFunction('greet', (name: string) => {
  return `Hello, ${name}!`;
});

await furlow.start();
```

Usage in YAML:

```yaml
- reply:
    content: "${greet(user.username)}"
```

### Async Functions

```typescript
furlow.addFunction('fetchWeather', async (city: string) => {
  const response = await fetch(`https://api.weather.com/${city}`);
  const data = await response.json();
  return data.temperature;
});
```

Usage:

```yaml
- reply:
    content: "Current temperature: ${await fetchWeather('London')}°C"
```

### Functions with Context

```typescript
furlow.addFunction('getUserLevel', async (userId: string, context) => {
  const xp = await context.getState('member', userId, 'xp');
  return Math.floor(xp / 100);
});
```

## Adding Custom Transforms

Transforms use the pipe syntax: `value | transform(args)`

### Basic Transform

```typescript
furlow.addTransform('reverse', (value: string) => {
  return value.split('').reverse().join('');
});
```

Usage:

```yaml
- reply:
    content: "${message.content | reverse}"
```

### Transform with Arguments

```typescript
furlow.addTransform('truncate', (value: string, length: number, suffix = '...') => {
  if (value.length <= length) return value;
  return value.slice(0, length) + suffix;
});
```

Usage:

```yaml
- reply:
    content: "${description | truncate(100, '...')}"
```

### Chaining Transforms

```typescript
furlow.addTransform('censor', (value: string, words: string[]) => {
  let result = value;
  for (const word of words) {
    result = result.replace(new RegExp(word, 'gi'), '***');
  }
  return result;
});
```

Usage:

```yaml
- reply:
    content: "${message.content | lowercase | censor(['badword1', 'badword2'])}"
```

## Built-in Context Variables

Custom functions receive context with:

```typescript
interface ExpressionContext {
  // Discord objects
  guild: Guild;
  channel: Channel;
  user: User;
  member: GuildMember;
  message?: Message;
  interaction?: Interaction;

  // State access
  getState: (scope, key) => Promise<any>;
  setState: (scope, key, value) => Promise<void>;

  // Variables from previous actions
  variables: Record<string, any>;

  // Environment
  env: Record<string, string>;
}
```

## Full Example: Currency Formatter

```typescript
import { Furlow } from '@furlow/core';

const furlow = new Furlow({ token: process.env.DISCORD_TOKEN });

// Add currency function
furlow.addFunction('formatCurrency', (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
});

// Add currency transform
furlow.addTransform('currency', (value: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
});

// Add exchange rate function
furlow.addFunction('exchange', async (amount: number, from: string, to: string) => {
  const response = await fetch(
    `https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=${amount}`
  );
  const data = await response.json();
  return data.result;
});
```

Usage:

```yaml
commands:
  - name: price
    options:
      - name: amount
        type: number
        required: true
      - name: currency
        type: string
        choices:
          - { name: USD, value: USD }
          - { name: EUR, value: EUR }
          - { name: GBP, value: GBP }
    actions:
      - reply:
          content: |
            Price: ${formatCurrency(options.amount, options.currency)}
            In USD: ${options.amount | currency('USD')}
```

## Full Example: Time Utilities

```typescript
import { Furlow } from '@furlow/core';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(relativeTime);
dayjs.extend(timezone);

const furlow = new Furlow({ token: process.env.DISCORD_TOKEN });

// Time formatting
furlow.addFunction('formatTime', (date: Date | string, format = 'YYYY-MM-DD HH:mm') => {
  return dayjs(date).format(format);
});

// Relative time
furlow.addTransform('ago', (date: Date | string) => {
  return dayjs(date).fromNow();
});

// Timezone conversion
furlow.addFunction('toTimezone', (date: Date | string, tz: string) => {
  return dayjs(date).tz(tz).format('YYYY-MM-DD HH:mm z');
});

// Time until
furlow.addFunction('timeUntil', (date: Date | string) => {
  const diff = dayjs(date).diff(dayjs(), 'millisecond');
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${days}d ${hours}h ${minutes}m`;
});
```

Usage:

```yaml
commands:
  - name: event
    actions:
      - reply:
          embeds:
            - title: "Next Event"
              fields:
                - name: "Date"
                  value: "${formatTime(event.date, 'MMMM D, YYYY')}"
                - name: "Time Until"
                  value: "${timeUntil(event.date)}"
                - name: "Your Timezone"
                  value: "${toTimezone(event.date, member.timezone || 'UTC')}"
```

## Full Example: Text Processing

```typescript
const furlow = new Furlow({ token: process.env.DISCORD_TOKEN });

// Markdown escape
furlow.addTransform('escapeMarkdown', (text: string) => {
  return text.replace(/([*_`~\\])/g, '\\$1');
});

// Code block
furlow.addTransform('codeBlock', (text: string, lang = '') => {
  return `\`\`\`${lang}\n${text}\n\`\`\``;
});

// Inline code
furlow.addTransform('code', (text: string) => {
  return `\`${text}\``;
});

// Spoiler
furlow.addTransform('spoiler', (text: string) => {
  return `||${text}||`;
});

// Word count
furlow.addFunction('wordCount', (text: string) => {
  return text.split(/\s+/).filter(Boolean).length;
});

// Sentiment analysis (mock)
furlow.addFunction('sentiment', (text: string) => {
  const positive = ['good', 'great', 'awesome', 'love', 'happy'];
  const negative = ['bad', 'terrible', 'hate', 'sad', 'angry'];

  const words = text.toLowerCase().split(/\s+/);
  const posCount = words.filter((w) => positive.includes(w)).length;
  const negCount = words.filter((w) => negative.includes(w)).length;

  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
});
```

## Registering via Plugin

```typescript
import { FurlowPlugin } from '@furlow/core';

export const textPlugin: FurlowPlugin = {
  name: 'text-utils',
  version: '1.0.0',

  functions: {
    wordCount: (text: string) => text.split(/\s+/).filter(Boolean).length,
    charCount: (text: string) => text.length,
  },

  transforms: {
    escapeMarkdown: (text: string) => text.replace(/([*_`~\\])/g, '\\$1'),
    codeBlock: (text: string, lang = '') => `\`\`\`${lang}\n${text}\n\`\`\``,
  },
};

// Usage
furlow.use(textPlugin);
```

## Testing Custom Expressions

```typescript
import { createExpressionEngine } from '@furlow/core';

describe('custom expressions', () => {
  const engine = createExpressionEngine();

  engine.addFunction('double', (n: number) => n * 2);
  engine.addTransform('reverse', (s: string) => s.split('').reverse().join(''));

  it('evaluates custom function', async () => {
    const result = await engine.evaluate('double(5)');
    expect(result).toBe(10);
  });

  it('evaluates custom transform', async () => {
    const result = await engine.evaluate('"hello" | reverse');
    expect(result).toBe('olleh');
  });
});
```

## Best Practices

### 1. Handle Null/Undefined

```typescript
furlow.addTransform('safe', (value: unknown, fallback = '') => {
  return value ?? fallback;
});
```

### 2. Type Coercion

```typescript
furlow.addFunction('toNumber', (value: unknown) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
});
```

### 3. Error Messages

```typescript
furlow.addFunction('divide', (a: number, b: number) => {
  if (b === 0) {
    throw new Error('Cannot divide by zero');
  }
  return a / b;
});
```

### 4. Document Functions

```typescript
/**
 * Formats a number as currency.
 * @param amount - The amount to format
 * @param currency - ISO 4217 currency code (default: USD)
 * @returns Formatted currency string
 * @example ${formatCurrency(99.99, 'EUR')} => "€99.99"
 */
furlow.addFunction('formatCurrency', (amount: number, currency = 'USD') => {
  // ...
});
```

## Next Steps

- [Custom Actions](custom-actions.md) - Create custom action handlers
- [Expression Reference](../reference/expressions/_index.md) - Built-in functions
- [Performance Guide](performance.md) - Optimize expressions
