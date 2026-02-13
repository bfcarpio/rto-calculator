/**
 * Playwright Configuration for RTO Calculator E2E Tests
 *
 * Configures Playwright for end-to-end testing with multi-viewport support,
 * automatic web server startup, and comprehensive failure reporting.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
import { defineConfig, devices } from "@playwright/test";

// Base URL for the application (includes subdirectory path for DRY test URLs)
const BASE_URL =
	process.env.PLAYWRIGHT_BASE_URL || "http://localhost:4321/rto-calculator";

// Timeout configurations
const TEST_TIMEOUT = 30000;
const ACTION_TIMEOUT = 10000;
const NAVIGATION_TIMEOUT = 10000;

// Browser project scoping: only core behavioral tests get cross-browser coverage
const CORE_TEST_FILES = [
	"date-marking.spec.ts",
	"validation-flows.spec.ts",
	"theme-system.spec.ts",
	"verify-ui.spec.ts",
];
const MOBILE_TEST_FILES = ["mobile-edge-cases.spec.ts"];

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
	// Firefox is primary (runs all tests); others scoped to core/mobile tests
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
			testMatch: CORE_TEST_FILES,
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1920, height: 1080 },
			},
		},
		{
			name: "chromium-mobile",
			testMatch: MOBILE_TEST_FILES,
			use: {
				...devices["iPhone 12"],
				viewport: { width: 390, height: 844 },
			},
		},
		{
			name: "webkit-desktop",
			testMatch: CORE_TEST_FILES,
			use: {
				...devices["Desktop Safari"],
				viewport: { width: 1920, height: 1080 },
			},
		},
		{
			name: "tablet",
			testMatch: MOBILE_TEST_FILES,
			use: {
				...devices["iPad (gen 7)"],
				viewport: { width: 768, height: 1024 },
			},
		},
	],

	// Auto-start preview server if no server is already running.
	// Uses reuseExistingServer so a manual `npm run dev` is used when available.
	webServer: {
		command: "npm run build && npm run preview",
		url: "http://localhost:4321/rto-calculator",
		reuseExistingServer: true,
		timeout: 120000,
	},
});
