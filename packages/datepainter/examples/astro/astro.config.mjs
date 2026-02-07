import { defineConfig } from 'astro/config';

export default defineConfig({
  // In development, use the local package
  // In production, this would use the published package
  vite: {
    resolve: {
      alias: {
        datepainter: '../../../src'
      }
    }
  }
});
