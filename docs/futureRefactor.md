# Future Refactoring Opportunities

This document captures larger refactoring ideas that would improve the codebase but are not immediately necessary for the settings-reactive UI work.

## 1. Extract WindowBreakdown Component

**Current State:**

- Window breakdown rendering is embedded in StatusDetails.astro
- `renderWindowBreakdown()` function mixes with other update logic

**Proposed:**

- Create `src/components/WindowBreakdown.astro`
- Accept props: `windows` array, `policy` config
- Subscribe to `compliance-updated` event for updates
- Use SettingIndicator for rolling window size

**Benefits:**

- Smaller StatusDetails component
- Easier to test in isolation
- Reusable in other contexts

---

## 2. Extract WeekSummary Component

**Current State:**

- Week summary box is inline HTML in StatusDetails.astro

**Proposed:**

- Create `src/components/WeekSummary.astro`
- Accept props: `currentWeek` data
- Subscribe to compliance updates

**Benefits:**

- Smaller StatusDetails
- Clearer component boundaries
- Easier to test

---

## 3. Consolidate Event System

**Current State:**

- `settings-changed` - Settings saved
- `rto:config-changed` - ValidationManager config update
- `compliance-updated` - Auto-compliance recalculated
- `rto-selection-changed` - Calendar selection changed
- `calendar-loaded` - Calendar ready

**Problems:**

- Multiple event types for similar purposes
- Hard to trace data flow
- Components subscribe to different events

**Proposed:**

- Single `rto-state-changed` event with typed payloads
- Central state manager (extend ValidationManager)
- All components subscribe to single source

**Benefits:**

- Single source of truth
- Easier debugging
- Predictable data flow

---

## 4. Centralize State in ValidationManager

**Current State:**

- State scattered across ValidationManager, auto-compliance, settings-modal
- Components directly access localStorage
- Mixed concerns in state management

**Proposed:**

- ValidationManager becomes single state store
- All reads/writes go through ValidationManager
- Components subscribe to ValidationManager events only

**Benefits:**

- Single source of truth
- Easier to test state changes
- Clear data ownership

---

## 5. Remove Inline JavaScript from Astro Components

**Current State:**

- StatusDetails.astro has ~100 lines of inline JavaScript
- Direct DOM manipulation via `getElementById`

**Proposed:**

- Extract to separate TypeScript modules
- Use custom elements or framework (Preact/Vue)
- Subscribe to events instead of direct DOM access

**Benefits:**

- Better testability
- Cleaner component files
- Type safety

---

## 6. Type-Safe Event System

**Current State:**

- CustomEvent with `any` typed detail
- No compile-time checking of event payloads

**Proposed:**

- Typed event emitter pattern
- Event payload interfaces
- Factory functions for creating events

**Benefits:**

- Compile-time safety
- Better IDE support
- Self-documenting events

---

## Priority Order

1. **High** - Consolidate Event System (simplifies all other work)
2. **Medium** - Extract WindowBreakdown and WeekSummary components
3. **Medium** - Remove inline JavaScript
4. **Low** - Centralize state in ValidationManager
5. **Low** - Type-safe event system

---

## When to Consider These Refactors

- **Before adding new features** - Reduce complexity first
- **When fixing bugs in state flow** - Consolidate event system
- **When tests become hard to write** - Extract components
- **When onboarding new developers** - Simplify architecture
