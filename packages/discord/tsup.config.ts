import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/client/index.ts',
    'src/gateway/index.ts',
    'src/interactions/index.ts',
    'src/voice/index.ts',
    'src/video/index.ts',
    'src/events/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ['@furlow/core', '@furlow/schema', 'discord.js', '@discordjs/voice', '@discordjs/opus'],
});
