// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  output: "static",
  site: {
    base: "https://bfcarpio.github.io/rto-calculator/",
    trailingSlash: false,
  },
  // Configure client-side scripts
  vite: {
    build: {
      target: "esnext",
    },
  },
});
