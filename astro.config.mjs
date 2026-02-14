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
		css: {
			preprocessorOptions: {
				scss: {
					// Suppress Bulma's internal deprecation warnings
					silenceDeprecations: ["if-function"],
				},
			},
		},
		plugins: [
			// Generate gzip versions
			viteCompression({
				algorithm: "gzip",
				ext: ".gz",
				threshold: 1024, // Only compress files > 1KB
				deleteOriginFile: false,
			}),
			// Generate brotli versions (better compression)
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
					manualChunks: {
						vendor: ["astro"],
					},
				},
			},
		},
	},
});
