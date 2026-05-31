import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [solid()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@codemirror') || id.includes('node_modules/codemirror') || id.includes('node_modules/@lezer')) {
            return 'codemirror';
          }
          return undefined;
        }
      }
    }
  },
  test: {
    include: ['src/**/*.test.ts']
  }
});
