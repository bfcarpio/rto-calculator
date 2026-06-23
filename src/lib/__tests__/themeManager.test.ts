import { beforeEach, describe, expect, it, vi } from "vitest";
import * as storage from "../../utils/storage";
import { ThemeManager } from "../themeManager";

vi.mock("../../utils/storage", () => ({
	loadColorScheme: vi.fn(() => null),
	saveColorScheme: vi.fn(),
}));

vi.mock("../../utils/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

const mockedLoadColorScheme = vi.mocked(storage.loadColorScheme);
const mockedSaveColorScheme = vi.mocked(storage.saveColorScheme);

function createMockMediaQuery(matches: boolean): MediaQueryList {
	return {
		matches,
		media: "(prefers-color-scheme: dark)",
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	} as unknown as MediaQueryList;
}

// Ensure matchMedia exists on window before spying (jsdom doesn't provide it)
if (!window.matchMedia) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockReturnValue({
			matches: false,
			media: "(prefers-color-scheme: dark)",
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}),
	});
}

describe("ThemeManager", () => {
	let manager: ThemeManager;
	let mockMediaQuery: MediaQueryList;

	beforeEach(() => {
		vi.resetAllMocks();
		// Re-apply default mock implementations after reset
		mockedLoadColorScheme.mockReturnValue(null);
		document.body.className = "";
		document.body.removeAttribute("data-palette");

		mockMediaQuery = createMockMediaQuery(false);
		vi.spyOn(window, "matchMedia").mockReturnValue(mockMediaQuery);

		manager = new ThemeManager();
	});

	describe("constructor", () => {
		it("should default to system theme with tol-muted-light color scheme", () => {
			const state = manager.getState();
			expect(state.currentTheme).toBe("system");
			expect(state.colorScheme).toBe("tol-muted-light");
			expect(state.isDarkMode).toBe(false);
		});

		it("should detect dark mode from saved color scheme ending in -dark", () => {
			mockedLoadColorScheme.mockReturnValue("tol-muted-dark");

			const darkManager = new ThemeManager();
			expect(darkManager.isDarkMode()).toBe(true);
		});

		it("should fall back to default when saved scheme is invalid", () => {
			mockedLoadColorScheme.mockReturnValue("invalid-scheme");

			const invalidManager = new ThemeManager();
			expect(invalidManager.getColorScheme()).toBe("tol-muted-light");
		});
	});

	describe("initialize", () => {
		it("should apply dark-mode classes when dark mode is active", () => {
			mockedLoadColorScheme.mockReturnValue("tol-muted-dark");

			const darkManager = new ThemeManager();
			darkManager.initialize();

			expect(document.body.classList.contains("dark-mode")).toBe(true);
			expect(document.body.classList.contains("datepainter-dark-mode")).toBe(
				true,
			);
		});

		it("should remove dark-mode classes when light mode is active", () => {
			document.body.classList.add("dark-mode");
			manager.initialize();

			expect(document.body.classList.contains("dark-mode")).toBe(false);
		});

		it("should set data-palette attribute from color scheme", () => {
			manager.initialize();
			expect(document.body.getAttribute("data-palette")).toBe("tol-muted");
		});

		it("should set up system preference listener", () => {
			manager.initialize();
			expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith(
				"change",
				expect.any(Function),
			);
		});
	});

	describe("cycleTheme", () => {
		it("should cycle through system → light → dark → system themes", () => {
			expect(manager.getCurrentTheme()).toBe("system");

			manager.cycleTheme();
			expect(manager.getCurrentTheme()).toBe("light");

			manager.cycleTheme();
			expect(manager.getCurrentTheme()).toBe("dark");

			manager.cycleTheme();
			expect(manager.getCurrentTheme()).toBe("system");
		});

		it("should update isDarkMode when cycling themes", () => {
			manager.cycleTheme(); // → light
			expect(manager.isDarkMode()).toBe(false);

			manager.cycleTheme(); // → dark
			expect(manager.isDarkMode()).toBe(true);

			// System depends on mock, which returns false
			manager.cycleTheme(); // → system
			expect(manager.isDarkMode()).toBe(false);
		});

		it("should save color scheme to localStorage on cycle", () => {
			manager.cycleTheme();
			expect(mockedSaveColorScheme).toHaveBeenCalled();
		});

		it("should notify listeners on cycle", () => {
			const listener = vi.fn();
			manager.subscribe(listener);

			manager.cycleTheme();
			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({ currentTheme: "light" }),
			);
		});
	});

	describe("setTheme", () => {
		it("should set light theme and update color scheme suffix", () => {
			manager.setTheme("light");
			expect(manager.getCurrentTheme()).toBe("light");
			expect(manager.isDarkMode()).toBe(false);
			expect(manager.getColorScheme()).toBe("tol-muted-light");
		});

		it("should set dark theme and update color scheme suffix", () => {
			manager.setTheme("dark");
			expect(manager.getCurrentTheme()).toBe("dark");
			expect(manager.isDarkMode()).toBe(true);
			expect(manager.getColorScheme()).toBe("tol-muted-dark");
		});

		it("should throw for invalid theme mode", () => {
			expect(() => manager.setTheme("invalid" as never)).toThrow(
				"Invalid theme mode",
			);
		});

		it("should notify listeners on setTheme", () => {
			const listener = vi.fn();
			manager.subscribe(listener);

			manager.setTheme("dark");
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					currentTheme: "dark",
					isDarkMode: true,
				}),
			);
		});
	});

	describe("setColorScheme", () => {
		it("should set light color scheme and update isDarkMode", () => {
			manager.setColorScheme("tol-vibrant-light");
			expect(manager.getColorScheme()).toBe("tol-vibrant-light");
			expect(manager.isDarkMode()).toBe(false);
		});

		it("should set dark color scheme and update isDarkMode", () => {
			manager.setColorScheme("tol-bright-dark");
			expect(manager.getColorScheme()).toBe("tol-bright-dark");
			expect(manager.isDarkMode()).toBe(true);
		});

		it("should save color scheme to localStorage", () => {
			manager.setColorScheme("tol-vibrant-dark");
			expect(mockedSaveColorScheme).toHaveBeenCalledWith("tol-vibrant-dark");
		});

		it("should apply palette attribute", () => {
			manager.setColorScheme("tol-bright-light");
			expect(document.body.getAttribute("data-palette")).toBe("tol-bright");
		});

		it("should notify listeners", () => {
			const listener = vi.fn();
			manager.subscribe(listener);

			manager.setColorScheme("tol-vibrant-dark");
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({ colorScheme: "tol-vibrant-dark" }),
			);
		});
	});

	describe("subscribe / notifyListeners", () => {
		it("should notify all listeners on state change", () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			manager.subscribe(listener1);
			manager.subscribe(listener2);

			manager.setTheme("dark");

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
		});

		it("should stop notifying after unsubscribe", () => {
			const listener = vi.fn();
			const unsubscribe = manager.subscribe(listener);

			manager.setTheme("dark");
			expect(listener).toHaveBeenCalledTimes(1);

			unsubscribe();
			manager.setTheme("light");
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it("should provide a state snapshot to listeners", () => {
			const listener = vi.fn();
			manager.subscribe(listener);

			manager.setTheme("dark");

			const snapshot = listener.mock.calls[0]?.[0];
			expect(snapshot).toEqual({
				currentTheme: "dark",
				isDarkMode: true,
				colorScheme: "tol-muted-dark",
			});
		});

		it("should not crash if a listener throws", () => {
			const badListener = vi.fn(() => {
				throw new Error("listener error");
			});
			const goodListener = vi.fn();

			manager.subscribe(badListener);
			manager.subscribe(goodListener);

			expect(() => manager.setTheme("dark")).not.toThrow();
			expect(goodListener).toHaveBeenCalledTimes(1);
		});
	});

	describe("system preference change", () => {
		function getSystemChangeHandler(): (e: MediaQueryListEvent) => void {
			manager.initialize();
			const calls = (
				mockMediaQuery.addEventListener as ReturnType<typeof vi.fn>
			).mock.calls;
			const handler = calls.find((c: unknown[]) => c[0] === "change")?.[1] as
				| ((e: MediaQueryListEvent) => void)
				| undefined;

			if (!handler) {
				throw new Error("System preference change handler not found");
			}
			return handler;
		}

		it("should update isDarkMode when system preference changes in system mode", () => {
			const changeHandler = getSystemChangeHandler();

			changeHandler({ matches: true } as MediaQueryListEvent);

			expect(manager.isDarkMode()).toBe(true);
		});

		it("should not update isDarkMode when not in system mode", () => {
			manager.setTheme("light");
			const changeHandler = getSystemChangeHandler();

			changeHandler({ matches: true } as MediaQueryListEvent);

			expect(manager.isDarkMode()).toBe(false);
		});
	});

	describe("destroy", () => {
		it("should remove system preference listener", () => {
			manager.initialize();
			manager.destroy();

			expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith(
				"change",
				expect.any(Function),
			);
		});

		it("should clear all listeners", () => {
			const listener = vi.fn();
			manager.subscribe(listener);

			manager.destroy();
			manager.setTheme("dark");

			expect(listener).not.toHaveBeenCalled();
		});
	});
});
