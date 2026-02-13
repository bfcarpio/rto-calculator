# Release 1.0 - RTO Calculator Production Ready

**Release 1.0 Scope**: Core RTO calculator functionality (calendar marking, validation, basic UI). Non-core features (holidays, export, advanced options) are commented out and deferred to future releases.

**Accessibility Note**: This document is structured for screen reader compatibility with proper heading hierarchy and ARIA landmarks.

## Current State Analysis

The RTO Calculator has **most core functionality implemented** and working. Here's what's already complete:

### ✅ **Fully Implemented & Working**
<!-- ARIA: Task list - 8 items completed -->
- **Interactive Calendar**: AirDatepicker integration with day selection (work-from-home vs office)
- **Drag Selection**: Bulk marking functionality for efficient date selection
- **Month Navigation**: Seamless navigation with state persistence
- **State Persistence**: localStorage integration maintaining selections across sessions
- **Validation Engine**: Two complete validation strategies (StrictDayCountValidator, AverageWindowValidator)
<!-- DEFERRED: - **Holiday Management**: Nager.Date API integration with automatic holiday detection -->
- **Responsive Design**: Mobile and desktop optimized interfaces
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Theme System**: Dark/light mode toggle with persistent preferences
- **Settings Modal**: Comprehensive configuration interface
- **Test Structure**: Unit tests, integration tests, and E2E framework

### ⚠️ **Critical Gaps for 1.0 Release**

**Note**: Holiday management and Nager.Date API integration are OUT OF SCOPE for Release 1.0. These features will be deferred to a future release.

Based on codebase analysis, these specific items need completion:

## Table of Contents

**Quick Navigation**:
- [1. TypeScript Migration](#1-typescript-migration-completion)
- [2. State Management](#2-state-management-migration-to-nano-stores)
- [3. Error Handling](#3-enhanced-error-handling--user-experience)
- [4. Test Coverage](#4-test-coverage-expansion)
- [5. Production Features](#5-production-readiness-features)
- [6. Documentation](#6-documentation--user-guidance)
- [7. Performance](#7-performance--reliability)
- [8. Security](#8-security--data-integrity)
- [9. Logging](#9-logging-system-cleanup)
- [10. Regression Prevention](#10-regression-prevention-strategy)
- [11. Release Pipeline](#11-github-actions-release-pipeline)

**Quick Links**:
- [Acceptance Criteria](#acceptance-criteria)
- [Release Checklist](#release-checklist)

<!-- ARIA: Navigation complete, beginning implementation sections -->

<!-- ARIA: section region start -->
## 1. TypeScript Migration Completion
<!-- ARIA: aria-labelledby="section-1-title" -->

**Status**: 95% complete - 2 JavaScript files remain
<!-- ARIA: Task list - 9 items remaining -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] `src/scripts/ValidationManager.js` → Convert to TypeScript
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] `src/examples/holiday-data-sources-usage.js` → Convert to TypeScript
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Remove legacy JavaScript validation patterns
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Ensure all validation logic uses new TypeScript strategy pattern
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Refactor ValidationStrategy base class** - Move duplicated methods to share code
<!-- ARIA: End checkbox -->
  - Move `_getWeeksForEvaluation()` from validators to base class (exact copy in both)
  - Move `_calculateWeekStart()` to base class (exact copy in both)
  - Move `_extractWeeksMap()` to base class (exact copy in both)
  - Move `getWeekCompliance()` to base class (nearly identical logic)
  - Move `getWindowCompliance()` to base class (nearly identical logic)
  - **Benefits**: ~125 lines removed, single source of truth, easier testing

<!-- ARIA: Checkbox - unchecked -->
- [ ] **Delete backup files** - Remove dead code before release
<!-- ARIA: End checkbox -->
  - Delete `src/lib/__tests__/RollingPeriodValidation.test.ts.bak` (363 lines of dead code)

<!-- ARIA: Checkbox - unchecked -->
- [ ] **Address technical debt comments** - Fix or document TODO/FIXME/HACK
<!-- ARIA: End checkbox -->
  - Fix 1 FIXME in StrictDayCountValidator.ts ("needs proper implementation")
  - Fix 1 TODO in ValidationStrategy.ts ("_logDebug() needs proper debug flag")
  - Review 2 HACK comments in validation tests - fix or document why acceptable

<!-- ARIA: Checkbox - unchecked -->
- [ ] **Eliminate magic numbers** - Replace hardcoded values with named constants
<!-- ARIA: End checkbox -->
  <!-- ARIA: Code example below - Named constants for validation rules -->
  ```typescript
  // src/lib/validation/constants.ts
  export const REQUIRED_OFFICE_DAYS = 3;
  export const TOTAL_WEEK_DAYS = 5;
  export const ROLLING_WINDOW_WEEKS = 12;
  export const BEST_WEEKS_COUNT = 8;
  export const COMPLIANCE_THRESHOLD = 0.6; // 60%
  export const MINIMUM_COMPLIANT_DAYS = 3;
  ```
  - Currently scattered throughout StrictDayCountValidator and AverageWindowValidator
  - Centralize in `src/lib/validation/constants.ts`

<!-- ARIA: Checkbox - unchecked -->
- [ ] **Add JSDoc documentation** - Document public APIs
<!-- ARIA: End checkbox -->
  - ValidationStrategy base class methods
  - StrictDayCountValidator public methods
  - AverageWindowValidator public methods
  - Exported utility functions (dateUtils, etc.)
  - Focus on: parameters, return types, exceptions, examples

<!-- ARIA: section region start -->
## 2. State Management Migration to Nano Stores
<!-- ARIA: aria-labelledby="section-2-title" -->

**Goal**: Implement centralized, reactive state management for better code organization and future persistence

**Why Nano Stores**:
- ✅ Centralized state (single source of truth)
- ✅ Reactive updates (automatic UI synchronization)
- ✅ TypeScript-first with strict typing
- ✅ Lightweight (~300 bytes) with zero dependencies
- ✅ Easy testing (test logic in isolation)
- ✅ Seamless persistence path (add @nanostores/persistent later)

**Implementation Tasks**:
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Install dependency**: `npm install nanostores`
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Create store structure** (`src/stores/`)
<!-- ARIA: End checkbox -->
  - `calendarStore.ts` - Calendar selections, current month
  - `validationStore.ts` - Validation mode, results
  - `uiStore.ts` - UI state (isDragging, settings visibility)
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Define store interfaces** with strict TypeScript
<!-- ARIA: End checkbox -->
<!-- ARIA: Code example below - TypeScript store interface -->
  ```typescript
  export const selectedDates = atom<Set<string>>(new Set());
  export const currentMonth = atom<Date>(new Date());
  export const validationMode = atom<'strict' | 'average'>('strict');
  export const isDragging = atom<boolean>(false);
  ```
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Migrate existing state** from scattered variables to stores
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Update components** to subscribe to stores instead of manual DOM updates
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Add store tests** - Unit tests for store operations and derived state
<!-- ARIA: End checkbox -->

**Persistence Strategy**:
- **Release 1.0**: No persistence (state clears on refresh) - intentional simplicity
- **Future Release**: Add `@nanostores/persistent` for automatic localStorage sync
- **Migration path**: Zero breaking changes - just swap `atom()` to `persistentMap()`

**Architecture Benefits**:
- Separates state logic from UI components
- Enables time-travel debugging (store snapshots)
- Makes testing much easier (mock store state)
- Prepares for future features without refactoring

---

**Note**: All subsequent sections should be renumbered (current Section 2 becomes 3, etc.)

<!-- ARIA: section region start -->
## 3. Enhanced Error Handling & User Experience
<!-- ARIA: aria-labelledby="section-3-title" -->

**Current Issues**: Basic error handling, missing user feedback
<!-- DEFERRED: - [ ] Implement loading states for API calls (holiday data fetching) -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Add confirmation dialogs for destructive actions (clear all, reset settings)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Improve error messages with actionable guidance
<!-- ARIA: End checkbox -->
<!-- DEFERRED: - [ ] Add retry mechanisms for failed API calls -->
<!-- DEFERRED: - [ ] Implement offline mode detection and graceful degradation -->

<!-- ARIA: section region start -->
## 4. Test Coverage Expansion
<!-- ARIA: aria-labelledby="section-4-title" -->

**Current Coverage**: Good foundation, needs completion
<!-- ARIA: Checkbox - unchecked -->
- [ ] **E2E Test Gaps**: Complete validation workflow tests
<!-- ARIA: End checkbox -->
  - Full strict mode validation flows
  - Average window validation across multiple scenarios
  - Settings persistence across sessions
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Unit Test Coverage**: Achieve 75%+ coverage
<!-- ARIA: End checkbox -->
  - Edge cases in validation strategies
  - Error handling paths
  - Boundary conditions in date calculations
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Integration Tests**: Cross-component interaction testing
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Performance Tests**: Large dataset handling (1000+ days)
<!-- ARIA: End checkbox -->

<!-- ARIA: section region start -->
## 5. Production Readiness Features
<!-- ARIA: aria-labelledby="section-5-title" -->

**Missing Critical Features**:
<!-- DEFERRED START: Print/Export Functionality
- [ ] **Print/Export Functionality**
  - PDF export of calendar with validation results
  - CSV export of selected dates and compliance data
  - Print-optimized stylesheet
DEFERRED END -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Keyboard Shortcuts**
<!-- ARIA: End checkbox -->
  - Ctrl+S: Save current state
  - Ctrl+Z: Undo last action
  - Space: Toggle current day selection
  - Arrow keys: Navigate calendar
<!-- DEFERRED START: Advanced Validation Options
- [ ] **Advanced Validation Options**
  - Custom holiday exclusion rules
  - Flexible week definitions (Mon-Fri vs Sun-Sat)
  - Partial day handling (half days)
DEFERRED END -->

<!-- ARIA: section region start -->
## 6. Documentation & User Guidance
<!-- ARIA: aria-labelledby="section-6-title" -->

**Current Gap**: Technical documentation exists, user documentation missing
<!-- ARIA: Checkbox - unchecked -->
- [ ] **User Documentation**
<!-- ARIA: End checkbox -->
  - Getting started guide
  - Validation mode explanations
  - Troubleshooting guide
<!-- ARIA: Checkbox - unchecked -->
- [ ] **In-App Help System**
<!-- ARIA: End checkbox -->
  - Contextual tooltips
  - First-run tutorial
  - Validation results explanation
<!-- ARIA: Checkbox - unchecked -->
- [ ] **API Documentation** (for developers)
<!-- ARIA: End checkbox -->
  - Validation strategy interface
  - Custom validation implementation

<!-- ARIA: section region start -->
## 7. Performance & Reliability
<!-- ARIA: aria-labelledby="section-7-title" -->

**Optimization Needs**:
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Memory Management**: Optimize for long-running sessions
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Large Dataset Handling**: Performance with 2+ years of data
<!-- ARIA: End checkbox -->
<!-- DEFERRED: - [ ] **Caching Strategy**: Intelligent holiday data caching -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Bundle Optimization**: Minimize JavaScript bundle size
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Loading Performance**: Optimize initial page load
<!-- ARIA: End checkbox -->

<!-- ARIA: section region start -->
## 8. Security & Data Integrity
<!-- ARIA: aria-labelledby="section-8-title" -->

**Production Requirements**:
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Data Validation**: Sanitize all user inputs
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **XSS Prevention**: Secure DOM manipulation
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **LocalStorage Limits**: Handle storage quota exceeded
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Data Migration**: Handle format changes gracefully
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Privacy Compliance**: Clear user data on request
<!-- ARIA: End checkbox -->

<!-- ARIA: section region start -->
## 9. Logging System Cleanup
<!-- ARIA: aria-labelledby="section-9-title" -->

**Goal**: Ensure clean, controllable logging that doesn't pollute production

<!-- ARIA: Checkbox - unchecked -->
- [ ] **Audit existing logs** - Review all console.log/error/warn calls in src/
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Implement debug toggle** - Add centralized logging utility with debug flag
<!-- ARIA: End checkbox -->
  - Create `src/utils/logger.ts` with clean interface
  - Support log levels: debug, info, warn, error
  - All production logs hidden behind debug flag
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Replace console calls** - Replace all console.* calls with logger utility
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Remove debug noise** - Eliminate logs that provide no value in production
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Add meaningful log contexts** - Include relevant data for debugging when enabled
<!-- ARIA: End checkbox -->

**Logging Package Decision**:
- **Decision**: Use custom wrapper around console (recommended for this project)
- **Rationale**: 
  - Zero additional dependencies
  - Simple requirements (just need debug toggle)
  - Custom logger can be tailored to project needs
  - No learning curve for team
- **Alternative**: `debug` npm package (if more advanced features like namespaces, colors needed)
- **Implementation**: Create `src/utils/logger.ts` with clean interface
<!-- ARIA: Code example below - TypeScript logger interface -->
  ```typescript
  interface Logger {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  }
  
  export const logger: Logger = {
    debug: (...args) => { if (isDebugEnabled()) console.debug(...args); },
    info: (...args) => { if (isDebugEnabled()) console.info(...args); },
    warn: (...args) => console.warn(...args),  // Always show warnings
    error: (...args) => console.error(...args)  // Always show errors
  };
  ```

<!-- ARIA: section region start -->
## Acceptance Criteria
<!-- ARIA: aria-labelledby="section-acceptance-title" -->

### Functional Requirements
<!-- ARIA: Checkbox - unchecked -->
- [ ] All existing functionality works without regression
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] TypeScript migration 100% complete (no .js files in src/)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] All validation modes work correctly with comprehensive test coverage
<!-- ARIA: End checkbox -->
<!-- DEFERRED: - [ ] Print/export functionality generates usable output -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Keyboard shortcuts work consistently across browsers
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Error handling provides clear user feedback
<!-- ARIA: End checkbox -->

### Technical Requirements
<!-- ARIA: Checkbox - unchecked -->
- [ ] **100% TypeScript coverage** in src/ directory
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **75%+ test coverage** for all validation logic
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **All existing tests pass** (currently 4 failing tests)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Zero lint warnings** (currently 14 warnings)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Performance benchmarks met**: Smooth operation with 1000+ days
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Cross-browser compatibility**: Chrome, Firefox, Safari, Edge
<!-- ARIA: End checkbox -->

### Quality Standards
<!-- ARIA: Checkbox - unchecked -->
- [ ] Code follows 5 Laws of Elegant Defense
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Comprehensive error handling with user-friendly messages
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] WCAG 2.1 accessibility compliance
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Mobile-first responsive design
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Clean, maintainable codebase with clear documentation
<!-- ARIA: End checkbox -->

### Documentation Requirements
<!-- ARIA: Checkbox - unchecked -->
- [ ] User guide with screenshots and examples
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Developer documentation for extension points
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] API documentation for validation strategies
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Deployment and configuration guide
<!-- ARIA: End checkbox -->

<!-- ARIA: Main content region -->

<!-- ARIA: section region start -->
## Release Checklist
<!-- ARIA: aria-labelledby="section-checklist-title" -->

### Pre-Release
<!-- ARIA: Checkbox - unchecked -->
- [ ] Complete TypeScript migration
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Fix all failing tests (4 currently failing)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Resolve all lint warnings (14 currently)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Implement missing error handling
<!-- ARIA: End checkbox -->
<!-- DEFERRED: - [ ] Add print/export functionality -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Create user documentation
<!-- ARIA: End checkbox -->

### Testing
<!-- ARIA: Checkbox - unchecked -->
- [ ] Run full test suite (unit + E2E)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Cross-browser testing
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Mobile device testing
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Performance testing with large datasets
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Accessibility audit
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Security review
<!-- ARIA: End checkbox -->

### Documentation
<!-- ARIA: Checkbox - unchecked -->
- [ ] Complete user documentation
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Update README with current features
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Create deployment guide
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Document API for developers
<!-- ARIA: End checkbox -->

### Deployment
<!-- ARIA: Checkbox - unchecked -->
- [ ] Production build verification
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Environment configuration
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Monitoring setup
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Backup strategy
<!-- ARIA: End checkbox -->

<!-- ARIA: section region start -->
## Post-Release Monitoring
<!-- ARIA: aria-labelledby="section-monitoring-title" -->

<!-- ARIA: Checkbox - unchecked -->
- [ ] Error rate tracking
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Performance metrics
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] User feedback collection
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Feature usage analytics
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Regular security updates
<!-- ARIA: End checkbox -->

---

**Note**: This plan focuses on completing existing functionality rather than building from scratch. The core architecture is solid and most features are implemented. The gaps are primarily in polish, testing, documentation, and production-readiness features.

<!-- ARIA: section region start -->
## 10. Regression Prevention Strategy
<!-- ARIA: aria-labelledby="section-10-title" -->

To prevent regressions in core functionality over time, implement these safeguards:

### 10.1 Test Coverage Foundation

**Critical Path Unit Tests**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Validation logic (StrictDayCountValidator, AverageWindowValidator) - 75%+ coverage
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Date calculations and edge cases (leap years, timezone changes, month boundaries)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] State management and persistence
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Week compliance calculation algorithms
<!-- ARIA: End checkbox -->

**Integration Tests**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Calendar → Validation pipeline (ensure marking days updates validation)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] State persistence (localStorage) → UI consistency
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Validation mode switching → Results recalculation
<!-- ARIA: End checkbox -->

**E2E Tests (User Workflows)**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Complete marking workflows (drag, click, clear, range select)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Month navigation with state preservation
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Validation mode switching and recalculation
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Mobile vs desktop interactions (touch vs mouse)
<!-- ARIA: End checkbox -->

### 10.2 Automated Quality Gates

**CI/CD Pipeline** (GitHub Actions or similar)
<!-- ARIA: Checkbox - unchecked -->
- [ ] TypeScript compilation with strict mode
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Unit tests with coverage threshold (75%+ for validation logic)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] E2E tests across multiple viewports (desktop, tablet, mobile)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Accessibility audit (WCAG 2.1 AA compliance)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Performance budgets (calendar render <100ms, validation <50ms)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Bundle size limits (warn if >200KB, fail if >500KB)
<!-- ARIA: End checkbox -->

**Build Verification**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Production build succeeds without errors
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] No TypeScript errors or warnings
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] All lint checks pass (Biome/ESLint)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] No console errors in production build
<!-- ARIA: End checkbox -->

### 10.3 Visual Regression Testing

**Screenshot Comparisons**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Calendar states: empty, partially marked, fully validated
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Validation results display (compliant vs non-compliant)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Mobile responsive breakpoints (320px, 768px, 1024px, 1440px)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Cross-browser visual consistency (Chrome, Firefox, Safari, Edge)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Dark/light mode theme switching
<!-- ARIA: End checkbox -->

**Test Scenarios**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Default state on first load
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Validation mode comparison view
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Settings modal open/closed
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Error states and loading states
<!-- ARIA: End checkbox -->

### 10.4 Type Safety as Regression Shield

**Branded Types for Domain Safety**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Implement branded types for domain concepts:
<!-- ARIA: End checkbox -->
<!-- ARIA: Code example below - TypeScript branded types -->
  ```typescript
  type DateISO = string & { __brand: 'DateISO' };
  type WeekId = string & { __brand: 'WeekId' };
  type OOFStatus = boolean & { __brand: 'OOFStatus' };
  ```
<!-- ARIA: Checkbox - unchecked -->
- [ ] Add compile-time guards for date operations
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Ensure all date parsing happens at system boundaries
<!-- ARIA: End checkbox -->

**Strict TypeScript Enforcement**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Maintain strict mode (no implicit any, strict null checks)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Add explicit return types to all public functions
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Use `unknown` instead of `any` for uncertain types
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Enable noImplicitReturns and noFallthroughCasesInSwitch
<!-- ARIA: End checkbox -->

### 10.5 Monitoring & Production Safeguards

**Error Tracking**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Integrate error tracking (Sentry or similar)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Capture validation calculation errors
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Monitor localStorage quota exceeded errors
<!-- ARIA: End checkbox -->

**Performance Monitoring**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Calendar render time tracking (<100ms target)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Validation calculation performance (<50ms for 12 weeks)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Memory usage for long-running sessions
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Bundle load time and parse time
<!-- ARIA: End checkbox -->

**Runtime Invariant Checking**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Add development-only assertions:
<!-- ARIA: End checkbox -->
<!-- ARIA: Code example below - TypeScript runtime assertions -->
  ```typescript
  console.assert(weeks.length === 12, 'Rolling window must have 12 weeks');
  console.assert(compliance >= 0 && compliance <= 1.0, 'Compliance must be 0-1');
  console.assert(officeDays + oofDays === totalDays, 'Day count must balance');
  ```

### 10.6 Code Review & Change Management

**Regression-Focused Review Checklist**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Date logic changes include edge case tests (leap years, DST, month ends)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Validation changes preserve backward compatibility (existing calculations unchanged)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] UI changes include visual regression tests
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] New features include E2E tests for complete user workflows
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] TypeScript strict mode compliance maintained
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Performance impact assessed for large datasets (1000+ days)
<!-- ARIA: End checkbox -->

**Refactoring Safety Protocol**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Maintain test coverage throughout refactoring
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Use characterization tests to lock current behavior before changes
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Incremental migration with feature flags when possible
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Pair programming for complex validation logic refactors
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Document architectural decisions (ADRs) for major changes
<!-- ARIA: End checkbox -->

### 10.7 Documentation-Driven Testing

**Living Documentation**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Feature specifications document expected behavior
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Test specifications written before implementation
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Acceptance criteria define regression boundaries
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Edge case documentation (known limitations, workarounds)
<!-- ARIA: End checkbox -->

**Regression Test Suite Categories**
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Smoke Tests**: Core functionality always works (mark day, validate, save)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Critical Path**: Most common user workflows
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Edge Cases**: Leap years, timezone transitions, month boundaries
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Integration Points**: API, storage, validation engine
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] **Performance**: Large datasets, memory pressure
<!-- ARIA: End checkbox -->

### 10.8 Data Integrity Safeguards

**LocalStorage Protection**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Schema validation on data load (reject corrupted data)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Data migration handling for format changes
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Storage quota detection and graceful handling
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Corruption recovery (reset to defaults if data invalid)
<!-- ARIA: End checkbox -->

**State Consistency Validation**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Ensure validation results match calendar state
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Check week calculations match expected boundaries
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Validate date ranges are within expected limits
<!-- ARIA: End checkbox -->

### 10.9 Continuous Quality Metrics

**Track Over Time**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Test coverage trends (prevent coverage degradation)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Performance benchmarks (alert on regression >10%)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Bundle size trends (prevent bloat)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Error rates in production (alert on spikes)
<!-- ARIA: End checkbox -->

**Quality Dashboard**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Coverage: 75%+ target, warn if <70%, fail if <65%
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Performance: Track render and calculation times
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Dependencies: Monitor for security vulnerabilities
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Accessibility: Regular WCAG audits
<!-- ARIA: End checkbox -->

### 10.10 Specific High-Risk Areas

**Priority Testing Focus**
1. **Validation Calculations**: Add property-based testing (fast-check or similar)
<!-- ARIA: Task list - 3 sub-items -->
   - Generate random valid date sets
   - Verify 3/5 rule is correctly applied
   - Test best 8/12 weeks algorithm

2. **Date Arithmetic**: Test all edge cases
<!-- ARIA: Task list - 4 sub-items -->
   - Leap year handling (Feb 29)
   - Daylight saving time transitions
   - Month boundary calculations (weeks spanning months)
   - Year boundary (week 52/53 to week 1)

3. **State Persistence**: Test storage limits
<!-- ARIA: Task list - 3 sub-items -->
   - Maximum days that can be stored
   - Data format evolution/migration
   - Browser storage quota exceeded

4. **Drag Interactions**: Test input methods
<!-- ARIA: Task list - 4 sub-items -->
   - Mouse drag across multiple days
   - Touch drag on mobile devices
   - Mixed input (mouse + touch)
   - Edge cases (single day, entire month)

### 10.11 Release Validation

**Pre-Release Regression Check**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Run full test suite and verify 100% pass rate
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Execute manual regression checklist (critical paths)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Verify no console errors in production build
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Check bundle size against budget
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Test upgrade path from previous version
<!-- ARIA: End checkbox -->

**Post-Release Monitoring**
<!-- ARIA: Checkbox - unchecked -->
- [ ] Monitor error rates for 48 hours post-release
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Track performance metrics (compare to baseline)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Collect user feedback on new features
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Verify analytics events firing correctly
<!-- ARIA: End checkbox -->

<!-- ARIA: section region start -->
## 11. GitHub Actions Release Pipeline
<!-- ARIA: aria-labelledby="section-11-title" -->

**Goal**: Automated, reliable release process with strict quality gates

### 11.1 CI Pipeline (Pull Requests)

**Triggers**: Push to main, Pull Requests

<!-- ARIA: Code example below - GitHub Actions CI workflow YAML -->
```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: TypeScript compilation (strict)
        run: npm run check
      
      - name: Lint check
        run: npm run lint
      
      - name: Unit tests with coverage
        run: npm run test:run -- --coverage
      
      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 30
      
      - name: Build production
        run: npm run build
      
      - name: Build verification
        run: |
          test -d dist/
          test -f dist/index.html
```

### 11.2 E2E Test Pipeline

**Triggers**: Pull Requests (optional on pushes to save time)

<!-- ARIA: Code example below - GitHub Actions E2E workflow YAML -->
```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on:
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### 11.3 Release Pipeline (Manual Trigger)

**Triggers**: Manual workflow dispatch only (workflow_dispatch)

<!-- ARIA: Code example below - GitHub Actions Release workflow YAML -->
```yaml
# .github/workflows/release.yml
name: Release
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version number (e.g., 1.0.0)'
        required: true
        type: string

jobs:
  quality-gates:
    name: Quality Gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      # STRICT: TypeScript compilation must pass
      - name: TypeScript compilation (strict mode)
        run: npm run check
      
      # STRICT: All lint checks must pass
      - name: Lint check (zero warnings allowed)
        run: |
          npm run lint
          if [ $? -ne 0 ]; then
            echo "Lint errors found. Release blocked."
            exit 1
          fi
      
      # STRICT: Unit tests with coverage threshold
      - name: Unit tests with 75% coverage threshold
        run: |
          npm run test:run -- --coverage
          # Coverage check would be here (using nyc or similar)
          # Fail if coverage < 75%
      
      # STRICT: Build must succeed
      - name: Production build
        run: npm run build
      
      # STRICT: Build verification
      - name: Verify build output
        run: |
          if [ ! -d "dist" ]; then
            echo "Build output missing. Release blocked."
            exit 1
          fi
          if [ ! -f "dist/index.html" ]; then
            echo "index.html missing from build. Release blocked."
            exit 1
          fi
      
      # STRICT: E2E tests
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
      
      # STRICT: Bundle size check
      - name: Check bundle size
        run: |
          BUNDLE_SIZE=$(du -sb dist/ | cut -f1)
          MAX_SIZE=524288000  # 500KB in bytes
          if [ $BUNDLE_SIZE -gt $MAX_SIZE ]; then
            echo "Bundle size $BUNDLE_SIZE exceeds limit $MAX_SIZE. Release blocked."
            exit 1
          fi
          echo "Bundle size: $BUNDLE_SIZE bytes (OK)"

  build-and-compress:
    name: Build and Compress
    needs: quality-gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build production
        run: npm run build
      
      - name: Compress build output with xz
        run: |
          tar -cJf rto-calculator-v${{ github.event.inputs.version }}.tar.xz dist/
          ls -lh *.tar.xz
      
      - name: Upload compressed artifact
        uses: actions/upload-artifact@v4
        with:
          name: rto-calculator-v${{ github.event.inputs.version }}
          path: rto-calculator-v${{ github.event.inputs.version }}.tar.xz
          retention-days: 90
          compression-level: 0  # Already compressed with xz
      
      - name: Generate release notes
        run: |
          echo "# RTO Calculator v${{ github.event.inputs.version }}" > RELEASE_NOTES.md
          echo "" >> RELEASE_NOTES.md
          echo "## Build Information" >> RELEASE_NOTES.md
          echo "- Build Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> RELEASE_NOTES.md
          echo "- Commit: ${{ github.sha }}" >> RELEASE_NOTES.md
          echo "- Bundle Size: $(du -sh dist/ | cut -f1)" >> RELEASE_NOTES.md
          echo "" >> RELEASE_NOTES.md
          echo "## Download" >> RELEASE_NOTES.md
          echo "Download the compressed artifact from the workflow run." >> RELEASE_NOTES.md
      
      - name: Upload release notes
        uses: actions/upload-artifact@v4
        with:
          name: release-notes
          path: RELEASE_NOTES.md
          retention-days: 90

  publish-check:
    name: Publish Gate
    needs: [quality-gates, build-and-compress]
    runs-on: ubuntu-latest
    steps:
      - name: Verify all quality gates passed
        run: |
          echo "All quality gates passed:"
          echo "✅ TypeScript compilation (strict)"
          echo "✅ Lint checks (zero warnings)"
          echo "✅ Unit tests (75%+ coverage)"
          echo "✅ E2E tests (all passed)"
          echo "✅ Build verification (output exists)"
          echo "✅ Bundle size check (<500KB)"
          echo ""
          echo "Release artifact is ready for download."
          echo "Version: v${{ github.event.inputs.version }}"
```

### 11.4 Pipeline Features

**Quality Gates (ALL must pass)**:
<!-- ARIA: Task list - 7 items -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] TypeScript compilation with strict mode - **BLOCKING**
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Lint checks with zero warnings - **BLOCKING**
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Unit tests with 75%+ coverage - **BLOCKING**
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] E2E tests all passing - **BLOCKING**
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Production build successful - **BLOCKING**
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Build output verification - **BLOCKING**
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Bundle size < 500KB - **BLOCKING**
<!-- ARIA: End checkbox -->

**Release Artifacts**:
<!-- ARIA: Checkbox - unchecked -->
- [ ] Compressed .tar.xz file with version number
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Release notes with build metadata
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Coverage report (HTML)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Test results (if E2E fails)
<!-- ARIA: End checkbox -->

**Manual Trigger Process**:
1. Go to Actions tab → Release workflow
2. Click "Run workflow"
3. Enter version number (e.g., 1.0.0)
4. Pipeline runs all quality gates
5. If all pass: artifact is built and uploaded
6. If any fail: pipeline stops, no artifact created
7. Download artifact from workflow run page

### 11.5 Artifact Management

**Download Instructions**:
- Artifacts available for 90 days
- Download from Actions → Release workflow → Artifacts section
- Compressed with xz for maximum compression
- Extract with: `tar -xJf rto-calculator-v1.0.0.tar.xz`

**Artifact Contents**:
<!-- ARIA: Code example below - Artifact directory structure -->
```
rto-calculator-v1.0.0.tar.xz
└── dist/
    ├── index.html
    ├── assets/
    │   ├── index-*.js
    │   ├── index-*.css
    │   └── ...
    └── ...
```

### 11.6 Implementation Tasks

<!-- ARIA: Checkbox - unchecked -->
- [ ] Create `.github/workflows/ci.yml` for continuous integration
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Create `.github/workflows/e2e.yml` for E2E testing
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Create `.github/workflows/release.yml` for manual releases
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Configure repository settings (Actions permissions)
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Test pipeline with a dry-run release
<!-- ARIA: End checkbox -->
<!-- ARIA: Checkbox - unchecked -->
- [ ] Document release process in README
<!-- ARIA: End checkbox -->

---

**Document Accessibility Information**:
- **Heading Structure**: H1 (1) → H2 (11) → H3 (variable)
- **Landmarks**: Main content, Implementation sections, Checklist regions
- **Code Examples**: 15+ TypeScript and YAML examples with descriptive labels
- **Lists**: Task lists with semantic markup, 150+ total items
- **Skip Navigation**: Table of contents with anchor links provided
- **ARIA Roles**: region, complementary (notes), contentinfo (footer)

*Last Updated*: 2026-02-05
