+ You are a senior software developer
+ Keep communication concise and precise until asked for more information.
+ Keep files tidy. Don't create many doc files unless it makes sense to have content split up. Ensure doc files are always up to date.
+ Prioritize readability before performance in code.
+ Don't run summary files of actions taken. Instead emit a brief description of the changes.
Never run `npm run dev`. Always check if the site builds with `npm run build` and check / fix typescript errors with `npm run astro check`.

---

# RTO Calculator - Project Architecture

This document provides an overview of the RTO Calculator's file architecture. The project follows a domain-organized structure separating UI components, business logic, client-side scripts, types, and utilities.

## Directory Structure

```
src/
├── components/     # Astro UI components
├── lib/            # Core business logic
│   ├── validation/ # Validation domain logic
│   ├── holiday/    # Holiday management logic
├── scripts/        # Client-side DOM integration scripts
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Components (`src/components/`)

Astro UI components that render the calendar interface and user controls.

| File | Purpose |
|------|---------|
| `day.astro` | Individual day cell rendering |
| `month.astro` | Month container and layout |
| `ActionButtons.astro` | Main action buttons (clear, validate, etc.) |
| `SettingsButton.astro` | Settings toggle button |
| `SettingsModal.astro` | Settings configuration modal |

## Lib (`src/lib/`)

Core business logic organized by domain. This directory contains framework-agnostic TypeScript that handles the application's core rules.

### Validation (`src/lib/validation/`)

Implements the Strategy pattern for flexible validation rules.

| File | Purpose |
|------|---------|
| `ValidationStrategy.ts` | Abstract base class for all validators |
| `StrictDayCountValidator.ts` | Validates exact day counts |
| `AverageWindowValidator.ts` | Validates rolling average windows |
| `ValidationOrchestrator.ts` | Coordinates multiple validation strategies |
| `ValidationFactory.ts` | Creates validator instances |
| `rto-core.ts` | Core RTO calculation logic |
| `RollingPeriodValidation.ts` | Legacy validation implementation |

### Holiday (`src/lib/holiday/`)

Manages holiday data retrieval and integration with the calendar.

| File | Purpose |
|------|---------|
| `HolidayManager.ts` | Main holiday management interface |
| `HolidayDataLoader.ts` | Loads holiday data from sources |
| `CalendarHolidayIntegration.ts` | Integrates holidays into calendar display |
| `data/` | Country holiday data and filters |
| `sources/` | Data source implementations (NagerDate API) |

### Other Lib Files

| File | Purpose |
|------|---------|
| `calendar-data-reader.ts` | Reads and parses calendar data |
| `rto-config.ts` | RTO configuration constants and settings |

## Scripts (`src/scripts/`)

Client-side JavaScript/TypeScript that integrates with the DOM. These files bridge the Astro components with the business logic in `lib/`.

| File | Purpose |
|------|---------|
| `rto-ui-controller.ts` | Main UI controller coordinating all interactions |
| `calendar-events.ts` | Calendar event handling (clicks, selections) |
| `index-init.ts` | Page initialization logic |
| `settings-modal.ts` | Settings modal behavior |
| `validation-result-display.ts` | Displays validation results in UI |
| `localStorage.ts` | Local storage operations |
| `debug.ts` | Debugging utilities |

## Types (`src/types/`)

TypeScript type definitions shared across the application.

| File | Purpose |
|------|---------|
| `validation-strategy.d.ts` | Validation strategy interfaces |
| `holiday-data-source.ts` | Holiday data source types |
| `calendar-types.d.ts` | Calendar-related type definitions |
| `rto-validation.d.ts` | RTO validation result types |

## Utils (`src/utils/`)

Reusable utility functions used across the codebase.

| File | Purpose |
|------|---------|
| `dateUtils.ts` | Date manipulation utilities |
| `storage.ts` | Storage abstraction layer |
| `dragSelection.ts` | Drag-to-select functionality |
| `validation.ts` | Validation helper functions |
| `astro/` | Astro-specific utilities (calendar functions, test helpers) |
