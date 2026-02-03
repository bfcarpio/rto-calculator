import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		include: ["**/*.{test,spec}.{js,ts}"],
		exclude: ["node_modules", "dist", ".astro", ".opencode"],
		setupFiles: ["./src/utils/astro/__tests__/test.setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				".astro/",
				"**/*.test.{js,ts}",
				"**/*.spec.{js,ts}",
				"**/*.d.ts",
				"vitest.config.ts",
			],
		},
	},
});
