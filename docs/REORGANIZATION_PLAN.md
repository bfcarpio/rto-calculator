# Reorganization Plan: Commits + Test Quality

> Generated: 2026-06-23
> Based on analysis of 44 unpushed commits and 40 test files (ref: independent-ivory-capybara)

---

## Part A — Commit Reorganization (24 refactoring commits → 7 focused commits)

**Estimated time:** 15-30 minutes

### Current State: 44 Unpushed Commits (Interleaved)

**Window feature work (20 commits)** — Keep as-is. Already well-focused. These are the commits from `5c2eee23` through `cfacf1f3`.

**Refactoring phases (24 commits)** — Squash into 7 focused commits:

| New Commit                                                             | Current Commits (squash together)                                                        | Focus                                                                                                                     |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **1. `refactor: Phase 1-2 - Critical cleanup and type consolidation`** | `cd4f5936` + `da514faf`                                                                  | Phase 1: Delete dead code, fix timezone bug, remove debug logging; Phase 2: Consolidate type systems                      |
| **2. `refactor: extract duplicated code into shared utilities`**       | `b04cefbb` + `34ab42bc` + `55e00256` + `ec666fd7` + `4f675f13` + `362fb8dc`              | buildComplianceMessage, renderStatsInto, announceToScreenReader, dateUtils, deepCopyMap, toggleBooleanSetting             |
| **3. `refactor: decompose god modules into focused files`**            | `a1eb9b02` + `5d8aaa75` + `639938ff` + `00533732` + `fa7e4e62` + `1a57352c`              | eventHandlers→3 files, settings-modal→3 files, HolidayManager→3 files, auto-compliance→2 files, calendarFunctions→4 files |
| **4. `refactor: improve type safety and code quality`**                | `50c9c66b` + `998f0d03` + `66324c29` + `39164f0d` + `e05dcc69` + `15ebf292` + `9f9739df` | Replace console.log, fix `as any`, add type guards, remove stubs, private constructors, storage utility                   |
| **5. `refactor: fix test anti-patterns`**                              | `83b6a72c`                                                                               | Fix `toBeDefined()`, remove internal mocks, replace `waitForTimeout()`                                                    |
| **6. `refactor: add missing test coverage`**                           | `202d75b2`                                                                               | 74 new tests for themeManager, keyboard-shortcuts, drag-painting                                                          |
| **7. `refactor: fix test types and final verification`**               | `bf35d40d`                                                                               | Fix `any` in test mocks, remove `as any` in E2E                                                                           |

### Pre-Flight Checklist

Before any reorganization work begins, complete these safety steps:

```bash
# 1. Ensure working directory is clean
git status

# 2. Create a backup branch
git branch backup/pre-reorganization

# 3. Verify baseline is green (lint + unit tests)
npm run check
npm run test:run

# 4. Verify E2E baseline is green
npx playwright test  # May take 2-5 minutes. If time-constrained, skip and run only in Post-Reorganization Validation.

# 5. Verify commit cfacf1f3 exists
git cat-file -t cfacf1f3

# 6. Document current commit hash for rollback reference
git rev-parse HEAD > .reorganization-baseline.txt
```

**Estimated time:** 5 minutes

### Execution

- Use `git rebase -i 5c2eee23^` (parent of first window-feature commit)
- Todo list: 20 `pick` (window feature commits `5c2eee23` through `cfacf1f3`) + 1 `pick` + N `squash` for each group above

> **Note:** If merge conflicts occur during rebase, resolve them in the affected files, then run `git rebase --continue`. To abort the rebase and restore the original state, run `git rebase --abort`.

**Verification:** After the rebase completes, run:

```bash
npm run check
npm run test:run
```

---

## Part B — Test Quality Reorganization

> **Naming Convention Note:** The project uses camelCase for test files (e.g., `testHelpers.ts`). Any new shared helper file should follow this convention (e.g., `testHelpers.ts` rather than `test-helpers.ts`) to remain consistent.
>
> **Path Note:** All references to `validation.test.ts` in this section refer to the file at `src/utils/astro/__tests__/unit/validation.test.ts`.
>
> **Risk:** The codebase currently has zero `test.each` usage. Ensure the executor is familiar with Vitest's `test.each` syntax, or reference the [Vitest docs](https://vitest.dev/api/#test-each) before proceeding.

### B.1: Remove Duplicate Tests (4 files affected)

**Estimated time:** 10 minutes

| File                               | Duplicate                                                                   | Action                                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `validation.test.ts:205,218,231`   | 3x exact dup of line 192 "should exclude holidays from OOF dates"           | **Delete lines 205-242**, keep 192-204                                                                             |
| `validation.test.ts:481`           | Exact dup of line 476 "should create none selection"                        | **Delete line 481-484**, keep 476-480                                                                              |
| `validation.test.ts:727`           | Near-dup of line 708 "createWeeksWithPatterns helper"                       | **Delete 727-745**, keep 708-726                                                                                   |
| `date-parsing.test.ts:80-113`      | `buildWindowEnd`/`buildWindowRangeLabel` tests dup of `windowRange.test.ts` | **Delete lines 80-113** from date-parsing.test.ts                                                                  |
| `data-consistency.test.ts:296-309` | `snapToWeekStart` tests duplicate `validation.test.ts`                      | **Delete lines 296-309** from data-consistency.test.ts                                                             |
| `data-consistency.test.ts:311-331` | `fmtShort` tests (not present in `validation.test.ts`)                      | **Preserve lines 311-331** — keep in `data-consistency.test.ts` or move to new `date-utils.test.ts` as part of B.4 |
| `holiday-manager.test.ts:264-284`  | `null`/`""` company filtering near-dup (same expected results)              | **Merge into single test** with `test.each([null, ""])`                                                            |

**Net reduction: ~6 duplicate tests removed, ~30 lines saved**

> **Note:** After deleting lines 80-113 from `date-parsing.test.ts`, remove any now-unused imports (`buildWindowEnd`, `buildWindowRangeLabel`) from the import statements at the top of the file.

**Verification:** Run `npm run test:run` to confirm no regressions after deletions.

### B.2: Parameterize Individual Tests → test.each (8 conversions)

**Estimated time:** 20-30 minutes

| File                                               | Tests                               | Pattern                                                                   | Conversion                                      |
| -------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------- |
| `validation.test.ts` `roundToNearest20Percent`     | 11 individual `it("rounds X to Y")` | All `roundToNearest20Percent(X).toBe(Y)`                                  | **1 `test.each`** with 11 rows                  |
| `validation.test.ts` `Fixture-Based Scenarios`     | 7 identical-structure fixture tests | Load fixture → create calendarStart → validateTopKWeeks → assert 3 values | **1 `test.each`** with 7 rows                   |
| `validation.test.ts` `elementToDaySelection` nulls | 4 null-return tests                 | Missing attr → expect null                                                | **1 `test.each`** with 4 rows                   |
| `validation.test.ts` Pattern types                 | `forEach` over 6 patterns           | Already data-driven but uses `forEach`                                    | **Convert to `test.each`** for better reporting |
| `weekDot.test.ts` `buildDotClass`                  | 4 `isBest`/`isCompliant` combos     | All `buildDotClass(a,b).toBe(str)`                                        | **1 `test.each`** with 4 rows                   |
| `calendar-data-reader.test.ts` penalize            | 4 penalize setting combos           | setSettings → setupSingleWeek → readCalendarData → assert                 | **1 `test.each`** with 4 rows                   |
| `responsiveValidation.test.ts` device widths       | `forEach` over 5 widths             | Already data-driven but uses `forEach`                                    | **Convert to `test.each`** for better reporting |
| `status-details.test.ts` `getStatusColor`          | 6 grouped tests                     | All `getStatusColor(current, target).toBe(color)`                         | **1 `test.each`** with 6 rows                   |

**Net reduction: ~47 individual tests → 8 `test.each` blocks, ~200 lines saved**

**Verification:** Run `npm run test:run` to confirm all parameterized tests still pass.

### B.3: Extract Shared Test Helpers (3 files → 1 shared module)

**Estimated time:** 15-20 minutes

> **Note:** An existing `testHelpers.ts` already lives at `src/utils/astro/__tests__/testHelpers.ts` (343 lines, camelCase) and is used by 3 test files. The helpers listed below are duplicated elsewhere. **Recommended: Extend the existing `src/utils/astro/__tests__/testHelpers.ts`** with the new helpers (`mockCalendar`, `makeWeek`, `makeWeeks`, `makeSchedule`). Update imports in consuming test files. Consider migrating to a central location later if the helper set grows significantly.
>
> For either option, use the project's camelCase convention (`testHelpers.ts`).

The shared helpers to extract are:

| Helper                         | Duplicated In                                                                                   | Current Lines  |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | -------------- |
| `mockCalendar()`               | `calendar-data-reader.test.ts:70`, `json-io.test.ts:39`, `ics-io.test.ts:10`                    | ~30 lines each |
| `makeWeek(overrides?)`         | `sliding-window-validation.test.ts:29`, `all-windows.test.ts:26`, `data-consistency.test.ts:32` | ~15 lines each |
| `makeWeeks(count, overrides?)` | Same 3 files                                                                                    | ~20 lines each |
| `makeSchedule(config?)`        | Same 3 files                                                                                    | ~20 lines each |

**Net reduction: ~255 lines of duplication → ~85 lines in shared module, ~170 lines saved**

**Verification:** Run `npm run test:run` to confirm imports resolve correctly.

### B.4: Split `src/utils/astro/__tests__/unit/validation.test.ts` (1574 lines → 5 focused files)

**Estimated time:** 20-30 minutes

**Target Directory:** Create all new files in `src/utils/astro/__tests__/unit/` alongside the original `validation.test.ts`.

| New File                      | Source Lines | Concern                                                                                                                                                | Tests |
| ----------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| `date-utils.test.ts`          | 55-150       | `getStartOfWeek`, `snapToWeekStart`, `getFullWeekDates`                                                                                                | ~12   |
| `selection-filtering.test.ts` | 152-485      | `getOutOfOfficeDates`, holiday integration, `createDaySelection`                                                                                       | ~18   |
| `week-compliance.test.ts`     | 299-463      | `calculateWeekCompliance`, `getWeekCompliance`, `elementToDaySelection`, pattern builders                                                              | ~25   |
| `validation-topk.test.ts`     | 572-1281     | `validateTopKWeeks` tests (Pattern Builders, Custom Policy, Message Generation, Integration Tests, Sliding Window, Partial Weeks, Holiday Integration) | ~20   |
| `rounding.test.ts`            | 1283-1574    | `roundToNearest20Percent`, rounding behavior                                                                                                           | ~20   |

> **Note:** `validation.test.ts` (trimmed) should keep only `validateTopKWeeks` fixture tests and any remaining tests not covered by the split files.

**Net reduction: 1 file of 1574 lines → 5 files averaging ~200 lines each**

**Verification:** Run `npm run test:run` to confirm the split tests cover the same surface area.

### B.5: Audit Test-Local Code Tests (Medium Priority)

**Estimated time:** 10 minutes

| File                                          | Issue                                                              | Recommendation                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `desktopInteractions.test.ts` (994 lines)     | Tests 5 classes defined inline, not imported from source           | **Delete** — provides false confidence. These classes don't exist in production code. |
| `navigationHelpers.test.ts` (692 lines)       | Tests navigation helpers defined inline, not imported from source  | **Delete** — same issue as desktopInteractions                                        |
| `embeddedElementRefTests.test.ts` (647 lines) | Tests "architecture patterns" and includes flaky timing assertions | **Delete** — tests implementation details, not behavior                               |

> **Risk Mitigation:** Before deleting these files, verify no other test files import from them. Specifically, `embeddedElementRefTests.test.ts` imports from `./testHelpers` — ensure `testHelpers.ts` does not depend on any exports from `embeddedElementRefTests.test.ts`.

**Net reduction: ~2,333 lines of test code removed, 0 loss of real coverage**

**Verification:** Run `npm run test:run` to confirm no remaining tests depend on deleted files.

---

## Summary: Before vs After

| Metric                                         | Before              | After                    | Delta                     |
| ---------------------------------------------- | ------------------- | ------------------------ | ------------------------- |
| **Unpushed commits**                           | 44                  | 28                       | -16                       |
| **Test files**                                 | 40                  | 41                       | +1                        |
| **Duplicate tests**                            | 6+ exact duplicates | 0                        | -6                        |
| **Individual tests that could be `test.each`** | 47                  | 0 (converted)            | -47 tests → 8 `test.each` |
| **Shared test helpers**                        | 0 (3x duplication)  | 1 module                 | -170 lines                |
| **`validation.test.ts`**                       | 1 file, 1574 lines  | 5 files, ~200 lines each | Easier to navigate        |
| **Test-local code tests**                      | 3 files, 2333 lines | 0                        | False confidence removed  |

**Total estimated time:** ~2-3 hours

---

## Execution Order

Each step is a separate commit. Run `npm run test:run` after each step to verify:

1. **Part A** — `git rebase -i 5c2eee23^` to squash 24 refactoring commits into 7
2. **B.1** — Remove duplicate tests (6 files modified)
3. **B.2** — Parameterize with `test.each` (8 conversions)
4. **B.3** — Extract shared test helpers into existing `src/utils/astro/__tests__/testHelpers.ts`
5. **B.4** — Split `src/utils/astro/__tests__/unit/validation.test.ts` into 5 focused files
6. **B.5** — Delete test-local code tests (desktopInteractions, navigationHelpers, embeddedElementRefTests)
7. **Keep B.1–B.5 as separate commits during development** for easy rollback. Only squash them AFTER all verification passes into a single commit: `refactor: remove duplicates, parameterize, extract helpers, split mega-file, delete test-local code tests`

### Verification

After each step, run:

```bash
npm run check         # lint + typecheck
npm run test:run      # all unit tests
```

### Rollback — Part A

If any step breaks tests, the affected commit can be reverted with `git revert <hash>`.

### Rollback — Part B

Since each B step is a separate commit, you can:

- Roll back N steps with `git reset --hard HEAD~N`
- Revert individual commits with `git revert <hash>`
- Or restore from the backup branch created in the Pre-Flight Checklist: `git reset --hard backup/pre-reorganization`

---

## Post-Reorganization Validation

After all steps complete, run the full verification suite:

```bash
# 1. Lint, typecheck, and unit tests
npm run check && npm run test:run

# 2. E2E tests
npx playwright test

# 3. Compare test count before/after
npx vitest run --reporter=verbose | grep -E "(Test Files|Tests)"
```

> **Note:** This command is Unix-oriented (`grep`). On Windows, run `npx vitest run --reporter=verbose` and inspect the output manually.

```bash
# 4. Verify no orphaned test files (not imported by any test runner config)
#    Review your Vitest config and ensure every .test.ts file is covered.

# 5. Final diff review
git diff --stat
```
