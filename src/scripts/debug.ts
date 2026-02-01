const DEBUG_KEY = "rto-calculator-debug";

let isDebugEnabled = localStorage.getItem(DEBUG_KEY) === "true";

export function setDebugEnabled(enabled: boolean): void {
	isDebugEnabled = enabled;
	localStorage.setItem(DEBUG_KEY, String(enabled));
}

export function getDebugEnabled(): boolean {
	return isDebugEnabled;
}

export function debugLog(...args: unknown[]): void {
	if (isDebugEnabled) {
		console.log(...args);
	}
}

export function debugWarn(...args: unknown[]): void {
	if (isDebugEnabled) {
		console.warn(...args);
	}
}

export function debugError(...args: unknown[]): void {
	if (isDebugEnabled) {
		console.error(...args);
	}
}

export function debugInfo(...args: unknown[]): void {
	if (isDebugEnabled) {
		console.info(...args);
	}
}
