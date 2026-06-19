/**
 * Type guard functions for safer type narrowing
 *
 * Replaces unsafe `as` casts with runtime-checked type guards that
 * follow the Parse, Don't Validate principle — data is verified at
 * the boundary, then trusted internally.
 *
 * @module type-guards
 */

import type { CompanyFilters } from "./holiday/holiday-data";
import type { ColorScheme } from "./themeManager";

// ─── DOM Type Guards ────────────────────────────────────────────────

/**
 * Type guard: checks if a value is an HTMLElement
 *
 * Use instead of `as HTMLElement` casts from `querySelector()` results.
 * Returns `false` for null/undefined and non-HTMLElement nodes.
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
	return value instanceof HTMLElement;
}

/**
 * Type guard: checks if a value is a non-null Element
 *
 * Use when you need Element methods (classList, etc.) but not
 * HTMLElement-specific properties.
 */
export function isElement(value: unknown): value is Element {
	return value instanceof Element;
}

// ─── Data Type Guards ───────────────────────────────────────────────

/**
 * Type guard: validates that an unknown value is CompanyFilters
 *
 * Checks that the value is a non-null object with string-valued
 * entries (country codes mapping to company filter data).
 */
export function isCompanyFilters(value: unknown): value is CompanyFilters {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	// CompanyFilters has country-code keys mapping to objects with .companies
	const record = value as Record<string, unknown>;
	for (const val of Object.values(record)) {
		if (typeof val !== "object" || val === null) {
			return false;
		}
	}

	return true;
}

/**
 * Valid color scheme suffixes for constructing ColorScheme values
 */
const COLOR_SCHEME_SUFFIXES = ["-light", "-dark"] as const;

/**
 * Type guard: validates that a string is a valid ColorScheme
 *
 * A valid ColorScheme ends with "-light" or "-dark" and matches
 * the pattern `{palette}-{theme}`.
 */
export function isColorScheme(value: unknown): value is ColorScheme {
	if (typeof value !== "string") {
		return false;
	}

	return COLOR_SCHEME_SUFFIXES.some((suffix) => value.endsWith(suffix));
}
