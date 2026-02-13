# Testing Best Practices

This guide covers hard-won patterns for writing reliable, maintainable tests in the RTO Calculator. It applies to both **unit tests** (Vitest) and **E2E tests** (Playwright).

For Playwright-specific commands, debugging, and troubleshooting, see [PlaywrightTesting.md](./PlaywrightTesting.md).

---

## Unit Tests (Vitest)

### Co-locate tests with source

Tests live in `__tests__/` directories next to the code they test:

```
src/lib/validation/
├── StrictDayCountValidator.ts
├── AverageWindowValidator.ts
└── __tests__/
    └── RollingPeriodValidation.test.ts
```

### Use Arrange/Act/Assert

Structure every test body into three clear phases:

```typescript
it("should return compliant for 3+ office days", () => {
  // Arrange
  const validator = new StrictDayCountValidator();
  const context = { selectedDays: threeDayWeek, config: DEFAULT_POLICY };

  // Act
  const result = validator.validate(context);

  // Assert
  expect(result.isValid).toBe(true);
});
```

### Write descriptive test names

Test names should read as sentences that describe the expected behavior:

```typescript
// Good — describes the behavior and condition
it("should return violation when office days fall below threshold", ...);
it("should handle empty selections as 100% compliant", ...);

// Bad — vague or implementation-focused
it("works correctly", ...);
it("test validate method", ...);
```

### Test edge cases and boundaries

Always cover: empty inputs, boundary values, null/undefined, and error paths.

```typescript
describe("AverageWindowValidator", () => {
  it("should handle empty selections", ...);
  it("should handle exactly-at-threshold (60%)", ...);
  it("should handle zero target days", ...);
  it("should throw for invalid config", ...);
});
```

### Mock external dependencies, not internal logic

```typescript
// Good — mock the API, test the logic
const mockApi = vi.fn().mockResolvedValue(mockHolidays);

// Bad — mock internal functions and test nothing
vi.spyOn(validator, "_groupDaysByWeek").mockReturnValue(fakeGroups);
```

---

## E2E Tests (Playwright)

### Wait Strategy: Never Sleep, Always Assert

This is the single most impactful rule for E2E test reliability and speed.

**Never use `waitForTimeout()`** for synchronization. Hardcoded sleeps are the #1 cause of both flakiness (too short) and slowness (too long):

```typescript
// Bad — arbitrary sleep
await page.setViewportSize({ width: 375, height: 667 });
await page.waitForTimeout(300);
await expect(mobileMenu).toBeVisible();

// Good — Playwright auto-retries until the assertion passes
await page.setViewportSize({ width: 375, height: 667 });
await expect(mobileMenu).toBeVisible();
```

**Never use `networkidle`** to wait for page readiness. It's unreliable (timers, analytics, WebSockets keep it from settling) and slower than a targeted selector:

```typescript
// Bad — waits for ALL network activity to stop
await page.waitForLoadState("networkidle");

// Good — waits for a specific element that proves JS has initialized
await page.waitForSelector(
  '[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
  { state: "visible" },
);
```

**Use `waitForCalendarReady()`** from `test-helpers.ts` in most specs. It encapsulates the enabled-cell selector pattern.

### Selectors

Use `data-testid` attributes for stable, intent-revealing selectors:

```typescript
// Good — resilient to styling changes
page.locator('[data-testid="clear-all-button"]');
page.locator('[data-testid="calendar-day"]');

// Acceptable — user-facing attributes when no testid exists
page.getByRole("button", { name: "Clear All" });
page.getByLabel("Target days");

// Bad — brittle implementation details
page.locator(".btn-primary.action-clear");
page.locator("#input-123");
```

**Key selectors for this project:**

| Element | Selector |
|---------|----------|
| Enabled day cell | `[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)` |
| Day with state | `.datepainter-day--oof`, `.datepainter-day--holiday`, `.datepainter-day--sick` |
| Count badges | `#count-oof`, `#count-holiday`, `#count-sick` (scope to `#status-legend`) |
| Palette mode | `[data-testid="mode-oof"]`, `mode-holiday`, `mode-sick` |
| Clear all button | `[data-testid="clear-all-button"]` |
| Mobile menu | `[data-testid="mobile-menu-button"]` |
| Settings button | `[data-testid="settings-button"]` |

### Helper Modules

There are two helper systems. **Prefer `e2e/helpers/`** for new code:

| Module | Domain | Key exports |
|--------|--------|-------------|
| `e2e/helpers/common.ts` | Navigation | `navigateToApp`, `waitForAppLoad` |
| `e2e/helpers/datepainter.ts` | Calendar | `clickDate`, `expectDateHasState`, `getDateCells`, `navigateToMonth` |
| `e2e/helpers/statusLegend.ts` | Palette | `selectMode`, `expectModeActive`, `getModeCounts` |
| `e2e/helpers/settingsModal.ts` | Settings | `openSettings`, `setTargetDays`, `selectValidationMode` |
| `e2e/helpers/theme.ts` | Theme | `openSettings`, `cycleTheme`, `expectTheme` |
| `e2e/test-helpers.ts` | Legacy (mixed) | `waitForCalendarReady`, `applyWeekdayPattern`, `setupValidationScenario` |

When adding a helper, put it in the domain-specific module. Only use `test-helpers.ts` for cross-cutting utilities.

### Browser Project Scoping

Not every test needs to run on every browser. The `playwright.config.ts` scopes projects to reduce total runs while maintaining coverage where it matters:

| Project | Runs | Scope |
|---------|------|-------|
| `firefox-desktop` | All tests | Primary browser — catches regressions |
| `chromium-desktop` | Core tests only | Cross-browser validation for behavioral tests |
| `webkit-desktop` | Core tests only | Cross-browser validation for behavioral tests |
| `chromium-mobile` | Mobile tests only | Mobile viewport interactions |
| `tablet` | Mobile tests only | Tablet viewport interactions |

**Core test files** (cross-browser): `date-marking`, `validation-flows`, `theme-system`, `verify-ui`
**Mobile test files**: `mobile-edge-cases`
**Firefox-only**: `navigation`, `responsive-navigation`, `desktop-edge-cases`

When adding a new spec file, decide its scope:
- **Core behavioral flow?** Add to `CORE_TEST_FILES` in `playwright.config.ts`.
- **Mobile/tablet specific?** Add to `MOBILE_TEST_FILES`.
- **Layout, navigation, or edge case?** Firefox-only (no entry needed — it's the default).

### Avoiding Duplicate Tests

Before writing a new test, check if the behavior is already covered:

```bash
# Search existing tests for a keyword
npx playwright test --list --grep "mobile menu"
```

**Rules of thumb:**
- Each behavior should be asserted in exactly one spec file.
- Smoke tests (page loads, body visible) are low value — only test once in `navigation.spec.ts`.
- If a test's only assertion is `toBeVisible()` on `body`, delete it.
- Responsive layout tests belong in `responsive-navigation.spec.ts`, not duplicated in `navigation.spec.ts`.

### Test Isolation

Every test starts from a clean state. Use `beforeEach` to navigate and wait:

```typescript
test.describe("Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/rto-calculator/");
    await waitForCalendarReady(page);
  });

  test("scenario A", async ({ page }) => {
    // Starts clean — no state from other tests
  });
});
```

Never depend on test execution order. If a test needs specific state, set it up in the test body or `beforeEach`.

---

## Running Tests

### Unit tests

```bash
npm test                          # Watch mode (development)
npm run test:run                  # Single run (CI)
npm test -- path/to/file.test.ts  # Single file
```

### E2E tests

```bash
# Full suite — Playwright auto-starts the preview server
npx playwright test

# Useful options
npx playwright test --workers=2                       # Limit parallelism
npx playwright test --project=firefox-desktop         # Single browser
npx playwright test e2e/date-marking.spec.ts          # Single file
npx playwright test --grep "should mark single date"  # By test name

# Debugging
npm run test:e2e:ui       # Interactive UI mode (best for debugging)
npm run test:e2e:debug    # Step-through debugger
npm run test:e2e:report   # View HTML report from last run
```

### Full verification (before committing)

```bash
npm run check        # Lint + type check
npm run test:run     # Unit tests
npx playwright test  # E2E tests (all browsers)
```

---

## Anti-Patterns to Avoid

| Anti-pattern | Why it's bad | Do this instead |
|---|---|---|
| `waitForTimeout(N)` | Flaky (too short) or slow (too long) | Use auto-retrying assertions |
| `waitForLoadState("networkidle")` | Never settles with timers/WebSockets | Wait for a specific visible element |
| `body.toBeVisible()` as sole assertion | Tests nothing meaningful | Assert specific UI state |
| Same test in multiple spec files | Wastes CI time, maintains two copies | Test each behavior once |
| `page.locator(".css-class")` | Breaks when styles change | Use `data-testid` attributes |
| `expect(true).toBe(true)` | Trivially passes, tests nothing | Assert meaningful outcomes |
| Sleeps between viewport changes | Playwright assertions auto-retry | Remove the sleep, keep the assertion |

---

*Last updated: February 2026*
