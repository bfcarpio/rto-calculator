/**
 * Theme Manager - Handles System/Light/Dark theme cycling
 * In-memory only - theme resets on page refresh (matches data behavior)
 */

export type ThemeMode = "system" | "light" | "dark";

interface ThemeManagerState {
	currentTheme: ThemeMode;
	isDarkMode: boolean;
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
	} else {
		document.body.classList.remove("dark-mode");
	}
}

export class ThemeManager {
	private state: ThemeManagerState;
	private listeners: Set<(state: ThemeManagerState) => void> = new Set();
	private mediaQuery: MediaQueryList | null = null;

	constructor() {
		this.state = {
			currentTheme: "system",
			isDarkMode: detectSystemDarkMode(),
		};
	}

	initialize(): void {
		applyThemeToDocument(this.state.isDarkMode);
		this.setupSystemPreferenceListener();
	}

	private setupSystemPreferenceListener(): void {
		this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		this.mediaQuery.addEventListener(
			"change",
			this.handleSystemPreferenceChange,
		);
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
		};

		applyThemeToDocument(this.state.isDarkMode);
		this.notifyListeners();
	}

	setTheme(mode: ThemeMode): void {
		if (!THEME_CYCLE.includes(mode)) {
			throw new Error(
				`Invalid theme mode: ${mode}. Must be one of: ${THEME_CYCLE.join(", ")}`,
			);
		}

		this.state = {
			currentTheme: mode,
			isDarkMode: calculateEffectiveTheme(mode),
		};

		applyThemeToDocument(this.state.isDarkMode);
		this.notifyListeners();
	}

	getCurrentTheme(): ThemeMode {
		return this.state.currentTheme;
	}

	isDarkMode(): boolean {
		return this.state.isDarkMode;
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
				console.error("ThemeManager listener error:", error);
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
