# UI Refactor: Consistent Data Communication

## Goal

Ensure all UI components properly communicate data, respond to settings changes, and maintain consistent data flow through a single source of truth and unified event system.

## Prerequisites

- [ ] All current tests pass (`npm run test:run`)
- [ ] Build succeeds (`npm run build`)
- [ ] E2E tests pass (`npx playwright test`)

---

## Phase 1: Single Source of Truth (ValidationManager)

### Task 1.1: Add config getters to ValidationManager

- [x] Add getter methods for all config values
- **Files:** `src/scripts/ValidationManager.ts`
- **Tests:** Unit tests for getters
- **Commit:** `refactor: add config getters to ValidationManager`

### Task 1.2: Add state subscription to ValidationManager

- [x] Add subscribe/unsubscribe methods
- [x] Track subscribers in array
- **Files:** `src/scripts/ValidationManager.ts`
- **Tests:** Unit tests for subscription
- **Commit:** `refactor: add state subscription to ValidationManager`

---

## Phase 2: Extract WindowBreakdown Component

### Task 2.1: Create WindowBreakdown.astro

- [x] Create new component file
- [x] Accept windows prop
- [x] Render window dots
- **Files:** `src/components/WindowBreakdown.astro` (NEW)
- **Tests:** Visual verification
- **Commit:** `refactor: extract WindowBreakdown component`

### Task 2.2: Integrate WindowBreakdown in StatusDetails

- [x] Import WindowBreakdown
- [x] Pass windows data as prop
- [x] Remove inline rendering
- **Files:** `src/components/StatusDetails.astro`
- **Tests:** E2E tests for window breakdown
- **Commit:** `refactor: use WindowBreakdown in StatusDetails`

---

## Phase 3: Extract WeekSummary Component

### Task 3.1: Create WeekSummary.astro

- [ ] Create new component file
- [ ] Accept week data prop
- [ ] Render week summary UI
- **Files:** `src/components/WeekSummary.astro` (NEW)
- **Tests:** Visual verification
- **Commit:** `refactor: extract WeekSummary component`

### Task 3.2: Integrate WeekSummary in StatusDetails

- [ ] Import WeekSummary
- [ ] Pass week data as prop
- [ ] Remove inline rendering
- **Files:** `src/components/StatusDetails.astro`
- **Tests:** E2E tests for week summary
- **Commit:** `refactor: use WeekSummary in StatusDetails`

---

## Phase 4: Consolidate Event System

### Task 4.1: Define typed event interfaces

- [ ] Create RTOStateEvent interface
- [ ] Create payload types for each event type
- **Files:** `src/types/events.ts` (NEW)
- **Tests:** Type checking
- **Commit:** `refactor: add typed event interfaces`

### Task 4.2: Update ValidationManager to dispatch unified event

- [ ] Replace rto:config-changed with rto:state-changed
- [ ] Include event type in payload
- **Files:** `src/scripts/ValidationManager.ts`
- **Tests:** Unit tests for event dispatch
- **Commit:** `refactor: dispatch unified state event from ValidationManager`

### Task 4.3: Update SettingIndicator to listen to unified event

- [ ] Change event listener to rto:state-changed
- [ ] Filter by event type if needed
- **Files:** `src/components/SettingIndicator.astro`
- **Tests:** E2E tests for settings changes
- **Commit:** `refactor: SettingIndicator uses unified event`

### Task 4.4: Update auto-compliance to dispatch unified event

- [ ] Replace compliance-updated with rto:state-changed
- [ ] Include compliance data in payload
- **Files:** `src/lib/auto-compliance.ts`
- **Tests:** E2E tests for compliance updates
- **Commit:** `refactor: auto-compliance dispatches unified event`

### Task 4.5: Update settings-modal to dispatch unified event

- [ ] Replace settings-changed with rto:state-changed
- [ ] Include settings data in payload
- **Files:** `src/scripts/settings-modal.ts`
- **Tests:** E2E tests for settings changes
- **Commit:** `refactor: settings-modal dispatches unified event`

### Task 4.6: Update all components to use unified event

- [ ] StatusDetails listens to rto:state-changed
- [ ] WindowBreakdown listens to rto:state-changed
- [ ] WeekSummary listens to rto:state-changed
- **Files:** `src/components/*.astro`
- **Tests:** Full E2E suite
- **Commit:** `refactor: all components use unified event`

### Task 4.7: Remove old event types

- [ ] Remove settings-changed constant
- [ ] Remove compliance-updated constant
- [ ] Remove rto:config-changed constant
- **Files:** Multiple
- **Tests:** Full test suite
- **Commit:** `refactor: remove deprecated event types`

---

## Phase 5: Remove Inline JavaScript

### Task 5.1: Create status-details.ts module

- [ ] Extract updateStats function
- [ ] Extract renderWindowBreakdown function
- [ ] Add TypeScript types
- **Files:** `src/scripts/status-details.ts` (NEW)
- **Tests:** Unit tests for extracted functions
- **Commit:** `refactor: extract StatusDetails logic to module`

### Task 5.2: Create StatusDetailsController class

- [ ] Create controller class
- [ ] Initialize in module
- [ ] Export for use in Astro
- **Files:** `src/scripts/status-details.ts`
- **Tests:** Unit tests for controller
- **Commit:** `refactor: add StatusDetailsController class`

### Task 5.3: Use controller in StatusDetails.astro

- [ ] Import controller
- [ ] Remove inline script
- [ ] Call controller methods
- **Files:** `src/components/StatusDetails.astro`
- **Tests:** E2E tests for status details
- **Commit:** `refactor: use StatusDetailsController in component`

---

## Phase 6: Final Verification

### Task 6.1: Run full test suite

- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Build succeeds
- **Commit:** (verification only)

### Task 6.2: Manual verification

- [ ] Settings changes update UI
- [ ] Calendar changes update UI
- [ ] All SettingIndicators work
- [ ] Window breakdown updates
- [ ] Compliance message updates
- **Commit:** (verification only)

---

## Notes

- Each task should be committed independently
- Run tests after each task
- If tests fail, fix before moving to next task
- Tasks within a phase can sometimes be combined if small enough
