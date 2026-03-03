// @ts-check
import { defineConfig } from "astro/config";
import viteCompression from "vite-plugin-compression";

// https://astro.build/config
export default defineConfig({
  output: "static",
  site: "https://bfcarpio.github.io",
  base: "/rto-calculator",
  build: {
    format: "directory",
  },
  compressHTML: true,
  scopedStyleStrategy: "where",
  vite: {
    define: {
      "import.meta.env.COMMIT_SHA": JSON.stringify(
        process.env.COMMIT_SHA || "development",
      ),
    },
    css: {
      preprocessorOptions: {
        scss: {
          // Suppress Bulma's internal deprecation warnings
          silenceDeprecations: ["if-function"],
        },
      },
    },
    plugins: [
      // @ts-ignore - viteCompression plugin type incompatibility
      viteCompression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 1024, // Only compress files > 1KB
        deleteOriginFile: false,
      }),
      // @ts-ignore - viteCompression plugin type incompatibility
      viteCompression({
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 1024,
        deleteOriginFile: false,
      }),
    ],
    build: {
      target: "esnext",
      minify: "esbuild",
      cssMinify: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("date-fns")) {
              return "date-fns";
            }
            if (id.includes("datepainter")) {
              return "datepainter";
            }
            if (id.includes("node_modules/zod")) {
              return "zod";
            }
            if (id.includes("node_modules/ts-ics") || id.includes("node_modules/@ts-ics")) {
              return "ts-ics";
            }
            if (id.includes("node_modules/nanostores")) {
              return "nanostores";
            }
            if (id.includes("node_modules")) {
              return "vendor";
            }
            return undefined;
          },
        },
      },
    },
  },
});
