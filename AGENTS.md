# Agent Guidelines for RTO Calculator
You are a senior software engineer. Writing readable maintable code and fixing or preventing bugs brings you closer to receiving a performance bonus.

Write code that follows the conventions of the project's tool stack.

Write brief and consise text with minimal code output in the chat.

Before making commits make sure that the changes pass lints, checks, and tests to ensure there are no regressions and continual code quality. Update tests as needed if the new result is the intended one.

## Build / Lint / Test Commands

Never ever run `npm run dev` to start a dev server. Use `scripts/start-playwright-server.sh` and the playwright mcp to navigate the website.

```bash
# Development
npm run build           # Build for production (runs type check + build)
npm run preview         # Preview production build

# Testing (Unit)
npm test                # Run tests in watch mode
npm run test:run        # Run tests once (CI)
npm run test:ui         # Run tests with UI
# Run single test: npm test -- src/lib/__tests__/specific.test.ts

# E2E Testing (Playwright)
npm run test:e2e              # Run all E2E tests (Firefox desktop)
npm run test:e2e:ui           # Open Playwright UI mode for debugging
npm run test:e2e:debug        # Run with step-through debugger
npm run test:e2e:raw         # Run without server management
npm run test:e2e:server       # Start preview server only
npm run test:e2e:mobile       # Run mobile viewport tests
npm run test:e2e:desktop      # Run desktop viewport tests
npm run test:e2e:report      # Open HTML test report
# See docs/PlaywrightTesting.md for detailed guide

# Linting & Formatting
npm run lint            # Check linting
npm run lint:fix        # Fix linting issues
npm run format          # Format code
npm run check           # Run all checks (lint + types)
```

## Code Style Guidelines

### 1. The 5 Laws of Elegant Defense
- **Early Exit:** Handle edge cases at the top with guard clauses. No deep nesting.
- **Parse, Don't Validate:** Parse inputs at boundaries. Internal logic trusts typed data.
- **Atomic Predictability:** Functions should be pure. Same input = same output.
- **Fail Fast, Fail Loud:** Invalid states throw descriptive errors immediately.
- **Intentional Naming:** Names should read like English. `isUserEligible` not `check()`.

### 2. TypeScript
- Prefer TypeScript over JavaScript. Convert JS files when modifying.
- Use explicit return types on public functions.
- Avoid `any`. Use `unknown` with type guards when type is uncertain.
- Enable strict mode features. No implicit returns.

### 3. Naming Conventions
- **Files:** PascalCase for classes (`ValidationStrategy.ts`), camelCase for utilities (`dateUtils.ts`)
- **Classes:** PascalCase (`ValidationStrategy`, `HolidayManager`)
- **Functions:** camelCase, descriptive (`getWeekCompliance`, `calculateOfficeDays`)
- **Constants:** UPPER_SNAKE_CASE for true constants
- **Interfaces:** PascalCase with descriptive names (`ValidationResult`, `WeekCompliance`)

### 4. Imports & Exports
- Use explicit imports: `import { Thing } from './path'` not `import * as ...`
- Export named exports for multiple items, default export for main class
- Order imports: external libraries → internal types → internal modules
- Group by: Astro imports → utility imports → component imports

### 5. Project Structure
- `src/components/` - Astro UI components
- `src/lib/validation/` - Validation strategy pattern implementations
- `src/lib/holiday/` - Holiday management logic
- `src/scripts/` - Client-side DOM integration scripts
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions

### 6. Error Handling
- Throw descriptive errors with context: `throw new Error('Week start not initialized')`
- Use guard clauses to fail fast, not try-catch for expected failures
- Log debug info only when `config.debug` is enabled

### 7. Testing
- Co-locate tests with source: `src/lib/__tests__/Module.test.ts`
- Use descriptive test names: `should return compliant when office days >= 3`
- Mock external dependencies (API calls, DOM)
- Test edge cases: empty inputs, null values, boundary conditions

### 8. Performance
- Avoid premature optimization. Clarity first.
- Remove unused caches. Simple computation > cached complexity.
- Use Web Workers only for truly CPU-intensive tasks (>50ms blocking).

## Key Patterns

**Strategy Pattern:** Use for validation modes. Base class in `ValidationStrategy.ts`, concrete implementations in `StrictDayCountValidator.ts` and `AverageWindowValidator.ts`.

**Factory Pattern:** Use `ValidationFactory.ts` to instantiate correct validator by mode.

**Singleton:** Use for managers (HolidayManager) with `getInstance()` method.
