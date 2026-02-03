import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: [
    '@furlow/core',
    '@furlow/discord',
    '@furlow/schema',
    '@furlow/storage',
    '@furlow/pipes',
    '@furlow/builtins',
  ],
});
