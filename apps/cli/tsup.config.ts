import { defineConfig } from 'tsup';
import { builtinModules } from 'module';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  platform: 'node',
  target: 'node20',
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
  external: [
    // All Node.js built-in modules
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
    // Native modules that can't be bundled
    'better-sqlite3',
    'pg',
    'pg-native',
    '@discordjs/opus',
    'sodium-native',
    'libsodium-wrappers',
    'bufferutil',
    'utf-8-validate',
    'erlpack',
    'zlib-sync',
    'canvas',
    'sharp',
    'prism-media',
  ],
});
