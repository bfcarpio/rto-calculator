/**
 * Settings toggle handler utilities
 *
 * Provides the shared boolean toggle pattern used by all settings toggle buttons.
 * Each toggle button uses aria-checked to track its state.
 *
 * @module settings-toggles
 */

import { logger } from "../utils/logger";

/**
 * Toggle a boolean setting by flipping its aria-checked attribute.
 *
 * Reads the current aria-checked value, flips it, persists the change,
 * and optionally calls a side-effect callback with the new state.
 *
 * @param element - The toggle button element (null = no-op)
 * @param settingName - Human-readable name for debug logging
 * @param sideEffect - Optional callback invoked with the new boolean state
 */
export function toggleBooleanSetting(
	element: HTMLButtonElement | null,
	settingName: string,
	sideEffect?: (newState: boolean) => void,
): void {
	if (!element) {
		return;
	}

	const currentState = element.getAttribute("aria-checked") === "true";
	const newState = !currentState;
	element.setAttribute("aria-checked", newState.toString());

	sideEffect?.(newState);

	logger.debug(
		`[Settings] ${settingName} ${newState ? "enabled" : "disabled"}`,
	);
}

/**
 * Read the current boolean state from a toggle button's aria-checked attribute.
 *
 * @param element - The toggle button element
 * @returns The current boolean state (defaults to false if element is null)
 */
export function readToggleState(element: HTMLButtonElement | null): boolean {
	if (!element) {
		return false;
	}
	return element.getAttribute("aria-checked") === "true";
}

/**
 * Set a toggle button's aria-checked state.
 *
 * @param element - The toggle button element
 * @param value - The new boolean state to set
 */
export function setToggleState(
	element: HTMLButtonElement | null,
	value: boolean,
): void {
	if (!element) {
		return;
	}
	element.setAttribute("aria-checked", value.toString());
}
