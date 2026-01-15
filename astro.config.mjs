// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  output: "static",
  // Configure client-side scripts
  vite: {
    build: {
      target: "esnext",
    },
  },
});
