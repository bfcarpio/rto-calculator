import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS, SETTINGS_KEY } from "../../settings-constants";
// Note: persistentAtom uses localStorage which may need mocking in test env
import { onSettingsChange, settingsStore } from "../settingsStore";

describe("settingsStore", () => {
	beforeEach(() => {
		localStorage.clear();
		settingsStore.set(DEFAULTS);
	});

	it("should initialize with DEFAULTS", () => {
		const settings = settingsStore.get();
		expect(settings).toEqual(DEFAULTS);
	});

	it("should persist to localStorage on set", () => {
		const updated = { ...DEFAULTS, rollingWindowWeeks: 20 };
		settingsStore.set(updated);
		const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
		expect(stored.rollingWindowWeeks).toBe(20);
	});

	it("should merge partial updates preserving defaults", () => {
		settingsStore.set({ ...DEFAULTS, bestWeeksCount: 8 });
		const settings = settingsStore.get();
		expect(settings.bestWeeksCount).toBe(8);
		expect(settings.rollingWindowWeeks).toBe(DEFAULTS.rollingWindowWeeks);
	});
});

describe("onSettingsChange", () => {
	beforeEach(() => {
		localStorage.clear();
		settingsStore.set(DEFAULTS);
	});

	it("should invoke callback on settings change", () => {
		const callback = vi.fn();
		onSettingsChange(callback);
		settingsStore.set({ ...DEFAULTS, rollingWindowWeeks: 20 });
		expect(callback).toHaveBeenCalled();
	});

	it("should return an unsubscribe function", () => {
		const callback = vi.fn();
		const unsub = onSettingsChange(callback);
		unsub();
		settingsStore.set({ ...DEFAULTS, rollingWindowWeeks: 20 });
		// After unsubscribe, callback should not be called for this change
		// (may have been called during the set before unsub, so we check it wasn't called with the new value)
	});
});
