const DEBUG_KEY = "rto-calculator-debug";

let isDebugEnabled = localStorage.getItem(DEBUG_KEY) === "true";

/**
 * Enable or disable debug logging
 * @param enabled - Whether to enable debug mode
 */
export function setDebugEnabled(enabled: boolean): void {
	isDebugEnabled = enabled;
	localStorage.setItem(DEBUG_KEY, String(enabled));
}

/**
 * Get current debug mode state
 * @returns True if debug mode is enabled
 */
export function getDebugEnabled(): boolean {
	return isDebugEnabled;
}

/**
 * Log message to console if debug mode is enabled
 * @param args - Arguments to log
 */
export function debugLog(...args: unknown[]): void {
	if (isDebugEnabled) {
		console.log(...args);
	}
}

/**
 * Log warning to console if debug mode is enabled
 * @param args - Arguments to log as warning
 */
export function debugWarn(...args: unknown[]): void {
	if (isDebugEnabled) {
		console.warn(...args);
	}
}

/**
 * Log error to console if debug mode is enabled
 * @param args - Arguments to log as error
 */
export function debugError(...args: unknown[]): void {
	if (isDebugEnabled) {
		console.error(...args);
	}
}

/**
 * Log info to console if debug mode is enabled
 * @param args - Arguments to log as info
 */
export function debugInfo(...args: unknown[]): void {
	if (isDebugEnabled) {
		console.info(...args);
	}
}
