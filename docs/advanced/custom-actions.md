# Custom Actions, Functions, and Transforms

FURLOW loads user-supplied JavaScript plugins at startup. A plugin can
register new actions (the things that appear in `actions:` lists), new
expression functions (callable with `${myFn(x)}`), and new expression
transforms (usable with the pipe syntax `${x | myTransform}`).

Plugins run in-process with full Node.js access. Only load plugins you
trust. The framework does not sandbox them.

## Declaring Plugins

Two ways to declare plugins. They compose: spec-declared plugins load
first, then anything passed through the CLI flag.

### From the spec

```yaml
version: "0.1"

plugins:
  - ./plugins/ai-actions.mjs
  - ./plugins/shout-transform.mjs

commands:
  - name: ask
    description: Ask the AI
    options:
      - name: question
        type: string
        required: true
    actions:
      - ai_completion:
          prompt: "${options.question}"
          as: answer
      - reply:
          content: "${answer}"
```

Paths resolve relative to the spec file. `./plugins/ai-actions.mjs` in
`furlow.yaml` means the file at `{specDir}/plugins/ai-actions.mjs`.

### From the CLI

```bash
furlow start --plugin ./plugins/ai-actions.mjs --plugin ./plugins/shout.mjs
```

Useful for plugins that should only load in certain environments (for
example, a test-only plugin that stubs an external API).

## Plugin File Shapes

A plugin is a JavaScript ESM file (`.mjs` or `.js` with
`"type": "module"`). FURLOW accepts three export shapes; pick whichever
fits your style.

### 1. Default function

Simplest form. The function receives a `PluginContext` and registers its
handlers.

```js
// plugins/my-plugin.mjs
export default function (ctx) {
  ctx.registerAction({
    name: 'greet_user',
    async execute(config, context) {
      const { evaluator } = context._deps;
      const name = await evaluator.interpolate(config.name, context);
      return { success: true, data: `Hello, ${name}!` };
    },
  });
}
```

### 2. Default Plugin object

Use this when you want a named plugin with a version. The name shows up
in logs; the version is informational.

```js
// plugins/ai-plugin.mjs
export default {
  name: 'furlow-ai',
  version: '1.2.0',
  async register(ctx) {
    ctx.registerAction({ name: 'ai_completion', execute: runAi });
    ctx.registerAction({ name: 'ai_embedding',  execute: runEmbed });
  },
};
```

### 3. Named `plugin` export

Useful when a file exports helpers alongside the plugin definition.

```js
// plugins/stats-plugin.mjs
export const plugin = {
  name: 'stats',
  register(ctx) {
    ctx.registerTransform('format_stat', (value) => value.toFixed(2));
  },
};
```

`register` may be `async`. FURLOW awaits each plugin before loading the
next, so one plugin's setup can depend on environment variables, file
reads, or authenticated API warm-ups.

## The Plugin Context

```ts
interface PluginContext {
  registerAction(handler: ActionHandler): void;
  registerFunction(name: string, fn: (...args: unknown[]) => unknown): void;
  registerTransform(name: string, fn: (value: unknown, ...args: unknown[]) => unknown): void;
  log(message: string, data?: unknown): void;
  readonly env: NodeJS.ProcessEnv;
}
```

TypeScript users can import the types:

```ts
import type { PluginContext, Plugin } from '@furlow/core/plugins';
```

## Writing a Custom Action

Action handlers implement a single `execute(config, context)` method and
declare a unique `name`.

```js
// plugins/http-get.mjs
export default function (ctx) {
  ctx.registerAction({
    name: 'http_get',
    cost: 10, // weighted against the per-handler quota
    async execute(config, context) {
      const { evaluator } = context._deps;
      const url = await evaluator.interpolate(String(config.url), context);

      // Cooperate with the handler quota's abort signal.
      const res = await fetch(url, { signal: context.signal });
      if (!res.ok) {
        return { success: false, error: new Error(`HTTP ${res.status}`) };
      }
      const body = await res.json();

      // If the YAML specified `as: foo`, stash the result on the context
      // so downstream actions can read `${foo}`.
      if (config.as) {
        context[config.as] = body;
      }
      return { success: true, data: body };
    },
  });
}
```

YAML:

```yaml
plugins:
  - ./plugins/http-get.mjs

commands:
  - name: weather
    description: Get the current weather
    options:
      - name: city
        type: string
        required: true
    actions:
      - http_get:
          url: "https://api.example.com/weather?q=${options.city}"
          as: forecast
      - reply:
          content: "${forecast.temp}C in ${options.city}"
```

### Key patterns

| Concern | How |
|---------|-----|
| Read a config value with interpolation | `await context._deps.evaluator.interpolate(String(config.x), context)` |
| Read a config value as a raw expression | `await context._deps.evaluator.evaluate(String(config.x), context)` |
| Write a result back for later actions | `context[config.as] = value` when `config.as` is set |
| Honor the execution quota abort | pass `context.signal` to `fetch` / `AbortController`-aware APIs |
| Charge an API bucket for rate limiting | `context.quota?.chargeApi('my_bucket', 1)` |
| Return failure | `{ success: false, error: new Error('...') }` |
| Declare cost against the 100k credit cap | `cost: 5` (Discord writes) ... `cost: 50` (canvas) on the handler |

The per-handler execution quota is documented in `HANDOFF.md` under the
M1 changelog entry. Your custom action participates automatically: each
call charges `cost` credits, and each bucket charge counts against its
per-invocation cap.

## Writing a Custom Expression Function

Functions are plain JavaScript. They are callable with `${name(...)}`
anywhere an interpolation expression is allowed.

```js
// plugins/math-extras.mjs
export default function (ctx) {
  ctx.registerFunction('lerp', (a, b, t) => a + (b - a) * t);
  ctx.registerFunction('gcd', function gcd(a, b) {
    return b === 0 ? Math.abs(a) : gcd(b, a % b);
  });
}
```

YAML:

```yaml
plugins:
  - ./plugins/math-extras.mjs

commands:
  - name: blend
    description: Blend two values
    options:
      - name: ratio
        type: number
        required: true
    actions:
      - reply:
          content: "Result: ${lerp(0, 100, options.ratio)}"
```

Functions must be synchronous. Jexl awaits promises that get returned,
but consistency is simpler if you keep them synchronous and do async
work inside a dedicated action handler.

## Writing a Custom Expression Transform

Transforms use the pipe syntax and receive the piped value as the first
argument.

```js
// plugins/text-transforms.mjs
export default function (ctx) {
  ctx.registerTransform('redact', (value, mask = '*') => {
    if (typeof value !== 'string') return value;
    return value.length <= 2 ? value : value[0] + mask.repeat(value.length - 2) + value.at(-1);
  });
  ctx.registerTransform('bracket', (value, open = '[', close = ']') => `${open}${value}${close}`);
}
```

YAML:

```yaml
commands:
  - name: showtoken
    description: Show a redacted token
    actions:
      - reply:
          content: "Token: ${env.API_TOKEN | redact}"
```

## Name Collisions

Registering a name that already exists (including one of the built-in
actions, functions, or transforms) prints a warning and overwrites.
That is allowed on purpose. If you need to patch the behaviour of
`send_message` for a test harness, overwrite it; the core handler is
the final default but not the final word.

## Errors

If a plugin file cannot be resolved, fails to import, exports nothing
recognisable, or throws during `register`, the CLI prints:

```
  Plugin loading failed
  Failed to load plugin "./plugins/my-plugin.mjs": <reason>
```

and exits before starting Discord. This is intentional. A missing
custom action should fail fast, not deadlock a bot that then can't
execute its own commands.

## TypeScript Plugins

The loader accepts `.mjs` and `.js` with `"type": "module"`. If you
prefer TypeScript, compile your plugins first and point FURLOW at the
output:

```bash
# author in TypeScript
plugins/
  src/
    ai.ts
  dist/
    ai.mjs        # <-- point FURLOW at this
```

```yaml
plugins:
  - ./plugins/dist/ai.mjs
```

Any bundler (`tsup`, `esbuild`, `swc`) works. Keep the ESM module format.

## Testing a Plugin

Test helpers from `@furlow/testing` work with custom actions the same
way they work with built-ins. You register your plugin's actions on the
E2E runtime's registry before running a spec, exactly as the CLI does at
startup.

```ts
import { createActionRegistry, createEvaluator, loadPlugin } from '@furlow/core';

const registry = createActionRegistry();
const evaluator = createEvaluator();
await loadPlugin('./plugins/my-plugin.mjs', registry, evaluator, { baseDir: __dirname });

expect(registry.has('my_custom_action')).toBe(true);
```

## What Plugins Cannot Do

- Hook arbitrary Discord.js events that FURLOW does not forward. Use
  `emit` inside an existing event handler if you need to chain custom
  events; the router will dispatch any name.
- Replace the core evaluator or executor. You can overwrite individual
  functions and actions but not the runtime plumbing.
- Change the spec after load. Plugins only register handlers; they do
  not mutate commands, events, or state definitions.
