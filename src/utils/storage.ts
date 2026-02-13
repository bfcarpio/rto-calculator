/**
 * localStorage utility functions for RTO Calculator
 * Handles data persistence for calendar state and user preferences
 */

import type { CalendarState, UserPreferences } from "../types";

const STORAGE_KEYS = {
  SELECTED_DATES: "rto-calculator-selected-dates",
  USER_PREFERENCES: "rto-calculator-user-preferences",
  LAST_UPDATED: "rto-calculator-last-updated",
};

/**
 * Save selected dates to localStorage
 * @param selectedDates - Set of selected date strings with selection type (format: "YYYY-MM-DD:type")
 */
export function saveSelectedDates(selectedDates: Set<string>): void {
  try {
    const state: CalendarState = {
      selectedDates: Array.from(selectedDates),
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.SELECTED_DATES, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving selected dates to localStorage:", error);
  }
}

/**
 * Load selected dates from localStorage
 * @returns Set of selected date strings with selection type (format: "YYYY-MM-DD:type")
 */
export function loadSelectedDates(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_DATES);
    if (stored) {
      const state: CalendarState = JSON.parse(stored);
      return new Set(state.selectedDates);
    }
  } catch (error) {
    console.error("Error loading selected dates from localStorage:", error);
  }
  return new Set();
}

/**
 * Save user preferences to localStorage
 * @param preferences - User preferences object
 */
export function saveUserPreferences(preferences: UserPreferences): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.USER_PREFERENCES,
      JSON.stringify(preferences),
    );
  } catch (error) {
    console.error("Error saving user preferences to localStorage:", error);
  }
}

/**
 * Load user preferences from localStorage
 * @returns User preferences object or default preferences
 */
export function loadUserPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading user preferences from localStorage:", error);
  }

  // Return default preferences
  return {
    theme: "light",
    colorScheme: "default",
    language: "en",
    timezone: "UTC",
    firstDayOfWeek: 1,
    defaultPattern: null,
  };
}

/**
 * Clear all RTO Calculator data from localStorage
 */
export function clearAllData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_DATES);
    localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
    localStorage.removeItem(STORAGE_KEYS.LAST_UPDATED);
  } catch (error) {
    console.error("Error clearing data from localStorage:", error);
  }
}

/**
 * Clear only selected dates from localStorage
 */
export function clearSelectedDates(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_DATES);
  } catch (error) {
    console.error("Error clearing selected dates from localStorage:", error);
  }
}

/**
 * Get the last update timestamp
 * @returns ISO string of last update or null
 */
export function getLastUpdated(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_DATES);
    if (stored) {
      const state: CalendarState = JSON.parse(stored);
      return state.lastUpdated;
    }
  } catch (error) {
    console.error("Error getting last updated timestamp:", error);
  }
  return null;
}

/**
 * Check if localStorage is available
 * @returns true if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get storage usage information
 * @returns Object with storage usage details
 */
export function getStorageInfo(): {
  used: number;
  available: number;
  percentage: number;
} {
  try {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }

    // Estimate available space (typically 5-10MB)
    const available = 5 * 1024 * 1024; // 5MB
    const percentage = (total / available) * 100;

    return {
      used: total,
      available,
      percentage,
    };
  } catch (error) {
    console.error("Error getting storage info:", error);
    return { used: 0, available: 0, percentage: 0 };
  }
}

/**
 * Export data as JSON for backup
 * @returns JSON string of all stored data
 */
export function exportData(): string {
  try {
    const selectedDatesSet = loadSelectedDates();

    // Convert Set of "YYYY-MM-DD:type" strings to Map
    const selectedDatesMap = new Map<string, string>();
    selectedDatesSet.forEach((item) => {
      const [date, type] = item.split(":");
      if (date && type) {
        selectedDatesMap.set(date, type);
      }
    });

    const data = {
      selectedDates: selectedDatesMap,
      preferences: loadUserPreferences(),
      lastUpdated: getLastUpdated(),
      exportDate: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error("Error exporting data:", error);
    return "{}";
  }
}

/**
 * Import data from JSON backup
 * @param jsonData - JSON string of exported data
 * @returns true if import was successful
 */
export function importData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);

    if (data.selectedDates) {
      // Convert Map back to Set of "YYYY-MM-DD:type" strings
      const selectedDatesSet = new Set<string>();

      if (data.selectedDates instanceof Map) {
        data.selectedDates.forEach((type: string, date: string) => {
          selectedDatesSet.add(`${date}:${type}`);
        });
      } else if (typeof data.selectedDates === "object") {
        // Handle plain object
        Object.entries(data.selectedDates).forEach(([date, type]) => {
          selectedDatesSet.add(`${date}:${type}`);
        });
      }

      saveSelectedDates(selectedDatesSet);
    }

    if (data.preferences) {
      saveUserPreferences(data.preferences);
    }

    return true;
  } catch (error) {
    console.error("Error importing data:", error);
    return false;
  }
}
