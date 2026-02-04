# Shared Test Data

This module provides a central export point for all test fixtures, enabling sharing between unit tests (Vitest) and E2E tests (Playwright).

## Structure

```
src/
├── test-data.ts                    # Central export point (this file)
└── utils/astro/__tests__/
    └── fixtures/
        ├── index.ts                 # Re-exports calendar, weekly, sliding window
        ├── calendarData.ts          # Date constants and utilities
        ├── weeklyPatterns.ts        # Pattern definitions and scenarios
        ├── slidingWindowScenarios.ts # Sliding window test scenarios
        └── responsiveScenarios.ts   # Responsive/alignment with E2E
```

## Usage

### Unit Tests

Unit tests can import directly from the fixtures or from the central `test-data`:

```typescript
// From fixtures (existing pattern)
import { BASE_CALENDAR, WEEKLY_PATTERNS } from "./fixtures";

// From central export
import { BASE_CALENDAR, WEEKLY_PATTERNS } from "../../test-data";
```

### E2E Tests

E2E tests import from the central export point:

```typescript
import { 
  BASE_CALENDAR, 
  WEEKLY_PATTERNS,
  RTO_POLICY_CONFIG // E2E-specific configuration
} from "../src/test-data";
```

## Alignment Between Unit and E2E Tests

### Validation Scenarios

| E2E Scenario | Unit Test Scenario | Pattern | WFH Days | Office Days | Compliance |
|--------------|-------------------|---------|----------|-------------|------------|
| `"perfect"` | `SCENARIO_8_WEEKS_COMPLIANT` + `PERFECT` | `none` | 0 | 5 | 100% |
| `"compliant"` | `SCENARIO_8_WEEKS_COMPLIANT` | `tue-thu` | 2 | 3 | 60% |
| `"borderline"` | `SCENARIO_BOUNDARY_60_PERCENT` | `tue-thu` | 2 | 3 | 60% |
| `"violation"` | `SCENARIO_8_WEEKS_VIOLATION` | `mwf` | 3 | 2 | 40% |
| `"empty"` | `SCENARIO_EMPTY_SELECTIONS` | N/A | 0 | 5 | 100% |

### Weekday Patterns

| E2E Pattern | Unit Test Pattern | WFH Days | Office Days | Compliance |
|-------------|-------------------|----------|-------------|------------|
| `"none"` | `PERFECT` | 0 | 5 | 100% |
| `"tue-thu"` | `GOOD` | 2 | 3 | 60% |
| `"mwf"` | `POOR` | 3 | 2 | 40% |
| `"all"` | `TERRIBLE` | 5 | 0 | 0% |

### Configuration Constants

All tests use identical policy configuration:

```typescript
const RTO_POLICY_CONFIG = {
  totalWeekdaysPerWeek: 5,      // 5 weekdays per week (Mon-Fri)
  minOfficeDaysPerWeek: 3,      // Minimum 3 office days for compliance
  thresholdPercentage: 0.6,       // 60% compliance threshold
  rollingPeriodWeeks: 12,       // 12-week rolling period
  topWeeksToEvaluate: 8,        // Top 8 weeks evaluated
};
```

### Base Calendar Date

All tests align on the same starting date:

```typescript
const BASE_CALENDAR_DATE = {
  startYear: 2025,
  startMonth: 0,  // January
  startDay: 6,    // Monday, January 6, 2025
};
```

## Philosophy

**Parse, Don't Validate**: Test data is structured so that E2E and unit tests naturally use the same values without needing runtime checks. The shared constants ensure both test types agree on:

1. **Date references** - All tests use Jan 6, 2025 (Monday) as the reference date
2. **Threshold values** - 60% = 3 office days out of 5 weekdays
3. **Scenario definitions** - Same scenarios with consistent naming

## Benefits

1. **Consistency** - Unit and E2E tests validate the same scenarios
2. **Maintainability** - Change test data in one place
3. **Clarity** - Developers can see the alignment between test types
4. **Reliability** - No drift between what unit tests and E2E tests validate
