const DEBUG_STORAGE_KEY = "rto-calculator-debug";
const WINDOW_DEBUG_FLAG = "__RTO_DEBUG";

type LogArgs = readonly unknown[];

const getEnvDebugFlag = (): boolean | undefined => {
	try {
		const env = (import.meta as { env?: Record<string, unknown> }).env;
		if (!env) return undefined;

		const envFlag = env.PUBLIC_DEBUG ?? env.PUBLIC_RTO_DEBUG ?? env.DEBUG;
		if (envFlag === undefined) return undefined;

		if (typeof envFlag === "string") {
			return envFlag.toLowerCase() === "true";
		}

		return Boolean(envFlag);
	} catch (error) {
		void error;
		return undefined;
	}
};

const getWindowDebugFlag = (): boolean | undefined => {
	if (typeof window === "undefined") return undefined;
	const flag = (window as unknown as Record<string, unknown>)[
		WINDOW_DEBUG_FLAG
	];
	return typeof flag === "boolean" ? flag : undefined;
};

const getStoredDebugFlag = (): boolean | undefined => {
	if (typeof localStorage === "undefined") return undefined;
	const value = localStorage.getItem(DEBUG_STORAGE_KEY);
	return value === null ? undefined : value === "true";
};

let runtimeDebugOverride: boolean | undefined;

/**
 * Determine whether debug logging is enabled.
 *
 * Priority: runtime override (setDebugEnabled) → window.__RTO_DEBUG →
 * persisted localStorage flag → PUBLIC_DEBUG env → default false.
 */
export const isDebugEnabled = (): boolean => {
	const overrideFlag = runtimeDebugOverride;
	if (overrideFlag !== undefined) return overrideFlag;

	const windowFlag = getWindowDebugFlag();
	if (windowFlag !== undefined) return windowFlag;

	const storedFlag = getStoredDebugFlag();
	if (storedFlag !== undefined) return storedFlag;

	const envFlag = getEnvDebugFlag();
	if (envFlag !== undefined) return envFlag;

	return false;
};

/**
 * Set debug flag for current session and persist to localStorage.
 */
export const setDebugEnabled = (enabled: boolean): void => {
	runtimeDebugOverride = enabled;

	if (typeof window !== "undefined") {
		(window as unknown as Record<string, unknown>)[WINDOW_DEBUG_FLAG] = enabled;
	}

	if (typeof localStorage !== "undefined") {
		localStorage.setItem(DEBUG_STORAGE_KEY, String(enabled));
	}
};

const shouldLogVerbose = (): boolean => isDebugEnabled();

const logDebug = (...args: LogArgs): void => {
	if (!shouldLogVerbose()) return;
	console.debug(...args);
};

const logInfo = (...args: LogArgs): void => {
	if (!shouldLogVerbose()) return;
	console.info(...args);
};

const logWarn = (...args: LogArgs): void => {
	console.warn(...args);
};

const logError = (...args: LogArgs): void => {
	console.error(...args);
};

export const logger = {
	debug: logDebug,
	info: logInfo,
	warn: logWarn,
	error: logError,
};

export type Logger = typeof logger;
