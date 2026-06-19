/**
 * Theme Manager - Handles System/Light/Dark theme cycling
 * In-memory only - theme resets on page refresh (matches data behavior)
 */

import { DEFAULT_COLOR_SCHEME, type UserPreferences } from "../types/index";
import { logger } from "../utils/logger";
import { loadColorScheme, saveColorScheme } from "../utils/storage";
import { isColorScheme } from "./type-guards";

export type ThemeMode = "system" | "light" | "dark";

export type ColorScheme = UserPreferences["colorScheme"];

interface ThemeManagerState {
	currentTheme: ThemeMode;
	isDarkMode: boolean;
	colorScheme: ColorScheme;
}

const THEME_CYCLE: ThemeMode[] = ["system", "light", "dark"];

function detectSystemDarkMode(): boolean {
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function calculateEffectiveTheme(mode: ThemeMode): boolean {
	if (mode === "system") {
		return detectSystemDarkMode();
	}
	return mode === "dark";
}

function applyThemeToDocument(isDark: boolean): void {
	if (isDark) {
		document.body.classList.add("dark-mode");
		document.body.classList.add("datepainter-dark-mode");
	} else {
		document.body.classList.remove("dark-mode");
		document.body.classList.remove("datepainter-dark-mode");
	}
}

export class ThemeManager {
	private state: ThemeManagerState;
	private listeners: Set<(state: ThemeManagerState) => void> = new Set();
	private mediaQuery: MediaQueryList | null = null;

	constructor() {
		// Try to get colorScheme from localStorage, default to tol-muted-light
		const savedScheme = loadColorScheme();
		const colorScheme =
			savedScheme && isColorScheme(savedScheme)
				? savedScheme
				: DEFAULT_COLOR_SCHEME;

		// Determine isDarkMode from colorScheme suffix
		const isDark = colorScheme.endsWith("-dark");

		this.state = {
			currentTheme: "system", // Legacy theme mode
			isDarkMode: isDark,
			colorScheme: colorScheme,
		};
	}

	initialize(): void {
		applyThemeToDocument(this.state.isDarkMode);
		this.applyPaletteAttribute(this.state.colorScheme);
		this.setupSystemPreferenceListener();
	}

	private setupSystemPreferenceListener(): void {
		this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		this.mediaQuery.addEventListener(
			"change",
			this.handleSystemPreferenceChange,
		);
	}

	private applyPaletteAttribute(colorScheme: ColorScheme): void {
		// Extract palette name (e.g., "tol-muted" from "tol-muted-dark")
		const palette = colorScheme.split("-").slice(0, 2).join("-");
		document.body.setAttribute("data-palette", palette);
	}

	private handleSystemPreferenceChange = (event: MediaQueryListEvent): void => {
		if (this.state.currentTheme === "system") {
			this.state = {
				...this.state,
				isDarkMode: event.matches,
			};
			applyThemeToDocument(event.matches);
			this.notifyListeners();
		}
	};

	cycleTheme(): void {
		const currentIndex = THEME_CYCLE.indexOf(this.state.currentTheme);
		const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
		const nextTheme = THEME_CYCLE[nextIndex];

		if (!nextTheme) {
			throw new Error(
				`Failed to cycle theme: no theme found at index ${nextIndex}`,
			);
		}

		this.state = {
			currentTheme: nextTheme,
			isDarkMode: calculateEffectiveTheme(nextTheme),
			colorScheme: this.state.colorScheme,
		};

		applyThemeToDocument(this.state.isDarkMode);

		// Save colorScheme to localStorage via storage utility
		saveColorScheme(this.state.colorScheme);

		this.notifyListeners();
	}

	setTheme(mode: ThemeMode): void {
		if (!THEME_CYCLE.includes(mode)) {
			throw new Error(
				`Invalid theme mode: ${mode}. Must be one of: ${THEME_CYCLE.join(", ")}`,
			);
		}

		// Determine isDarkMode from theme mode, then update colorScheme suffix
		const isDark = calculateEffectiveTheme(mode);

		// Update colorScheme with new dark/light suffix based on theme mode
		const basePalette = this.state.colorScheme.split("-").slice(0, 2).join("-");
		const candidateScheme = `${basePalette}-${isDark ? "dark" : "light"}`;
		const newColorScheme = isColorScheme(candidateScheme)
			? candidateScheme
			: DEFAULT_COLOR_SCHEME;

		this.state = {
			currentTheme: mode,
			isDarkMode: isDark,
			colorScheme: newColorScheme,
		};

		applyThemeToDocument(this.state.isDarkMode);
		this.applyPaletteAttribute(this.state.colorScheme);

		// Save to localStorage via storage utility
		saveColorScheme(this.state.colorScheme);

		this.notifyListeners();
	}

	getCurrentTheme(): ThemeMode {
		return this.state.currentTheme;
	}

	isDarkMode(): boolean {
		return this.state.isDarkMode;
	}

	getColorScheme(): ColorScheme {
		return this.state.colorScheme;
	}

	setColorScheme(colorScheme: ColorScheme): void {
		// Determine isDarkMode from the colorScheme suffix
		const isDark = colorScheme.endsWith("-dark");

		this.state = {
			...this.state,
			colorScheme: colorScheme,
			isDarkMode: isDark,
		};

		applyThemeToDocument(isDark);
		this.applyPaletteAttribute(colorScheme);

		// Save to localStorage via storage utility
		saveColorScheme(colorScheme);

		this.notifyListeners();
	}

	getState(): ThemeManagerState {
		return { ...this.state };
	}

	subscribe(callback: (state: ThemeManagerState) => void): () => void {
		this.listeners.add(callback);
		return () => {
			this.listeners.delete(callback);
		};
	}

	private notifyListeners(): void {
		const stateSnapshot = this.getState();
		this.listeners.forEach((callback) => {
			try {
				callback(stateSnapshot);
			} catch (error) {
				logger.error("ThemeManager listener error:", error);
			}
		});
	}

	destroy(): void {
		if (this.mediaQuery) {
			this.mediaQuery.removeEventListener(
				"change",
				this.handleSystemPreferenceChange,
			);
			this.mediaQuery = null;
		}
		this.listeners.clear();
	}
}

// Singleton instance
let globalThemeManager: ThemeManager | null = null;

export function getThemeManager(): ThemeManager {
	if (!globalThemeManager) {
		globalThemeManager = new ThemeManager();
	}
	return globalThemeManager;
}

export function initializeTheme(): void {
	const manager = getThemeManager();
	manager.initialize();
}

export function cycleTheme(): void {
	const manager = getThemeManager();
	manager.cycleTheme();
}

export function setTheme(mode: ThemeMode): void {
	const manager = getThemeManager();
	manager.setTheme(mode);
}

export function getCurrentTheme(): ThemeMode {
	const manager = getThemeManager();
	return manager.getCurrentTheme();
}

export function isDarkMode(): boolean {
	const manager = getThemeManager();
	return manager.isDarkMode();
}

export function setColorScheme(scheme: ColorScheme): void {
	const manager = getThemeManager();
	manager.setColorScheme(scheme);
}

export function getColorScheme(): ColorScheme {
	const manager = getThemeManager();
	return manager.getColorScheme();
}
