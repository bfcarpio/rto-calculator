# Country Dropdown Fix Documentation

## Problem Description

The country holidays dropdown in the Settings Modal was only showing "None" instead of the full list of 200+ countries. Users could not select a country to enable holiday functionality.

## Root Cause

### Timing Issue

The issue was a **race condition** between two initialization processes:

1. **Holiday Data Loader** (`src/lib/holiday-data-loader.ts`)
   - Loads countries array from `src/lib/holiday-data/countries.ts`
   - Sorts countries alphabetically
   - Sets `window.__holidayCountries` global object
   - Auto-initializes on module import or DOMContentLoaded

2. **Settings Modal** (`src/components/SettingsModal.astro`)
   - Initializes immediately when component loads
   - Checks if `window.__holidayCountries` exists
   - If not found, logs warning but doesn't wait
   - Dropdown remains empty with only "None" option

### Module Load Order

The problem occurred because:

```
index.astro imports:
  ├─> SettingsModal.astro
  │     └─> Script executes immediately
  │          └─> Check window.__holidayCountries → NOT READY YET
  │          └─> Dropdown stays empty
  │
  └─> holiday-data-loader.ts (later)
        └─> initHolidayDataLoader()
             └─> Load countries
             └─> Set window.__holidayCountries
             └─> TOO LATE - SettingsModal already initialized
```

## Solution

### Event-Driven Architecture

Implemented an event-based communication pattern:

1. **Publisher (Holiday Data Loader)**
   - Dispatches `holiday-data-loaded` event when data is ready
   - Event includes countries array and timestamp
   - Runs immediately if data already available

2. **Subscriber (Settings Modal)**
   - Listens for `holiday-data-loaded` event
   - Populates dropdown when event fires
   - Falls back to immediate check if data already loaded

### Implementation Details

#### 1. Holiday Data Loader (`src/lib/holiday-data-loader.ts`)

```typescript
export function initHolidayDataLoader(): void {
  try {
    const sortedCountries = sortCountriesByName();
    (window as any).__holidayCountries = sortedCountries;
    (window as any).__getHolidayManager = getHolidayManager;

    // Dispatch event to notify components
    const event = new CustomEvent("holiday-data-loaded", {
      detail: {
        countries: sortedCountries,
        timestamp: Date.now(),
      },
    });
    window.dispatchEvent(event);
  } catch (error) {
    console.error("[HolidayDataLoader] Failed to load holiday data:", error);
  }
}
```

#### 2. Settings Modal (`src/components/SettingsModal.astro`)

```typescript
function initializeHolidaySettings(): void {
  if (countrySelect) {
    const populateDropdown = () => {
      if ((window as any).__holidayCountries) {
        populateCountryDropdown((window as any).__holidayCountries);
      } else {
        // Retry after 500ms
        setTimeout(() => {
          if ((window as any).__holidayCountries) {
            populateCountryDropdown((window as any).__holidayCountries);
          }
        }, 500);
      }
    };

    // Check if data is already loaded
    if ((window as any).__holidayCountries) {
      populateDropdown();
    } else {
      // Wait for holiday data to load
      window.addEventListener("holiday-data-loaded", populateDropdown, { once: true });
      
      // Fallback: Try again after 2 seconds if event never fires
      setTimeout(() => {
        if ((window as any).__holidayCountries) {
          populateCountryDropdown((window as any).__holidayCountries);
        }
      }, 2000);
    }
  }
}
```

## Key Features

### 1. Event-Driven Communication

- **Publisher-Subscriber Pattern**: Holiday data loader publishes event, SettingsModal subscribes
- **Decoupled**: Components don't need to know about each other
- **Scalable**: Multiple components can listen for the same event

### 2. Multiple Fallback Mechanisms

Three-tier fallback strategy ensures robustness:

1. **Immediate Check**: If data is already loaded, populate immediately
2. **Event Listener**: Wait for `holiday-data-loaded` event
3. **Timeout Retry**: After 2 seconds, check again as final fallback

### 3. Detailed Logging

Added comprehensive logging for debugging:

```typescript
// Holiday data loader
console.log("[HolidayDataLoader] Initializing holiday data loader...");
console.log(`[HolidayDataLoader] Loaded ${sortedCountries.length} countries`);
console.log("[HolidayDataLoader] ✓ Dispatched holiday-data-loaded event");

// Settings modal
console.log("[SettingsModal] Country dropdown found, checking for holiday data...");
console.log(`[SettingsModal] Holiday data already loaded, found X countries`);
console.log("[SettingsModal] populateCountryDropdown() called with X countries");
```

## Data Flow

### Happy Path (Data Loads First)

```
1. index.astro loads
   ↓
2. holiday-data-loader.ts imports and executes
   ↓
3. Countries loaded and sorted
   ↓
4. window.__holidayCountries set
   ↓
5. holiday-data-loaded event dispatched
   ↓
6. SettingsModal loads
   ↓
7. Check: window.__holidayCountries exists? YES
   ↓
8. populateDropdown() called
   ↓
9. Country dropdown populated with 200+ countries ✓
```

### Race Condition Path (SettingsModal Loads First)

```
1. index.astro loads
   ↓
2. SettingsModal loads and initializes
   ↓
3. Check: window.__holidayCountries exists? NO
   ↓
4. Register event listener for holiday-data-loaded
   ↓
5. holiday-data-loader.ts imports and executes (later)
   ↓
6. Countries loaded and sorted
   ↓
7. window.__holidayCountries set
   ↓
8. holiday-data-loaded event dispatched
   ↓
9. Event listener triggers populateDropdown()
   ↓
10. Country dropdown populated with 200+ countries ✓
```

## Files Modified

### 1. `src/lib/holiday-data-loader.ts`
- Added event dispatching when holiday data loads
- Enhanced logging for debugging
- Improved error handling

### 2. `src/lib/holiday-data/countries.ts`
- Added logging to `sortCountriesByName()` function
- Verifies countries array is not empty
- Shows first and last countries for verification

### 3. `src/components/SettingsModal.astro`
- Updated `initializeHolidaySettings()` to use event-driven approach
- Added multiple fallback mechanisms
- Added comprehensive logging
- Implemented retry logic

### 4. `src/pages/index.astro`
- Cleaned up script imports (removed invalid references)
- Ensured holiday data loader imports are at the top

### 5. `src/lib/holiday-data-sources/HolidayDataSourceStrategy.js`
- Fixed ES module export (changed from CommonJS to ES default export)
- Resolved build errors

## Verification

### Build Check

```bash
npm run build
```

**Expected Output:**
```
✓ build Complete!
```

### Runtime Check

1. Open browser console
2. Look for these log messages:

```
[HolidayDataLoader] Initializing holiday data loader...
[Countries] sortCountriesByName: COUNTRIES array length = 204
[Countries] First 3 countries: 🇦🇩 Andorra, 🇦🇱 Albania, 🇦🇲 Armenia...
[HolidayDataLoader] ✓ Successfully loaded 204 countries and holiday manager onto window
[HolidayDataLoader] ✓ Dispatched holiday-data-loaded event

[SettingsModal] Initializing holiday settings...
[SettingsModal] Holiday data already loaded, found 204 countries
[SettingsModal] populateCountryDropdown() called with 204 countries
[SettingsModal] Sorted 204 countries, first is "Andorra", last is "Zimbabwe"
```

### UI Check

1. Open the application
2. Click Settings button
3. Find "Country Holidays" dropdown
4. **Expected:** Dropdown shows 200+ countries starting with "🇦🇩 Andorra"
5. Scroll to bottom - should end with "🇿🇼 Zimbabwe"

## Troubleshooting

### Issue: Dropdown still shows only "None"

**Check 1: Verify holiday data is loading**
```javascript
// In browser console
console.log(window.__holidayCountries);
// Expected: Array of 204+ country objects
```

**Check 2: Verify event is dispatching**
```javascript
// In browser console
window.addEventListener('holiday-data-loaded', (e) => {
  console.log('Event received!', e.detail);
});
```

**Check 3: Check console for errors**
- Look for errors in holiday-data-loader.ts
- Check if countries.ts array is empty
- Verify no module import errors

### Issue: Event never fires

**Symptoms:**
- "Waiting for holiday-data-loaded event" logged
- No "Country dropdown populated" message
- 2-second timeout fallback might trigger

**Solutions:**
1. Check if `holiday-data-loader.ts` is imported in index.astro
2. Verify `initHolidayDataLoader()` is called
3. Check for JavaScript errors preventing execution

### Issue: Countries load but dropdown remains empty

**Symptoms:**
- 204 countries logged as loaded
- `window.__holidayCountries` has data
- UI dropdown still shows only "None"

**Solutions:**
1. Verify `countrySelect` element exists in DOM
2. Check if dropdown element has correct ID (`country-select`)
3. Look for CSS hiding the dropdown options
4. Check if JavaScript error occurs in `populateCountryDropdown()`

## Performance Considerations

### Event Overhead

- **Minimal**: Event dispatching is a lightweight operation
- **One-time**: Event fires only once per page load
- **No Polling**: No interval-based checking

### Memory

- **Shared**: Single `window.__holidayCountries` object
- **Reference**: Components store reference, not copy
- **Cleanup**: Event listeners use `{ once: true }` to auto-remove

### Load Time Impact

- **Negligible**: Countries array is ~20KB (204 objects × ~100 bytes)
- **Cached**: Loaded once and reused
- **Sorted**: Pre-sorted alphabetically in holiday-data-loader

## Future Improvements

### 1. TypeScript Interfaces

Add proper types for global window object:

```typescript
declare global {
  interface Window {
    __holidayCountries?: Country[];
    __getHolidayManager?: typeof getHolidayManager;
  }
}
```

### 2. State Management

Consider using a state management library like Zustand:

```typescript
const useHolidayStore = create((set) => ({
  countries: [],
  setCountries: (countries) => set({ countries }),
}));

// Components subscribe to changes
const countries = useHolidayStore((state) => state.countries);
```

### 3. Lazy Loading

Load countries only when SettingsModal is opened:

```typescript
// Only load when needed
settingsButton.addEventListener('click', async () => {
  if (!window.__holidayCountries) {
    await loadHolidayData();
  }
  openSettingsModal();
});
```

### 4. Caching Strategy

Implement IndexedDB for offline caching:

```typescript
async function loadCountries() {
  // Check cache first
  const cached = await getCachedCountries();
  if (cached) {
    return cached;
  }
  
  // Load fresh data
  const countries = await fetchCountries();
  await cacheCountries(countries);
  return countries;
}
```

## Conclusion

The country dropdown fix successfully resolves the timing issue between holiday data loader and Settings Modal initialization by:

✅ **Event-driven architecture** - Decoupled communication between components
✅ **Multiple fallbacks** - Three-tier retry strategy for robustness
✅ **Comprehensive logging** - Easy debugging and verification
✅ **Minimal performance impact** - One-time event dispatch
✅ **Maintainable code** - Clear separation of concerns

The dropdown now reliably shows all 204 countries, allowing users to select their country and enable holiday functionality in the RTO Calculator.