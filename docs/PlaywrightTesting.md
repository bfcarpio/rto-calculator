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
├── test-helpers.ts              # Shared testing utilities
├── hello-world.spec.ts          # Basic smoke test
├── navigation.spec.ts           # Page navigation
├── calendar-interactions.spec.ts # Calendar day selection
├── validation-flows.spec.ts     # Validation scenarios
├── responsive-navigation.spec.ts # Mobile/desktop nav
├── mobile-edge-cases.spec.ts    # Mobile-specific issues
└── desktop-edge-cases.spec.ts   # Desktop-specific issues
```

---

## Quick Start

Run the complete E2E test suite:

```bash
npm run test:e2e
```

This command:
1. Starts the preview server (`npm run preview`)
2. Waits for the server to be ready
3. Runs all Playwright tests
4. Generates HTML reports

**First Run:**
- Firefox browser binaries are already installed
- Tests run headless by default
- Screenshots and traces captured on failure

---

## Prerequisites

### Browser Installation (Already Done)

Firefox is configured as the default browser. Browsers were installed during initial setup:

```bash
# If you need to reinstall browsers:
npx playwright install firefox
```

### Server Management

The preview server runs on port `4321` by default. The test scripts handle server lifecycle automatically:

- **Port Check** - Script verifies if server is already running
- **Auto-Start** - Server starts if not already running
- **Auto-Cleanup** - Server stops after tests complete
- **Background Mode** - Server runs detached for CI environments

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

| File | Purpose | Coverage |
|------|---------|----------|
| `hello-world.spec.ts` | Smoke test | Page loads, title correct, heading visible |
| `navigation.spec.ts` | Navigation | URL routing, base path handling |
| `calendar-interactions.spec.ts` | Calendar UI | Day selection, patterns, clearing, drag |
| `validation-flows.spec.ts` | Validation | Compliant/violation scenarios, status checks |
| `responsive-navigation.spec.ts` | Responsive | Mobile menu, panel toggles |
| `mobile-edge-cases.spec.ts` | Mobile issues | Touch targets, viewport handling |
| `desktop-edge-cases.spec.ts` | Desktop issues | Large screens, keyboard nav |

---

## Writing Tests

### Basic Test Structure

```typescript
import { expect, test } from "@playwright/test";

test("description of what test does", async ({ page }) => {
  // Navigate to page
  await page.goto("/rto-calculator/");

  // Interact with elements
  const button = page.locator('[data-testid="validate-button"]');
  await button.click();

  // Assert expectations
  await expect(page.locator(".status-details")).toBeVisible();
});
```

### Using Test Helpers

Import helpers from `test-helpers.ts`:

```typescript
import {
  applyWeekdayPattern,
  clearAllSelections,
  runValidation,
  waitForCalendarReady,
} from "./test-helpers";

test("validation with compliant pattern", async ({ page }) => {
  await page.goto("/");
  await waitForCalendarReady(page);

  // Setup test data
  await applyWeekdayPattern(page, "tue-thu", 8); // 2 WFH days = compliant

  // Run validation
  await runValidation(page);

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
| `runValidation(page)` | Click validate button, wait for results |
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
<button data-testid="validate-button">Validate</button>
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

### 3. Wait for Network/Animations

```typescript
// Wait for specific element
await page.waitForSelector("[data-testid='results']", {
  timeout: 5000,
});

// Wait for network idle (after API calls)
await page.waitForLoadState("networkidle");

// Wait for custom event
await page.evaluate(() =>
  new Promise((resolve) =>
    document.addEventListener("calendar-ready", resolve, { once: true })
  )
);
```

### 4. Handle Flakiness

```typescript
// Retry assertions automatically
await expect(page.locator(".status")).toHaveText("Complete", {
  timeout: 10000,
});

// Use web-first assertions (auto-retrying)
await expect(page.locator("button")).toBeEnabled();

// Avoid fixed timeouts when possible
await page.waitForTimeout(100); // Last resort
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
const button = page.locator('[data-testid="validate-button"]');
await button.click();
await page.waitForSelector(".status-details");

// Use a helper:
await runValidation(page);
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

  // Reporter configuration
  reporter: [
    ["html", { open: "on-failure" }],
    ["list"],
  ],

  // Shared settings
  use: {
    // Base URL for tests
    baseURL: "http://localhost:4321",

    // Collect trace on failure
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Action timeout
    actionTimeout: 5000,
  },

  // Browser projects
  projects: [
    {
      name: "firefox-desktop",
      use: { ...devices["Desktop Firefox"] },
    },
    // ... other projects
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
