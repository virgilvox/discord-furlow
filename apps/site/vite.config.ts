import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // With custom domain (furlow.dev), use root path
  // Falls back to /discord-furlow/ if CNAME is removed
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000, // Shiki grammars are large
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split shiki into its own chunk
          if (id.includes('shiki')) {
            return 'shiki';
          }
          // Split CodeMirror into its own chunk
          if (id.includes('@codemirror') || id.includes('@lezer')) {
            return 'codemirror';
          }
          // Split marked into its own chunk
          if (id.includes('marked')) {
            return 'marked';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
  },
}));
