/**
 * Strategies Module
 *
 * This module exports all validation and data source strategies used in the RTO calculator.
 * It provides a centralized location for importing strategy implementations.
 *
 * @module strategies
 */

// Export validation strategies
export { default as RollingPeriodValidation } from "../lib/validation/RollingPeriodValidation.js";

// Re-export holiday data sources
export * from "./holiday-data-sources/index.js";

// Export a convenience function to get all available validation strategies
export function getValidationStrategies() {
  return {
    rollingPeriod: RollingPeriodValidation,
  };
}

// Export a convenience function to get all available strategies (validation + data sources)
export function getAllStrategies() {
  return {
    validation: getValidationStrategies(),
    holidayDataSources: {
      default: "nager-date",
      available: ["nager-date"],
    },
  };
}

// Create a map of strategy name to strategy class for easy lookup
export const STRATEGY_REGISTRY = {
  "rolling-period": RollingPeriodValidation,
};

// Get a strategy by name
export function getStrategy(name) {
  return STRATEGY_REGISTRY[name];
}

// Check if a strategy exists
export function hasStrategy(name) {
  return name in STRATEGY_REGISTRY;
}

// Get the default validation strategy
export function getDefaultValidationStrategy() {
  return RollingPeriodValidation;
}
