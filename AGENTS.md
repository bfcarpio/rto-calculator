# Agent Guidelines for RTO Calculator

## Role
You are a senior software engineer focused on writing maintainable, bug-free code.

## Core Principles
1. Write brief, concise responses with minimal code output in chat
2. Follow the project's existing conventions and tool stack
3. Prefer TypeScript over JavaScript always

## CRITICAL RULES

### DO NOT
- ❌ **NEVER run `npm run dev` for E2E tests** - Use `npx playwright test` which auto-starts a preview server via `webServer` config. If a dev server is already running it will be reused.
- ❌ Do not use `any` type - Use `unknown` with type guards
- ❌ Do not use wildcard imports - Use explicit imports: `import { Thing } from './path'`
- ❌ Do not nest deeply - Use early returns and guard clauses
- ❌ Do not optimize prematurely - Prioritize clarity over performance
- ❌ Do not commit without verification - Always run lints, checks, and tests first

### DO
- ✅ Use TypeScript for all new/modified files
- ✅ Add explicit return types to public functions
- ✅ Throw descriptive errors with context
- ✅ Write tests for all changes
- ✅ Update documentation when changing behavior

## Development Workflow

Follow this exact sequence for every change:

1. **Implement** - Make the code changes
2. **Report** - Provide a brief summary of what changed and why
3. **Test** - Update or add tests to cover the changes
4. **Document** - Update relevant documentation (README, ARCHITECTURE, etc.)
5. **Verify** - Run all quality checks:
   ```bash
   npm run check        # Lint + type check
   npm run test:run     # Unit tests
   npm run test:e2e     # E2E tests
   ```
6. **Commit** - Create focused, atomic commits with clear messages

**Critical:** Steps 3 (Test) and 4 (Document) MUST happen before commits.

**End-of-workflow checklist** (applies to ALL workflows):
- Tests MUST be updated or added to cover any changes
- Documentation MUST be updated to reflect behavior changes
- Commits MUST be focused and atomic (separate commits for feature, tests, docs)

## Documentation Reference

Read these before making significant changes:
- **[docs/README.md](./docs/README.md)** - Documentation index
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture and data flow
- **[docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)** - Development workflows
- **[docs/TestingBestPractices.md](./docs/TestingBestPractices.md)** - Unit and E2E testing best practices
- **[docs/PlaywrightTesting.md](./docs/PlaywrightTesting.md)** - E2E testing commands and debugging

## Commands Reference

```bash
# Build & Preview
npm run build           # Build for production (type check + build)
npm run preview         # Preview production build

# Unit Testing
npm test                # Run tests in watch mode
npm run test:run        # Run tests once (CI mode)
npm run test:ui         # Run tests with UI
npm test -- path/to/specific.test.ts  # Run single test

# E2E Testing (Playwright)
# Preferred: let Playwright handle the server via webServer config
npx playwright test                          # Run all E2E tests (auto-starts preview server)
npx playwright test --project=chromium-desktop  # Single browser project
npx playwright test --workers=2              # Limit parallelism
npx playwright test e2e/date-marking.spec.ts # Single test file
npm run test:e2e:ui           # Open Playwright UI mode
npm run test:e2e:report       # View HTML test report

# Quality Checks
npm run lint            # Check linting
npm run lint:fix        # Auto-fix linting issues
npm run format          # Format code with Prettier
npm run check           # Run all checks (lint + types)
```

## NPM Workspaces

This project uses npm workspaces to manage multiple packages in the `packages/` directory:
- **datepainter** - Calendar component package
- **nager.date** - Holiday API client package

### Workspace Commands

```bash
# Run scripts in specific workspace
npm run dev --workspace=datepainter        # Run dev in datepainter
npm run dev --workspace=nager-date         # Run dev in nager.date
npm run dev:datepainter                    # Shorthand for datepainter dev
npm run dev:nager                          # Shorthand for nager dev

# Run scripts across all workspaces
npm run build --workspaces --if-present    # Build all packages that have build script
npm run build:all                          # Shorthand for building all
npm run clean:all                          # Clean all workspaces + root node_modules
npm run install:all                        # Install dependencies in all workspaces

# Install dependencies in workspaces
npm install <package> --workspace=datepainter     # Add dep to specific workspace
npm install <package> --workspace=nager-date      # Add dep to nager.date
npm install <package> --workspaces                # Add dep to all workspaces
npm install                                       # Install all workspace dependencies

# Run commands in workspace directories
npm run test --workspace=datepainter       # Run tests in datepainter
npm run lint --workspace=datepainter       # Lint datepainter

# List workspaces
npm list --workspaces                      # List all workspaces
```

### When to Use Workspace Commands

**Use workspace-specific commands when:**
- ✅ Developing or testing a specific package in isolation
- ✅ Adding dependencies to a specific package
- ✅ Running package-specific scripts

**Use root commands when:**
- ✅ Running application-wide tests (E2E tests)
- ✅ Building the entire application
- ✅ Linting/formatting the entire codebase
- ✅ Running the main Astro application

**Important:** Dependencies for workspace packages should be added using `--workspace=<name>`, not by directly modifying package.json files.

## Code Style Rules

### The 5 Laws of Elegant Defense

Apply these principles to all code:

1. **Early Exit** - Handle edge cases at the top with guard clauses
   ```typescript
   // ✅ Good
   function process(data: Data | null) {
     if (!data) return null;
     if (!data.isValid) return null;
     return transform(data);
   }

   // ❌ Bad
   function process(data: Data | null) {
     if (data) {
       if (data.isValid) {
         return transform(data);
       }
     }
     return null;
   }
   ```

2. **Parse, Don't Validate** - Parse inputs at boundaries, trust typed data internally
   ```typescript
   // ✅ Good - Parse once at boundary
   function handleInput(raw: unknown): Result {
     const validated = parseInput(raw); // Returns typed data or throws
     return processValidData(validated); // Trusts the type
   }

   // ❌ Bad - Validate repeatedly
   function handleInput(raw: any): Result {
     if (isValid(raw)) {
       if (hasProperty(raw)) {
         return process(raw);
       }
     }
   }
   ```

3. **Atomic Predictability** - Pure functions: same input = same output
   ```typescript
   // ✅ Good - Pure function
   function calculateDays(start: Date, end: Date): number {
     return differenceInDays(end, start);
   }

   // ❌ Bad - Depends on external state
   function calculateDays(): number {
     return differenceInDays(this.endDate, this.startDate);
   }
   ```

4. **Fail Fast, Fail Loud** - Throw descriptive errors immediately for invalid states
   ```typescript
   // ✅ Good
   if (!weekStart) {
     throw new Error('Week start not initialized. Call setWeekStart() first.');
   }

   // ❌ Bad
   if (!weekStart) {
     console.log('no week start');
     return;
   }
   ```

5. **Intentional Naming** - Names read like English sentences
   ```typescript
   // ✅ Good
   isUserEligible()
   calculateOfficeDays()
   getWeekCompliance()

   // ❌ Bad
   check()
   calc()
   get()
   ```

### TypeScript Rules

```typescript
// ✅ DO: Explicit return types on public functions
export function calculateDays(start: Date, end: Date): number {
  return differenceInDays(end, start);
}

// ✅ DO: Use unknown with type guards instead of any
function process(data: unknown): string {
  if (typeof data !== 'string') {
    throw new Error('Expected string');
  }
  return data.toUpperCase();
}

// ❌ DON'T: Implicit return types
export function calculateDays(start: Date, end: Date) {
  return differenceInDays(end, start);
}

// ❌ DON'T: Use any
function process(data: any): string {
  return data.toUpperCase();
}
```

### Naming Conventions

| Type | Convention | Examples |
|------|-----------|----------|
| **Files (classes)** | PascalCase | `ValidationStrategy.ts`, `HolidayManager.ts` |
| **Files (utilities)** | camelCase | `dateUtils.ts`, `formatters.ts` |
| **Classes** | PascalCase | `ValidationStrategy`, `HolidayManager` |
| **Functions** | camelCase | `getWeekCompliance`, `calculateOfficeDays` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_DAYS`, `DEFAULT_CONFIG` |
| **Interfaces** | PascalCase | `ValidationResult`, `WeekCompliance` |

### Import/Export Rules

```typescript
// ✅ DO: Explicit named imports
import { ValidationStrategy } from './ValidationStrategy';
import { formatDate, parseDate } from './dateUtils';

// ✅ DO: Order imports logically
import { Component } from 'astro:components';  // External libs
import type { ValidationResult } from './types';  // Types
import { ValidationFactory } from './validation';  // Internal modules

// ✅ DO: Named exports for utilities, default for main class
export class ValidationStrategy { }  // default
export { helper1, helper2 };  // named

// ❌ DON'T: Wildcard imports
import * as utils from './dateUtils';
```

### Error Handling

```typescript
// ✅ DO: Descriptive errors with context
if (!weekStart) {
  throw new Error('Week start not initialized. Call setWeekStart() before validation.');
}

// ✅ DO: Guard clauses for expected failures
function validate(data: Data | null): ValidationResult {
  if (!data) return { valid: false, reason: 'No data provided' };
  if (!data.startDate) return { valid: false, reason: 'Missing start date' };
  // ... continue with valid data
}

// ✅ DO: Conditional logging
if (config.debug) {
  console.log('Validation result:', result);
}

// ❌ DON'T: Generic errors
throw new Error('Invalid');

// ❌ DON'T: Try-catch for expected failures
try {
  const result = validate(data);
} catch (e) {
  return null;
}
```

### Testing Guidelines

```typescript
// ✅ DO: Co-locate tests with source
// src/lib/validation/ValidationStrategy.ts
// src/lib/validation/__tests__/ValidationStrategy.test.ts

// ✅ DO: Descriptive test names
test('should return compliant when office days >= 3', () => {
  const result = validator.validate(threeOfficeDays);
  expect(result.compliant).toBe(true);
});

// ✅ DO: Test edge cases
test('should handle null input gracefully', () => {
  expect(() => validator.validate(null)).toThrow();
});

test('should handle empty array', () => {
  expect(validator.validate([])).toEqual({ compliant: true, violations: [] });
});

// ✅ DO: Mock external dependencies
const mockApi = vi.fn().mockResolvedValue(mockData);
```

## Project Structure

```
src/
├── components/          # Astro UI components
├── lib/
│   ├── validation/     # Sliding window validation (rto-core.ts)
│   ├── holiday/        # Holiday management logic
│   └── __tests__/      # Tests co-located with source
├── scripts/            # Client-side DOM integration
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Architecture Patterns

### Singleton Pattern
Use for stateful managers with `getInstance()` method.

```typescript
// HolidayManager.ts
export class HolidayManager {
  private static instance: HolidayManager;

  static getInstance(): HolidayManager {
    if (!HolidayManager.instance) {
      HolidayManager.instance = new HolidayManager();
    }
    return HolidayManager.instance;
  }
}
```

## Design Patterns for Reducing Complexity

### Prefer Events Over Direct Subscriptions

When multiple UI components need the same computed data, use a **single event emitter** instead of having each component independently subscribe, compute, and update.

**Pattern: Event-driven stats**
```
Single producer (auto-compliance module)
  → subscribes to onStateChange once
  → debounces, computes, dispatches CustomEvent
  → N consumers listen for the event (zero coupling)
```

**Why:**
- Eliminates duplicated computation across components
- Components don't need polling or direct calendar access
- Adding a new consumer = one `addEventListener` call, no changes to producers
- Natural debouncing — compute once, broadcast to all

**Anti-pattern: Each component subscribes independently**
```
StatusDetails subscribes → computes weeks → updates DOM
StatusLegend subscribes → counts states → updates DOM
```

This pattern led to duplicated computation when multiple components independently computed the same stats.

### Design Away the Need for Mocks

When a function uses a fixed value internally (e.g., a reference date), tests shouldn't mock globals to "prove" it works. If the implementation doesn't depend on `new Date()`, the test shouldn't either.

**Prefer:**
1. Pure functions with explicit parameters over functions that read globals
2. `vi.useFakeTimers()` + `vi.setSystemTime()` when you truly need to control "now"
3. Deleting the mock entirely when the function under test doesn't use the mocked thing

**Avoid:** `vi.spyOn(globalThis, "Date")` — brittle, type-unsafe, and usually a sign the test is testing implementation rather than behavior.

## Performance Guidelines

1. **Clarity First** - Write clear code, optimize only when profiling shows need
2. **Remove Unused Complexity** - Delete unused caches and optimizations
3. **Web Workers** - Only for CPU-intensive tasks blocking >50ms

```typescript
// ✅ Good - Clear and simple
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Bad - Premature optimization
const cache = new Map();
function calculateTotal(items: Item[]): number {
  const key = JSON.stringify(items);
  if (cache.has(key)) return cache.get(key);
  const total = items.reduce((sum, item) => sum + item.price, 0);
  cache.set(key, total);
  return total;
}
```
