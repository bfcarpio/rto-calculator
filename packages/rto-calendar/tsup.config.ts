import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	external: ["nanostores", "date-fns", "astro"],
	sourcemap: true,
	minify: process.env.NODE_ENV === "production",
	splitting: false,
	treeshake: true,
});
