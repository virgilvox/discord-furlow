#!/usr/bin/env node
/**
 * CLI entrypoint for @furlow/mcp. Runs the MCP server over stdio so LLM
 * clients (Claude Desktop, Cursor, etc.) can invoke it as a subprocess.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './index.js';

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[furlow-mcp] fatal:', err);
  process.exit(1);
});
