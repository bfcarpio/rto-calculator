# RTO Calculator – Developer Guide

This guide provides practical information for developers working on the RTO Calculator codebase.

## Quick Links

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design patterns
- **[../AGENTS.md](../AGENTS.md)** - Build/test commands and code style guidelines
- **[PlaywrightTesting.md](./PlaywrightTesting.md)** - E2E testing guide

---

## Development Workflow

### Initial Setup

```bash
# Clone and install
git clone <repo-url>
cd rto-calculator
npm install

# Build workspace dependencies (required once)
npm run build:all      # Builds nager.date and datepainter packages

# Verify setup
npm run check          # Type checking
npm run lint           # Linting
npm run test:run       # Unit tests
npm run build          # Production build
```

**Important:** This project uses npm workspaces. The workspace packages (`nager.date`, `datepainter`) must be built before running the main application. Run `npm run build:all` after cloning or when workspace code changes.

> **Note:** `npm run dev` will automatically check if workspaces are built and remind you if needed.

### Development Commands

See [../AGENTS.md](../AGENTS.md) for complete command reference:

```bash
# Build & Preview
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm test                # Unit tests (watch mode)
npm run test:run        # Unit tests once (CI)
npm run test:e2e        # E2E tests with Playwright

# Code Quality
npm run lint            # Check linting
npm run lint:fix        # Fix linting issues
npm run format          # Format code
npm run check           # All checks (lint + types)
```

---

## Architecture Overview

### 3-Layer Validation Flow

```
UI Controller (rto-ui-controller.ts)
    ↓ triggers
Data Reader (calendar-data-reader.ts)
    ↓ reads datepainter API
Orchestrator (ValidationOrchestrator.ts)
    ↓ coordinates validation
Strategy (StrictDayCountValidator / AverageWindowValidator)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md#the-3-layer-validation-flow) for detailed explanation.

### Key Systems

**Validation System** - Strategy pattern with two modes:
- `StrictDayCountValidator` - Each week must meet 3-day minimum
- `AverageWindowValidator` - 12-week rolling window, best 8 weeks ≥ 60%

**Holiday System** - Pluggable data source architecture:
- `HolidayManager` - Singleton service for holiday operations
- `NagerDateHolidayDataSource` - Nager.Date API integration
- Company-specific filtering via `company-filters.json`

**State Management**:
- **datepainter** - Primary calendar state (replacing deprecated dateStore)
- **HistoryManager** - Undo/redo functionality with state snapshots
- **localStorage** - Persists user settings

---

## Creating a Custom Validation Strategy

1. **Create strategy class** extending `ValidationStrategy`:

```typescript
// src/lib/validation/CustomValidator.ts
import { ValidationStrategy } from './ValidationStrategy';
import type { ValidatorContext, ValidationResult, WeekCompliance, WindowCompliance } from '../../types/validation-strategy';

export class CustomValidator extends ValidationStrategy {
  readonly name = "custom";
  readonly description = "My custom validation logic";

  validate(context: ValidatorContext): ValidationResult {
    // Your validation logic
    // Access config via this.defaultConfig or context.config
    // Use helper methods: this._groupDaysByWeek(), this._getStartOfWeek(), etc.

    return {
      isValid: true,
      message: "Validation passed",
      overallCompliance: 100,
      windowResults: [],
      violatingWindows: [],
      compliantWindows: [],
      validationMode: "custom"
    };
  }

  getWeekCompliance(weekStart: Date, context: ValidatorContext): WeekCompliance {
    // Calculate compliance for a single week
  }

  getWindowCompliance(
    windowStart: number,
    windowSize: number,
    context: ValidatorContext
  ): WindowCompliance {
    // Calculate compliance for a window of weeks
  }
}
```

2. **Register with ValidationFactory**:

```typescript
// src/lib/validation/ValidationFactory.ts
import { CustomValidator } from './CustomValidator';

// Add to ValidationMode type
export type ValidationMode = "strict" | "average" | "custom";

// Add to _instantiateValidator()
private static _instantiateValidator(mode: ValidationMode): ValidationStrategy {
  switch (mode) {
    case "strict":
      return new StrictDayCountValidator();
    case "average":
      return new AverageWindowValidator();
    case "custom":
      return new CustomValidator();
    default:
      throw new Error(`Unsupported mode: ${mode}`);
  }
}

// Add to getAvailableModes()
static getAvailableModes(): ValidationMode[] {
  return ["strict", "average", "custom"];
}
```

3. **Add to UI** (optional):

```typescript
// src/components/SettingsModal.astro
// Add option to validation mode dropdown
<option value="custom">Custom Validation</option>
```

4. **Write tests**:

```typescript
// src/lib/__tests__/CustomValidator.test.ts
import { describe, it, expect } from 'vitest';
import { CustomValidator } from '../validation/CustomValidator';

describe('CustomValidator', () => {
  it('should pass validation for valid scenario', () => {
    const validator = new CustomValidator();
    const result = validator.validate({ /* context */ });
    expect(result.isValid).toBe(true);
  });

  // More tests...
});
```

---

## Working with the Holiday System

### Adding a New Holiday Data Source

1. **Extend HolidayDataSourceStrategy**:

```typescript
// src/lib/holiday/sources/CustomHolidayDataSource.ts
import { HolidayDataSourceStrategy } from '../HolidayDataSourceStrategy';
import type { Holiday } from '../../types/holiday-data-source';

export class CustomHolidayDataSource extends HolidayDataSourceStrategy {
  name = "custom-api";

  async getHolidaysByYear(year: number, countryCode: string): Promise<Holiday[]> {
    // Fetch from your API
    const response = await fetch(`https://api.example.com/holidays/${year}/${countryCode}`);
    const data = await response.json();

    // Transform to Holiday interface
    return data.map(h => ({
      date: new Date(h.date),
      name: h.name,
      countryCode: countryCode,
      localName: h.localName,
      types: h.types || ['Public'],
      global: h.global || true
    }));
  }

  // Implement other required methods...
}
```

2. **Register the data source**:

```typescript
// src/lib/holiday/HolidayDataSourceFactory.ts
import { CustomHolidayDataSource } from './sources/CustomHolidayDataSource';

// In initialization code
const factory = HolidayDataSourceFactory.getInstance();
const customSource = new CustomHolidayDataSource(config);
await factory.registerDataSource("custom-api", customSource);
```

### Adding Company Holiday Filters

Edit `src/lib/holiday/data/company-filters.json`:

```json
{
  "US": {
    "name": "United States",
    "companies": {
      "Acme Corp": [
        "New Year's Day",
        "Independence Day",
        "Thanksgiving Day",
        "Christmas Day"
      ],
      "Tech Startup": [
        "New Year's Day",
        "Memorial Day",
        "Independence Day",
        "Labor Day",
        "Thanksgiving Day",
        "Christmas Day"
      ]
    }
  }
}
```

---

## State Management

### Using datepainter API

The calendar uses the **datepainter** library for state management:

```typescript
// Get calendar instance
const calendarInstance = window.calendarManager; // or from datepainter API

// Get all selected dates
const dates = calendarInstance.getAllDates();

// Set date state
calendarInstance.setDateState(new Date('2025-01-15'), 'oof'); // out-of-office

// Clear date state
calendarInstance.clearDateState(new Date('2025-01-15'));

// Query date state
const state = calendarInstance.getDateState(new Date('2025-01-15'));
```

**Note**: `dateStore` in `src/lib/dateStore.ts` is deprecated and being phased out. Use datepainter API directly.

### Using HistoryManager (Undo/Redo)

```typescript
// src/lib/history/HistoryManager.ts
import { HistoryManager } from '../lib/history/HistoryManager';

const historyManager = HistoryManager.getInstance();

// Save current state
historyManager.pushState({
  calendarState: { /* date selections */ },
  currentMonth: new Date(),
  validationConfig: { /* config */ },
  timestamp: Date.now()
});

// Undo
const previousState = historyManager.undo();
if (previousState) {
  // Restore state
}

// Redo
const nextState = historyManager.redo();
if (nextState) {
  // Restore state
}

// Check if undo/redo available
const canUndo = historyManager.canUndo();
const canRedo = historyManager.canRedo();
```

### Using localStorage

```typescript
// src/scripts/localStorage.ts
import { loadFromLocalStorage, saveToLocalStorage } from '../scripts/localStorage';

// Save settings
saveToLocalStorage('rto-settings', {
  countryCode: 'US',
  companyName: 'Acme Corp',
  validationMode: 'strict'
});

// Load settings
const settings = loadFromLocalStorage('rto-settings');
```

---

## Configuration

### Centralized Configuration

```typescript
// src/lib/rto-config.ts
export const RTO_CONFIG = {
  minOfficeDaysPerWeek: 3,
  totalWeekdaysPerWeek: 5,
  DEBUG: false,
};

export const DEFAULT_POLICY = {
  minOfficeDaysPerWeek: 3,
  totalWeekdaysPerWeek: 5,
  thresholdPercentage: 0.6,       // 60%
  rollingPeriodWeeks: 12,
  topWeeksToCheck: 8,
};
```

### Validation Constants

```typescript
// src/lib/validation/constants.ts
export const MINIMUM_COMPLIANT_DAYS = 3;
export const TOTAL_WEEK_DAYS = 5;
export const ROLLING_WINDOW_WEEKS = 12;
export const COMPLIANCE_THRESHOLD = 0.6;
export const BEST_WEEKS_COUNT = 8;
```

---

## Testing

### Unit Tests (Vitest)

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run specific test file
npm test -- src/lib/__tests__/HolidayManager.test.ts
```

**Test Location**: Co-locate with source in `__tests__/` folders:
- `src/lib/__tests__/` - Core logic tests
- `src/components/__tests__/` - Component tests
- `src/utils/__tests__/` - Utility tests

**Writing Tests**:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MyModule', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', () => {
    // Arrange
    const input = { /* test data */ };

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toEqual({ /* expected */ });
  });
});
```

### E2E Tests (Playwright)

See [PlaywrightTesting.md](./PlaywrightTesting.md) for comprehensive guide.

```bash
# Run all E2E tests
npm run test:e2e

# Open UI mode for debugging
npm run test:e2e:ui

# Run with debugger
npm run test:e2e:debug
```

---

## Debugging

### Enable Debug Logging

```typescript
// In browser console
localStorage.setItem('rto-calculator-debug', 'true');

// Or set in code (src/lib/rto-config.ts)
export const RTO_CONFIG = {
  DEBUG: true,
};
```

### Using Logger

```typescript
// src/utils/logger.ts
import { debug, info, warn, error } from '../utils/logger';

debug('[MyModule] Debug information');    // Only shown when DEBUG enabled
info('[MyModule] Informational message'); // Only shown when DEBUG enabled
warn('[MyModule] Warning message');       // Always shown
error('[MyModule] Error message');        // Always shown
```

### Browser DevTools

**Exposed Globals** (for debugging):
- `window.validationManager` - ValidationManager instance
- `window.__holidayCountries` - Array of country objects
- `window.__getHolidayManager` - Function to get HolidayManager instance
- `window.calendarManager` - datepainter calendar instance

```javascript
// In browser console
window.validationManager.validate(selectedDays, options);
window.__getHolidayManager().getHolidayDates(2025, 'US');
window.calendarManager.getAllDates();
```

---

## Common Patterns

### Strategy Pattern (Validation)

```typescript
// Base class defines interface
abstract class ValidationStrategy {
  abstract validate(context: ValidatorContext): ValidationResult;
}

// Concrete implementations
class StrictDayCountValidator extends ValidationStrategy { /* ... */ }
class AverageWindowValidator extends ValidationStrategy { /* ... */ }

// Factory creates instances
const validator = ValidationFactory.createValidator("strict");
```

### Factory Pattern (Creating Objects)

```typescript
class ValidationFactory {
  static createValidator(mode: ValidationMode): ValidationStrategy {
    // Create and return appropriate instance
  }
}

class HolidayDataSourceFactory {
  async registerDataSource(name: string, source: HolidayDataSourceStrategy) {
    // Register data source
  }
}
```

### Singleton Pattern (Managers)

```typescript
class HolidayManager {
  private static instance: HolidayManager;

  static async getInstance(): Promise<HolidayManager> {
    if (!HolidayManager.instance) {
      HolidayManager.instance = new HolidayManager();
      await HolidayManager.instance.initialize();
    }
    return HolidayManager.instance;
  }
}
```

---

## Code Style Guidelines

See [../AGENTS.md](../AGENTS.md) for complete guidelines including:
- **The 5 Laws of Elegant Defense**
- TypeScript conventions
- Naming conventions
- Import/export patterns
- Error handling
- Performance considerations

---

## File Organization

```
src/
├── lib/                    # Core business logic (no DOM)
│   ├── validation/         # Validation strategies
│   ├── holiday/           # Holiday management
│   ├── history/           # Undo/redo management
│   └── calendar-data-reader.ts
│
├── scripts/               # Client-side DOM integration
│   ├── rto-ui-controller.ts
│   ├── ValidationManager.ts
│   └── eventHandlers.ts
│
├── components/            # Astro components
├── types/                 # TypeScript types
├── utils/                 # Utility functions
└── styles/                # CSS styles
```

**Key Principle**: `lib/` has zero DOM dependencies. `scripts/` bridges lib and UI.

---

## Release Workflow

### Pre-Release Checklist

```bash
# 1. Run all checks
npm run check              # Type checking + linting
npm run test:run           # Unit tests
npm run test:e2e           # E2E tests
npm run build              # Production build

# 2. Verify build
npm run preview

# 3. Update documentation
# - Update version in package.json
# - Update CHANGELOG.md
# - Update relevant docs in docs/

# 4. Commit and tag
git add .
git commit -m "Release v1.x.x"
git tag v1.x.x
git push && git push --tags
```

### CI/CD

- `.github/workflows/ci.yml` - Linting, type checking, unit tests, build
- `.github/workflows/e2e.yml` - E2E tests with Playwright
- `.github/workflows/release.yml` - Release workflow (manual trigger)

---

## Troubleshooting

### Build Errors

**"Cannot find module"**
- Check import paths are correct (absolute vs. relative)
- Verify file exists and has proper extension
- Check `tsconfig.json` path mappings

**Type errors**
- Run `npm run check` to see all type errors
- Check type definitions in `src/types/`
- Ensure imports include type definitions

### Test Failures

**Unit tests failing**
- Check for missing mocks (DOM, APIs)
- Verify test data matches expected format
- Run single test: `npm test -- path/to/test.ts`

**E2E tests failing**
- Check if server is running (`npm run preview`)
- Verify selectors are correct
- See [PlaywrightTesting.md](./PlaywrightTesting.md#troubleshooting)

### Runtime Errors

**"Cannot read property of undefined"**
- Check initialization order (async initialization?)
- Verify globals are set (holidayCountries, holidayManager)
- Enable debug logging to trace execution

**Validation not working**
- Check if calendar has selections
- Verify validation mode is set
- Check browser console for errors
- Inspect `window.validationManager` state

---

## Getting Help

- **Architecture Questions**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Testing Issues**: [PlaywrightTesting.md](./PlaywrightTesting.md)
- **Code Style**: [../AGENTS.md](../AGENTS.md)
- **User Features**: [USER_GUIDE.md](./USER_GUIDE.md)

---

*Last Updated: February 2025*
