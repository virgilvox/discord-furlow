import { defineConfig } from 'vitest/config';

// Separate test config so vitest scans the server tree too. The
// `vite.config.ts` pins root to `src/` for the client build, which hides
// any tests under `server/` from the default vitest include globs.
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)', 'server/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
});
