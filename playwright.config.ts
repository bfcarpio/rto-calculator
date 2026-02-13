/**
 * Playwright Configuration for RTO Calculator E2E Tests
 *
 * Configures Playwright for end-to-end testing with multi-viewport support,
 * automatic web server startup, and comprehensive failure reporting.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
import { defineConfig, devices } from "@playwright/test";

// Base URL for the application (hostname only, path is handled in tests)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:4321";

// Timeout configurations
const TEST_TIMEOUT = 30000;
const ACTION_TIMEOUT = 5000;
const NAVIGATION_TIMEOUT = 10000;

/**
 * Playwright configuration object
 *
 * Features:
 * - Test directory: './e2e'
 * - Multi-viewport projects (mobile & desktop)
 * - Web server auto-start
 * - Screenshot on failure, trace on first retry
 * - Parallel execution for speed
 */
export default defineConfig({
	// Test files location
	testDir: "./e2e",

	// Output directory for test artifacts (screenshots, traces, videos)
	outputDir: "./test-results",

	// Run tests in files in parallel
	fullyParallel: true,

	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 1,

	// Reporter to use
	reporter: [
		["html", { open: process.env.CI ? "never" : "on-failure" }],
		["list"],
		process.env.CI ? ["github"] : ["null"],
	],

	// Global timeout per test
	timeout: TEST_TIMEOUT,

	// Shared settings for all projects
	use: {
		// Base URL to use in actions like `await page.goto('/')`
		baseURL: BASE_URL,

		// Collect trace when retrying the failed test
		trace: "on-first-retry",

		// Take screenshot on failure
		screenshot: "only-on-failure",

		// Record video on first retry
		video: "on-first-retry",

		// Action timeout
		actionTimeout: ACTION_TIMEOUT,

		// Navigation timeout
		navigationTimeout: NAVIGATION_TIMEOUT,

		// Viewport defaults (overridden by project-specific settings)
		viewport: { width: 1920, height: 1080 },
	},

	// Configure projects for major browsers and viewports
	projects: [
		{
			name: "firefox-desktop",
			use: {
				...devices["Desktop Firefox"],
				viewport: { width: 1920, height: 1080 },
			},
		},
		{
			name: "chromium-desktop",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1920, height: 1080 },
			},
		},
		{
			name: "chromium-mobile",
			use: {
				...devices["iPhone 12"],
				viewport: { width: 390, height: 844 },
			},
		},
		{
			name: "webkit-desktop",
			use: {
				...devices["Desktop Safari"],
				viewport: { width: 1920, height: 1080 },
			},
		},
		{
			name: "tablet",
			use: {
				...devices["iPad (gen 7)"],
				viewport: { width: 768, height: 1024 },
			},
		},
	],

	// Web server is managed via npm scripts for better control
	// Use `npm run test:e2e` which starts the server before running tests
	// Or manually start with `npm run test:e2e:server`
	//
	// WebServer auto-start is disabled by default - prefer npm scripts
	// Uncomment below to enable auto-start as a fallback:
	// webServer: {
	// 	command: "npm run preview",
	// 	url: BASE_URL,
	// 	reuseExistingServer: true,
	// 	timeout: 120000,
	// },

	// Global setup and teardown (optional)
	// globalSetup: require.resolve('./e2e/global-setup.ts'),
	// globalTeardown: require.resolve('./e2e/global-teardown.ts'),
});
