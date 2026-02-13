# RTO Calculator – Developer Guide

## Validation strategy contract
- Base class: `src/lib/validation/ValidationStrategy.ts`.
- Key properties: `name`, `description`, `defaultConfig` (min days, weekdays, rolling window, threshold, best-weeks count).
- Core methods you can rely on: `validate(context)`, `getWeekCompliance`, `getWindowCompliance`, `reset`, plus helpers for grouping weeks, selecting best weeks, and debug logging.
- Context expects selected days (treated as WFH days), optional pre-grouped `weeksByWFH`, calendar bounds, and config overrides.

## Creating a custom validator
1. Create a class extending `ValidationStrategy` in `src/lib/validation/`.
2. Implement `validate(context)`; use `_groupDaysByWeek`, `_getWeeksForEvaluation`, and `_summarizeWindow` to keep behavior consistent.
3. Add your new mode to `ValidationMode` in `ValidationFactory.ts`, handle it in `_instantiateValidator`, and expose it via `getAvailableModes`.
4. Add unit tests covering pass/fail paths and empty selections; assert messages and window summaries.
5. Update any UI mode selector to surface the new mode and re-run the full test suite.

## State and persistence
- In-memory store: `DateStore` (`src/lib/dateStore.ts`) tracks marking mode, date states, and stats; use `initializeDateStore`, `subscribeToStore`, and `markDate` helpers when wiring UI.
- DOM-driven persistence: `src/scripts/localStorage.ts` listens to `rto-selection-changed` events; enable saving through the settings workflow (exposed as `window.storageManager.setDataSavingEnabled`).
- LocalStorage keying: selected dates save as `YYYY-MM-DD:type`; clearing via "Clear all" plus refresh removes any persisted data.

## Logger and debug flags
- Logger: `src/utils/logger.ts` exposes `debug`, `info`, `warn`, `error`; debug/info are silenced unless debug is on.
- Enable debug (priority order): runtime override (`window.__RTO_DEBUG`), `localStorage.setItem("rto-calculator-debug", "true")`, env flags (`PUBLIC_DEBUG` / `PUBLIC_RTO_DEBUG` / `DEBUG`). Use `setDebugEnabled(false)` or remove the flag to quiet logs.

## Tests and checks
- Lint: `npm run lint`
- Type & Astro check: `npm run check`
- Unit tests (once): `npm run test:run`
- E2E: `npm run test:e2e` (starts preview server automatically); see `docs/PlaywrightTesting.md` for variants.

## Release workflow overview
- CI (`.github/workflows/ci.yml`): npm ci → lint → `npm run check` → `npm run test:run` → build.
- E2E (`.github/workflows/e2e.yml`): npm ci → install Playwright browsers → `npm run test:e2e`.
- Release (`.github/workflows/release.yml`): manual trigger with version; reruns checks, coverage-bearing tests, build, Playwright suite, and bundle-size gate before publishing artifacts.
