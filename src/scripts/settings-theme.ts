/**
 * Theme and color scheme management for settings
 *
 * Handles color scheme selection and persistence.
 * Integrates with the themeManager module for applying theme changes.
 *
 * @module settings-theme
 */

import { settingsStore } from "../lib/stores/settingsStore";
import { getColorScheme, setColorScheme } from "../lib/themeManager";

/**
 * Valid color scheme identifiers matching the available themes
 */
export type ColorScheme =
	| "tol-bright-light"
	| "tol-bright-dark"
	| "tol-vibrant-light"
	| "tol-vibrant-dark"
	| "tol-muted-light"
	| "tol-muted-dark";

/**
 * Applies the selected color scheme and persists the setting.
 *
 * @param colorSchemeValue - The color scheme identifier to apply
 */
export function applyColorSchemeChange(colorSchemeValue: string): void {
	const validSchemes: string[] = [
		"tol-bright-light",
		"tol-bright-dark",
		"tol-vibrant-light",
		"tol-vibrant-dark",
		"tol-muted-light",
		"tol-muted-dark",
	];

	if (!validSchemes.includes(colorSchemeValue)) {
		return;
	}

	setColorScheme(colorSchemeValue as ColorScheme);

	// Persist the color scheme in settings store
	settingsStore.set({
		...settingsStore.get(),
	});
}

/**
 * Synchronizes a color scheme dropdown element with the current theme.
 *
 * @param selectElement - The color scheme select dropdown element
 */
export function syncColorSchemeSelect(
	selectElement: HTMLSelectElement | null,
): void {
	if (!selectElement) {
		return;
	}

	selectElement.value = getColorScheme();
}
