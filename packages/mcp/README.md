# @furlow/mcp

Model Context Protocol server that lets LLM clients author FURLOW Discord bot
specs without hallucinating action names, event names, or config shapes.

## Quick start

Add to your client's MCP config. For Claude Desktop, edit
`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "furlow": {
      "command": "npx",
      "args": ["-y", "@furlow/mcp"]
    }
  }
}
```

Restart the client. The model will now see five FURLOW tools.

## Tools

| Tool | Purpose |
|------|---------|
| `validate_spec` | Validate a YAML spec against the real FURLOW schema. Returns structured errors. |
| `list_actions` | The 85 canonical action names. |
| `list_events` | The canonical event names the runtime emits. |
| `list_builtins` | The 14 builtin modules and what they do. |
| `scaffold_bot` | Generate a minimal valid YAML spec, optionally with builtins. |

## Programmatic use

```ts
import { createServer, validateSpec, scaffoldBot } from '@furlow/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createServer();
await server.connect(new StdioServerTransport());
```

Or call the helpers directly:

```ts
import { validateSpec, scaffoldBot, FURLOW_ACTIONS } from '@furlow/mcp';

console.log(validateSpec(yamlBody));          // { valid, errors }
console.log(scaffoldBot({ name: 'My Bot' })); // yaml string
console.log(FURLOW_ACTIONS);                  // string[]
```

## License

MIT
