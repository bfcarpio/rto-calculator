import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/vanilla/index.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	external: ["nanostores", "date-fns", "astro"],
	sourcemap: true,
	minify: process.env.NODE_ENV === "production",
	splitting: false,
	treeshake: true,
	// Copy styles directory to dist
	banner: {
		js: '// CSS styles are available in the styles/ directory',
	},
});
