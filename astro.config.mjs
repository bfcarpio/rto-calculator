// @ts-check
import { defineConfig } from "astro/config";

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
