// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  output: "static",

  site: "https://bfcarpio.github.io",
  base: "/rto-calculator",
  // Configure client-side scripts
  vite: {
    build: {
      target: "esnext",
    },
  },
});
