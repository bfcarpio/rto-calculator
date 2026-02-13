import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./__tests__/setup.ts"],
		exclude: ["**/e2e/**", "**/node_modules/**", "**/dist/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["node_modules/", "__tests__/", "**/*.test.ts", "**/*.spec.ts"],
		},
	},
});
