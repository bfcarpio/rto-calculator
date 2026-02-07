import type { CalendarConfig } from "../types";

/**
 * Validate calendar configuration
 * Throws descriptive errors for invalid configuration
 */
export function validateConfig(config: CalendarConfig): void {
  // Validate dateRange
  if (!config.dateRange.start || !config.dateRange.end) {
    throw new Error("dateRange must have both start and end dates");
  }

  if (config.dateRange.start > config.dateRange.end) {
    throw new Error("dateRange.end must be >= dateRange.start");
  }

  // Validate states
  const stateKeys = Object.keys(config.states);
  if (stateKeys.length === 0) {
    throw new Error("states must contain at least one state");
  }

  for (const key of stateKeys) {
    const state = config.states[key];
    if (!state) {
      throw new Error(`State '${key}' is undefined`);
    }
    if (!state.label || !state.color || !state.bgColor) {
      throw new Error(`State '${key}' missing required field (label, color, bgColor)`);
    }
  }

  // Validate styling
  if (config.styling?.cellSize !== undefined && config.styling.cellSize <= 0) {
    throw new Error("cellSize must be a positive number");
  }

  if (
    config.styling?.firstDayOfWeek !== undefined &&
    config.styling.firstDayOfWeek !== 0 &&
    config.styling.firstDayOfWeek !== 1
  ) {
    throw new Error("firstDayOfWeek must be 0 (Sunday) or 1 (Monday)");
  }
}
