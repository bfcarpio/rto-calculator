import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: "src/index.ts",
			name: "rto-calendar",
			fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
			formats: ["es", "cjs"],
		},
		rollupOptions: {
			external: ["nanostores", "date-fns"],
		},
	},
});
