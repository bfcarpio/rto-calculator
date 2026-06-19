/**
 * Settings Store
 *
 * Nanostore-based settings management with automatic localStorage sync.
 * Replaces the legacy localStorage-based settings-reader module.
 */

import { persistentAtom } from "@nanostores/persistent";
import {
	type AppSettings,
	DEFAULTS,
	SETTINGS_KEY,
} from "../settings-constants";

// AppSettings is a plain object with primitive values — safe for JSON serialization.
// persistentAtom handles localStorage sync automatically.
// Uses the same localStorage key as the legacy settings-reader for data continuity.
export const settingsStore = persistentAtom<AppSettings>(
	SETTINGS_KEY,
	DEFAULTS,
	{
		encode: JSON.stringify,
		decode: (raw: string): AppSettings => {
			try {
				const parsed = JSON.parse(raw);
				return { ...DEFAULTS, ...parsed };
			} catch {
				return DEFAULTS;
			}
		},
	},
);

/**
 * Subscribe to settings changes.
 * Returns an unsubscribe function.
 */
export function onSettingsChange(
	callback: (settings: AppSettings) => void,
): () => void {
	return settingsStore.subscribe(callback);
}
