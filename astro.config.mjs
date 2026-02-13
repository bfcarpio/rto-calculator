// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // Configure client-side scripts
  vite: {
    build: {
      target: "esnext",
    },
  },
});
