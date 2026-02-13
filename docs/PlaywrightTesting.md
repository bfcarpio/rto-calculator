# Playwright E2E Testing Guide

## Overview

Playwright powers the end-to-end (E2E) testing suite for the RTO Calculator. These tests simulate real user interactions across multiple browsers and viewports, ensuring the calendar, validation logic, and UI work correctly from a user's perspective.

**What E2E Tests Cover:**

- **Page Load & Navigation** - App renders, routing works, titles are correct
- **Calendar Interactions** - Day selection, drag selection, pattern application
- **Validation Flows** - Compliance checking, status updates, error states
- **Responsive Behavior** - Mobile, tablet, and desktop layouts
- **Edge Cases** - Keyboard navigation, accessibility, error handling

**Test Architecture:**

```
e2e/
├── helpers/
│   ├── common.ts              # navigateToApp, waitForAppLoad
│   ├── datepainter.ts         # clickDate, getDateCells, navigateToMonth
│   ├── settingsModal.ts       # openSettings, setTargetDays
│   ├── statusLegend.ts        # selectMode, expectModeActive, getModeCounts
│   └── theme.ts               # openSettings, closeSettings, cycleTheme
├── test-helpers.ts            # Legacy shared utilities (waitForCalendarReady, etc.)
├── navigation.spec.ts         # Page load, routing, page structure
├── date-marking.spec.ts       # Day marking, palette switching, drag
├── validation-flows.spec.ts   # Compliance checking, target days
├── verify-ui.spec.ts          # UI styling and element verification
├── theme-system.spec.ts       # Settings modal, theme cycling
├── responsive-navigation.spec.ts # Mobile/tablet/desktop layouts
├── mobile-edge-cases.spec.ts  # Mobile viewport interactions
└── desktop-edge-cases.spec.ts # Rapid clicks, window resizing
```

---

## Quick Start

Run the complete E2E test suite:

```bash
npx playwright test
```

Playwright's `webServer` config handles the server automatically:
1. If a dev server is already running on port 4321, it reuses it (`reuseExistingServer: true`)
2. Otherwise, it runs `npm run build && npm run preview` to start a preview server
3. Waits for the server to respond, then runs all tests
4. Shuts down the server when tests complete

**Preferred flow (fastest, most reliable):**
```bash
# No manual server needed — Playwright handles everything
npx playwright test
```

**With a manual dev server (useful during development):**
```bash
# Terminal 1: start dev server
npm run dev

# Terminal 2: run tests (auto-detects running server)
npx playwright test
```

The preview server is preferred for test runs because it serves pre-built static files — no on-demand compilation means sub-second page loads and zero cold-start flakiness.

**First Run:**
- Browser binaries must be installed (see below)
- Tests run headless by default
- Screenshots and traces captured on failure

---

## Prerequisites

### Browser Installation

Five browser/viewport projects are configured (firefox-desktop, chromium-desktop, chromium-mobile, webkit-desktop, tablet). Install all browsers:

```bash
npx playwright install
```

### Server Management

The `webServer` option in `playwright.config.ts` manages the server lifecycle:

- **`reuseExistingServer: true`** - If a server is already running on port 4321, Playwright uses it as-is (e.g. your `npm run dev` session)
- **Auto-Start** - If no server is detected, Playwright runs `npm run build && npm run preview` automatically
- **Auto-Cleanup** - The auto-started server stops when tests complete
- **Override URL** - Use `PLAYWRIGHT_BASE_URL` env var to point tests at a different server

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all E2E tests (Firefox desktop + server management) |
| `npm run test:e2e:ui` | Open Playwright UI mode for debugging |
| `npm run test:e2e:debug` | Run tests with Playwright debugger |
| `npm run test:e2e:raw` | Run tests without server management (server must be running) |
| `npm run test:e2e:server` | Start the preview server only |
| `npm run test:e2e:mobile` | Run tests on mobile viewport only |
| `npm run test:e2e:desktop` | Run tests on desktop viewport only |
| `npm run test:e2e:report` | Open the HTML test report |

### Command Details

**Standard Test Run:**
```bash
npm run test:e2e
```
- Starts server in background
- Runs Firefox desktop tests (default project)
- Stops server on completion

**Debug Mode:**
```bash
npm run test:e2e:debug
```
- Pauses on first line of each test
- Allows stepping through test execution
- Useful for understanding test flow

**UI Mode:**
```bash
npm run test:e2e:ui
```
- Opens interactive Playwright UI
- Shows live browser window
- Inspect DOM, network, console
- Time-travel debugging

**Raw Mode (Advanced):**
```bash
# First, start server manually:
npm run test:e2e:server

# Then in another terminal:
npm run test:e2e:raw
```
- Useful when debugging server issues
- Allows manual server control

---

## Test Structure

### Directory Layout

```
e2e/
├── *.spec.ts              # Test files (Playwright convention)
├── test-helpers.ts        # Shared helper functions
└── (future: fixtures/, global-setup.ts, etc.)
```

### Test File Conventions

**File Naming:**
- `*.spec.ts` - Test files using Playwright's test runner
- `test-helpers.ts` - Helper utilities (not a test file)

**Test Organization:**

```typescript
import { expect, test } from "@playwright/test";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.describe("Sub-feature", () => {
    test("should do something specific", async ({ page }) => {
      // Test implementation
    });
  });
});
```

### Existing Test Files

| File | Purpose | Browser scope |
|------|---------|---------------|
| `navigation.spec.ts` | Page load, URL routing, page structure | Firefox only |
| `responsive-navigation.spec.ts` | Mobile/tablet/desktop layouts, viewport changes | Firefox only |
| `desktop-edge-cases.spec.ts` | Rapid clicks, window resizing | Firefox only |
| `date-marking.spec.ts` | Day marking, palette switching, drag, keyboard shortcuts | Core (all desktop browsers) |
| `validation-flows.spec.ts` | Compliance checking, target days, holiday handling | Core (all desktop browsers) |
| `theme-system.spec.ts` | Settings modal, theme cycling, dark mode | Core (all desktop browsers) |
| `verify-ui.spec.ts` | UI styling, element verification | Core (all desktop browsers) |
| `mobile-edge-cases.spec.ts` | Mobile viewport interactions, orientation changes | Mobile + tablet only |

---

## Writing Tests

### Basic Test Structure

```typescript
import { expect, test } from "@playwright/test";

test("description of what test does", async ({ page }) => {
  // Navigate to page
  await page.goto("/rto-calculator/");

  // Wait for auto-compliance to compute
  await expect(page.locator(".status-details")).toBeVisible();
});
```

### Using Test Helpers

Import helpers from `test-helpers.ts`:

```typescript
import {
  applyWeekdayPattern,
  clearAllSelections,
  waitForCompliance,
  waitForCalendarReady,
} from "./test-helpers";

test("validation with compliant pattern", async ({ page }) => {
  await page.goto("/");
  await waitForCalendarReady(page);

  // Setup test data
  await applyWeekdayPattern(page, "tue-thu", 8); // 2 WFH days = compliant

  // Wait for auto-compliance to finish (1.5s debounce + computation)
  await waitForCompliance(page);

  // Verify results
  const isCompliant = await isValidationCompliant(page);
  expect(isCompliant).toBe(true);
});
```

### Common Helper Functions

| Helper | Purpose |
|--------|---------|
| `waitForCalendarReady(page)` | Wait for calendar to load |
| `applyWeekdayPattern(page, pattern, weeks)` | Apply MWF/Tue-Thu/all patterns |
| `clearAllSelections(page)` | Click "Clear All" button |
| `waitForCompliance(page)` | Wait for auto-compliance to finish computing |
| `setupValidationScenario(page, scenario)` | Predefined scenarios (compliant, violation, etc.) |
| `isValidationCompliant(page)` | Check if validation shows compliance |
| `getCalendarDayByDate(page, year, month, day)` | Get specific day cell |

### Test Scenarios

**Validation Scenarios:**
```typescript
// Available scenarios
await setupValidationScenario(page, "compliant");  // 60%+ office days
await setupValidationScenario(page, "violation");  // < 60% office days
await setupValidationScenario(page, "perfect");    // 100% office days
await setupValidationScenario(page, "empty");      // No selections
await setupValidationScenario(page, "borderline"); // Exactly at threshold
```

---

## Debugging

### UI Mode (Recommended)

The fastest way to debug:

```bash
npm run test:e2e:ui
```

**UI Mode Features:**
- **Live Browser** - See the page as tests run
- **DOM Inspector** - Click elements to generate selectors
- **Network Tab** - View API calls and responses
- **Console** - See JavaScript errors and logs
- **Time Travel** - Step through test actions

### Debug Mode

Step through tests line-by-line:

```bash
npm run test:e2e:debug
```

**Features:**
- Breaks on first line of each test
- Use browser DevTools to debug
- Continue execution with `playwright.resume()`

### Screenshots on Failure

Playwright automatically captures screenshots when tests fail:

```bash
# Screenshot location
test-results/
  └── [test-name]/
      └── test-failed-1.png
```

Open screenshots directly or view in HTML report:
```bash
npm run test:e2e:report
```

### Trace Viewer

Traces provide complete test execution context:

```bash
# Traces are captured on first retry
# View in UI mode or:
npx playwright show-trace test-results/[test-name]/trace.zip
```

**Trace Contains:**
- Screenshots before/after each action
- DOM snapshots
- Network activity
- Console logs
- JavaScript execution

### Common Debugging Techniques

**1. Slow Down Tests:**
```typescript
test.use({
  launchOptions: {
    slowMo: 1000, // 1 second between actions
  },
});
```

**2. Visual Debugging:**
```typescript
// Highlight elements
await page.locator("button").highlight();

// Pause execution
await page.pause();
```

**3. Console Logging:**
```typescript
// Listen to console
test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => console.log(msg.text()));
});
```

---

## Best Practices

### 1. Use data-testid Attributes

Always add `data-testid` attributes to interactive elements:

```html
<!-- Component template -->
<button data-testid="clear-all-button">Clear All</button>
<div data-testid="calendar-day" data-day="15">15</div>
```

**Why:**
- Resilient to styling changes
- Clear intent in tests
- No brittle CSS selectors

### 2. Prefer User-Facing Selectors

When `data-testid` isn't available, use user-facing attributes:

```typescript
// Good - user-facing text
await page.getByRole("button", { name: "Validate" }).click();
await page.getByLabel("Email address").fill("test@example.com");

// Avoid - implementation details
await page.locator(".btn-primary").click();
await page.locator("#input-123").fill("test");
```

### 3. Wait for Readiness, Never Sleep

See [TestingBestPractices.md](./TestingBestPractices.md#wait-strategy-never-sleep-always-assert) for the full rationale.

```typescript
// Good — wait for a specific element that proves JS has initialized
await page.waitForSelector(
  '[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
  { state: "visible" },
);

// Good — use the shared helper
await waitForCalendarReady(page);

// Bad — never use networkidle (unreliable with timers/WebSockets)
await page.waitForLoadState("networkidle");

// Bad — never use hardcoded sleeps for synchronization
await page.waitForTimeout(500);
```

### 4. Handle Flakiness with Auto-Retrying Assertions

```typescript
// Playwright assertions auto-retry until they pass or timeout
await expect(page.locator(".status")).toHaveText("Complete", {
  timeout: 10000,
});

// Use web-first assertions — they auto-retry
await expect(page.locator("button")).toBeEnabled();
await expect(mobileMenu).toBeHidden();
```

### 5. Isolate Tests

```typescript
test.describe("Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearAllSelections(page); // Reset state
  });

  test("test 1", async ({ page }) => {
    // Test with clean state
  });

  test("test 2", async ({ page }) => {
    // Test with clean state
  });
});
```

### 6. Use Helpers for Repetitive Actions

```typescript
// Instead of repeating in every test:
await page.waitForFunction(() => !document.querySelector(".status-details.computing"));
await page.waitForSelector(".status-details .box");

// Use a helper:
await waitForCompliance(page);
```

---

## Troubleshooting

### Server Connection Issues

**Problem:** `net::ERR_CONNECTION_REFUSED`

**Solution:**
```bash
# Check if server is running
curl http://localhost:4321

# Start server manually and keep it running
npm run test:e2e:server

# Run tests in another terminal
npm run test:e2e:raw
```

### Port Already in Use

**Problem:** `Port 4321 is already in use`

**Solution:**
```bash
# Find and kill process using port 4321
lsof -ti:4321 | xargs kill -9

# Or use a different port
PORT=3000 npm run test:e2e
```

### Tests Flaky in CI

**Problem:** Tests pass locally but fail in CI

**Solutions:**
1. Increase timeouts in CI:
```typescript
// playwright.config.ts
timeout: process.env.CI ? 60000 : 30000,
retries: process.env.CI ? 2 : 1,
```

2. Wait for hydration:
```typescript
await page.waitForSelector("[data-testid='calendar-day']", {
  state: "visible",
  timeout: 10000,
});
```

3. Disable animations in test environment:
```typescript
// Add to page before tests
await page.addStyleTag({
  content: `*, *::before, *::after {
    animation-duration: 0s !important;
    transition-duration: 0s !important;
  }`,
});
```

### Browser Not Found

**Problem:** `Executable doesn't exist at ... firefox`

**Solution:**
```bash
# Reinstall browsers
npx playwright install

# Or install specific browser
npx playwright install firefox
```

### Tests Timeout

**Problem:** Tests exceed timeout limit

**Solutions:**
1. Check for infinite loops in app code
2. Verify server is responding:
```bash
curl http://localhost:4321/rto-calculator/
```
3. Increase timeout temporarily:
```bash
PW_TEST_TIMEOUT=60000 npm run test:e2e
```

---

## Configuration

### playwright.config.ts

Key configuration options:

```typescript
export default defineConfig({
  // Test timeout (30s default)
  timeout: 30000,

  // Retry failed tests (2x in CI, 1x local)
  retries: process.env.CI ? 2 : 1,

  // Run tests in parallel
  fullyParallel: true,

  // Shared settings
  use: {
    baseURL: "http://localhost:4321/rto-calculator",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 10000,
  },

  // Auto-start preview server (reuses existing if running)
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4321/rto-calculator",
    reuseExistingServer: true,
    timeout: 120000,
  },

  // Browser projects (scoped — see TestingBestPractices.md)
  // Firefox runs all tests; others scoped to core/mobile tests
  projects: [
    { name: "firefox-desktop", use: { ...devices["Desktop Firefox"] } },
    { name: "chromium-desktop", testMatch: CORE_TEST_FILES, use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-mobile", testMatch: MOBILE_TEST_FILES, use: { ...devices["iPhone 12"] } },
    { name: "webkit-desktop", testMatch: CORE_TEST_FILES, use: { ...devices["Desktop Safari"] } },
    { name: "tablet", testMatch: MOBILE_TEST_FILES, use: { ...devices["iPad (gen 7)"] } },
  ],
});
```

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `PLAYWRIGHT_BASE_URL` | Override base URL | `http://localhost:3000` |
| `CI` | Enable CI mode (retries, reporters) | `true` |
| `PW_TEST_TIMEOUT` | Override test timeout | `60000` |

---

## Summary

**Quick Commands:**
```bash
npm run test:e2e          # Run all tests
npm run test:e2e:ui       # Debug with UI
npm run test:e2e:debug    # Step-through debugging
npm run test:e2e:report   # View results
```

**Key Principles:**
- Use `data-testid` for stable selectors
- Isolate tests with `beforeEach` cleanup
- Prefer auto-retrying assertions
- Use helpers for common operations
- Debug with UI mode first

**Next Steps:**
- Add tests for new features in appropriate `*.spec.ts` files
- Extend `test-helpers.ts` with reusable patterns
- Run full suite before committing changes
