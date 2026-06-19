import { isAutoComplianceReady } from "../lib/auto-compliance";
import { getDateRange } from "../lib/dateUtils";
import { DEFAULTS } from "../lib/settings-constants";
import { settingsStore } from "../lib/stores/settingsStore";
import { getColorScheme, setColorScheme } from "../lib/themeManager";
import { getStartOfWeek } from "../lib/validation/rto-core";
import { announceToScreenReader } from "../utils/accessibility";
import { logger } from "../utils/logger";
import { clearAllData } from "../utils/storage";
import { initializeIndex } from "./index-init";

declare global {
	interface Window {
		validationManager?: {
			setDebugMode(enabled: boolean): void;
			getDebugMode(): boolean;
			updateConfig(config: { minOfficeDaysPerWeek: number }): void;
			getConfig(): { minOfficeDaysPerWeek?: number };
		};
		storageManager?: {
			setDataSavingEnabled(enabled: boolean): void;
		};
	}
}

class SettingsModal {
	private modal: HTMLDialogElement | null = null;
	private settingsButton: HTMLElement | null = null;
	private closeButton: HTMLElement | null = null;
	private saveButton: HTMLElement | null = null;
	private resetButton: HTMLElement | null = null;
	private debugToggle: HTMLButtonElement | null = null;
	private saveDataToggle: HTMLButtonElement | null = null;
	private minOfficeDaysInput: HTMLInputElement | null = null;
	private countrySelect: HTMLSelectElement | null = null;
	private patternSelector: HTMLElement | null = null;
	private clearPatternButton: HTMLElement | null = null;
	private patternStatus: HTMLElement | null = null;
	private selectedPattern: number[] = [];
	private holidayOofToggle: HTMLButtonElement | null = null;
	private sickPenalizeToggle: HTMLButtonElement | null = null;
	private holidayPenalizeToggle: HTMLButtonElement | null = null;
	private rollingWindowInput: HTMLInputElement | null = null;
	private bestWeeksInput: HTMLInputElement | null = null;
	private startingWeekSelect: HTMLSelectElement | null = null;
	private roundPercentageToggle: HTMLButtonElement | null = null;
	private clearDataButton: HTMLButtonElement | null = null;
	private colorSchemeSelect: HTMLSelectElement | null = null;

	constructor() {
		initializeIndex();

		this.bindElements();
		this.initializeEventListeners();
		this.loadSettingsFromLocalStorage();
	}

	public initialize(): void {
		// Re-bind elements in case DOM changed
		this.bindElements();
		// Sync current state to UI
		this.syncSettings();
	}

	private bindElements(): void {
		this.modal = document.getElementById(
			"settings-modal",
		) as HTMLDialogElement | null;
		this.settingsButton = document.getElementById("settings-button");
		this.closeButton = document.getElementById("settings-modal-close");
		this.saveButton = document.getElementById("settings-modal-save");
		this.resetButton = document.getElementById("settings-modal-reset");
		this.debugToggle = document.getElementById(
			"debug-toggle",
		) as HTMLButtonElement | null;
		this.saveDataToggle = document.getElementById(
			"save-data-toggle",
		) as HTMLButtonElement | null;
		this.minOfficeDaysInput = document.getElementById(
			"target-days-input",
		) as HTMLInputElement | null;
		this.countrySelect = document.getElementById(
			"country-select",
		) as HTMLSelectElement | null;
		this.patternSelector = document.getElementById("pattern-selector");
		this.clearPatternButton = document.getElementById("clear-pattern-button");
		this.patternStatus = document.getElementById("pattern-status");
		this.holidayOofToggle = document.getElementById(
			"holiday-oof-toggle",
		) as HTMLButtonElement | null;
		this.sickPenalizeToggle = document.getElementById(
			"sick-penalize-toggle",
		) as HTMLButtonElement | null;
		this.holidayPenalizeToggle = document.getElementById(
			"holiday-penalize-toggle",
		) as HTMLButtonElement | null;
		this.rollingWindowInput = document.getElementById(
			"rolling-window-input",
		) as HTMLInputElement | null;
		this.bestWeeksInput = document.getElementById(
			"best-weeks-input",
		) as HTMLInputElement | null;
		this.startingWeekSelect = document.getElementById(
			"starting-week-select",
		) as HTMLSelectElement | null;
		this.roundPercentageToggle = document.getElementById(
			"round-percentage-toggle",
		) as HTMLButtonElement | null;
		this.clearDataButton = document.getElementById(
			"clear-data-button",
		) as HTMLButtonElement | null;
		this.colorSchemeSelect = document.getElementById(
			"color-scheme-select",
		) as HTMLSelectElement | null;
	}

	private initializeEventListeners(): void {
		this.settingsButton?.addEventListener("click", () => {
			this.modal?.showModal();
			this.syncSettings();
		});

		this.closeButton?.addEventListener("click", () => {
			this.modal?.close();
		});

		this.modal?.addEventListener("click", (e) => {
			if (e.target === this.modal) {
				this.modal?.close();
			}
		});

		this.modal?.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				this.modal?.close();
			}
		});

		this.debugToggle?.addEventListener("click", () => this.toggleDebugMode());
		this.saveDataToggle?.addEventListener("click", () => this.toggleSaveData());
		this.minOfficeDaysInput?.addEventListener("change", (e) =>
			this.onMinOfficeDaysChange(e),
		);
		this.saveButton?.addEventListener("click", () => this.saveSettings());
		this.resetButton?.addEventListener("click", () => this.resetSettings());
		this.patternSelector?.addEventListener("click", (e) =>
			this.onPatternClick(e),
		);
		this.clearPatternButton?.addEventListener("click", () =>
			this.clearPatternSelection(),
		);
		this.patternSelector?.addEventListener("keydown", (e) =>
			this.onPatternKeydown(e),
		);
		this.countrySelect?.addEventListener("change", (e) =>
			this.onCountryChange(e),
		);
		this.holidayOofToggle?.addEventListener("click", () =>
			this.toggleHolidayOofMode(),
		);
		this.sickPenalizeToggle?.addEventListener("click", () =>
			this.toggleSickPenalize(),
		);
		this.holidayPenalizeToggle?.addEventListener("click", () =>
			this.toggleHolidayPenalize(),
		);
		this.rollingWindowInput?.addEventListener("change", () =>
			this.onRollingWindowChange(),
		);
		this.bestWeeksInput?.addEventListener("change", () =>
			this.onBestWeeksChange(),
		);
		this.startingWeekSelect?.addEventListener("change", () =>
			this.onStartingWeekChange(),
		);
		this.roundPercentageToggle?.addEventListener("click", () =>
			this.toggleRoundPercentage(),
		);
		this.clearDataButton?.addEventListener("click", () =>
			this.clearSavedData(),
		);
		this.colorSchemeSelect?.addEventListener("change", () =>
			this.onColorSchemeChange(),
		);
	}

	private toggleDebugMode(): void {
		this.toggleBooleanSetting(this.debugToggle, "Debug mode", (newState) => {
			window.validationManager?.setDebugMode(newState);
		});
	}

	private toggleSaveData(): void {
		this.toggleBooleanSetting(
			this.saveDataToggle,
			"Data saving",
			(newState) => {
				window.storageManager?.setDataSavingEnabled(newState);
			},
		);
	}

	private toggleHolidayOofMode(): void {
		this.toggleBooleanSetting(this.holidayOofToggle, "Holiday OOF mode");
	}

	private toggleSickPenalize(): void {
		this.toggleBooleanSetting(this.sickPenalizeToggle, "Sick days penalize");
	}

	private toggleHolidayPenalize(): void {
		this.toggleBooleanSetting(this.holidayPenalizeToggle, "Holiday penalize");
	}

	private toggleRoundPercentage(): void {
		this.toggleBooleanSetting(this.roundPercentageToggle, "Round percentage");
	}

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
	private toggleBooleanSetting(
		element: HTMLButtonElement | null,
		settingName: string,
		sideEffect?: (newState: boolean) => void,
	): void {
		if (!element) return;

		const currentState = element.getAttribute("aria-checked") === "true";
		const newState = !currentState;
		element.setAttribute("aria-checked", newState.toString());

		sideEffect?.(newState);
		this.saveSettingsToLocalStorage();
		logger.debug(
			`[Settings] ${settingName} ${newState ? "enabled" : "disabled"}`,
		);
	}

	private onMinOfficeDaysChange(e: Event): void {
		const value = parseInt((e.target as HTMLInputElement).value, 10);
		if (value >= 0 && value <= 5) {
			logger.debug(`[Settings] Min office days changed to: ${value}`);
			window.validationManager?.updateConfig({ minOfficeDaysPerWeek: value });
			this.saveSettingsToLocalStorage();
		}
	}

	private onRollingWindowChange(): void {
		if (!this.rollingWindowInput) return;
		const value = parseInt(this.rollingWindowInput.value, 10);
		if (value < 1 || value > 52) return;

		// Clamp best weeks to not exceed rolling window
		if (this.bestWeeksInput) {
			this.bestWeeksInput.max = value.toString();
			const bestWeeks = parseInt(this.bestWeeksInput.value, 10);
			if (bestWeeks > value) {
				this.bestWeeksInput.value = value.toString();
			}
		}

		this.saveSettingsToLocalStorage();
		logger.debug(`[Settings] Rolling window changed to: ${value}`);
	}

	private onBestWeeksChange(): void {
		if (!this.bestWeeksInput) return;
		const value = parseInt(this.bestWeeksInput.value, 10);
		const maxWeeks = this.rollingWindowInput
			? parseInt(this.rollingWindowInput.value, 10)
			: DEFAULTS.rollingWindowWeeks;

		if (value < 1 || value > maxWeeks) return;

		this.saveSettingsToLocalStorage();
		logger.debug(`[Settings] Best weeks changed to: ${value}`);
	}

	private onStartingWeekChange(): void {
		this.saveSettingsToLocalStorage();
		logger.debug(
			`[Settings] Starting week changed to: ${this.startingWeekSelect?.value || "default"}`,
		);
	}

	private populateStartingWeekOptions(): void {
		if (!this.startingWeekSelect) return;

		const savedValue = this.startingWeekSelect.value;
		// Clear all options except the default
		this.startingWeekSelect.innerHTML =
			'<option value="">Default (earliest)</option>';

		const range = getDateRange();
		const months = [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec",
		];

		let weekStart = getStartOfWeek(range.startDate);
		if (weekStart < range.startDate) {
			weekStart = new Date(weekStart);
			weekStart.setDate(weekStart.getDate() + 7);
		}

		while (weekStart <= range.endDate) {
			const y = weekStart.getFullYear();
			const m = String(weekStart.getMonth() + 1).padStart(2, "0");
			const d = String(weekStart.getDate()).padStart(2, "0");
			const value = `${y}-${m}-${d}`;
			const label = `${months[weekStart.getMonth()]} ${weekStart.getDate()}, ${y}`;

			const option = document.createElement("option");
			option.value = value;
			option.textContent = label;
			this.startingWeekSelect.appendChild(option);

			weekStart = new Date(weekStart);
			weekStart.setDate(weekStart.getDate() + 7);
		}

		// Restore previously selected value if still valid
		if (savedValue) {
			this.startingWeekSelect.value = savedValue;
		}
	}

	private onCountryChange(e: Event): void {
		const countryCode = (e.target as HTMLSelectElement).value;

		this.saveSettingsToLocalStorage();
		logger.debug(`[Settings] Country changed to: ${countryCode}`);
	}

	private onPatternClick(e: Event): void {
		const target = e.target as HTMLElement;
		if (!target.classList.contains("pattern-day")) return;

		const dayIndex = parseInt(target.getAttribute("data-day") || "0", 10);
		const index = this.selectedPattern.indexOf(dayIndex);

		if (index > -1) {
			this.selectedPattern.splice(index, 1);
		} else {
			this.selectedPattern.push(dayIndex);
		}

		this.updatePatternSelectorUI();
	}

	private onPatternKeydown(e: KeyboardEvent): void {
		const target = e.target as HTMLElement;
		if (
			target.classList.contains("pattern-day") &&
			(e.key === " " || e.key === "Enter")
		) {
			e.preventDefault();
			target.click();
		}
	}

	private saveSettings(): void {
		if (this.selectedPattern.length > 0) {
			const appliedCount = this.applyPatternToCalendar();
			if (appliedCount > 0) {
				logger.debug(`[Settings] Pattern applied to ${appliedCount} day(s)`);
				announceToScreenReader(
					`Pattern applied to ${appliedCount} day(s). Settings saved`,
				);
			}
		}

		this.saveSettingsToLocalStorage();
		this.modal?.close();
	}

	private resetSettings(): void {
		if (!confirm("Reset all settings to default values?")) return;

		this.debugToggle?.setAttribute("aria-checked", "false");
		window.validationManager?.setDebugMode(false);

		if (this.minOfficeDaysInput) {
			this.minOfficeDaysInput.value = "3";
		}
		window.validationManager?.updateConfig({ minOfficeDaysPerWeek: 3 });

		this.selectedPattern = [];
		this.updatePatternSelectorUI();

		if (this.countrySelect) {
			this.countrySelect.value = "";
		}

		this.holidayOofToggle?.setAttribute("aria-checked", "true");

		this.sickPenalizeToggle?.setAttribute("aria-checked", "true");
		this.holidayPenalizeToggle?.setAttribute("aria-checked", "true");
		this.roundPercentageToggle?.setAttribute("aria-checked", "true");

		if (this.rollingWindowInput) {
			this.rollingWindowInput.value = DEFAULTS.rollingWindowWeeks.toString();
		}
		if (this.bestWeeksInput) {
			this.bestWeeksInput.value = DEFAULTS.bestWeeksCount.toString();
			this.bestWeeksInput.max = DEFAULTS.rollingWindowWeeks.toString();
		}
		if (this.startingWeekSelect) {
			this.startingWeekSelect.value = "";
		}

		// Reset the settings store to defaults (also clears localStorage via persistentAtom)
		settingsStore.set({ ...DEFAULTS });
		logger.debug("[Settings] Settings reset to defaults");

		this.modal?.close();
		announceToScreenReader("Settings reset to defaults");
	}

	private clearSavedData(): void {
		if (!window.confirm("Clear all saved data? This cannot be undone.")) return;
		clearAllData();
		localStorage.removeItem("datepainter:selectedDates");
		settingsStore.set({ ...DEFAULTS });
		window.location.reload();
	}

	private clearPatternSelection(): void {
		this.selectedPattern = [];
		this.updatePatternSelectorUI();
		announceToScreenReader("Pattern selection cleared");

		if (this.patternStatus) {
			this.patternStatus.textContent = "No pattern selected";
			this.patternStatus.className = "pattern-status";
		}
	}

	private applyPatternToCalendar(): number {
		const minOfficeDays = this.minOfficeDaysInput
			? parseInt(this.minOfficeDaysInput.value, 10)
			: 3;
		const officeDays = 5 - this.selectedPattern.length;

		if (officeDays < minOfficeDays) {
			alert(
				`Pattern has only ${officeDays} office days, but ${minOfficeDays} are required.`,
			);
			return 0;
		}

		const calendarCells = document.querySelectorAll(
			".calendar-day:not(.empty)",
		);
		let appliedCount = 0;

		calendarCells.forEach((cell) => {
			const cellElement = cell as HTMLElement;
			const isSelected = cellElement.dataset.selected === "true";
			const selectionType = cellElement.dataset.selectionType;

			if (!isSelected && !selectionType) {
				const year = parseInt(cellElement.dataset.year || "0", 10);
				const month = parseInt(cellElement.dataset.month || "0", 10);
				const day = parseInt(cellElement.dataset.day || "0", 10);
				const date = new Date(year, month, day);
				const dayIndex = date.getDay();
				const isWeekday = dayIndex >= 1 && dayIndex <= 5;

				if (isWeekday && this.selectedPattern.includes(dayIndex)) {
					cellElement.dataset.selected = "true";
					cellElement.dataset.selectionType = "out-of-office";
					cellElement.classList.add("selected", "out-of-office");
					cellElement.setAttribute("aria-selected", "true");

					const dateStr = cellElement.getAttribute("aria-label") || "";
					const newLabel = dateStr.replace(/\.[^.]*$/, "");
					cellElement.setAttribute("aria-label", `${newLabel}. Out of office`);

					cellElement.dispatchEvent(
						new CustomEvent("rto-selection-changed", {
							bubbles: true,
							detail: { cell: cellElement, selectionType: "work-from-home" },
						}),
					);

					appliedCount++;
				}
			}
		});

		return appliedCount;
	}

	private updatePatternSelectorUI(): void {
		const patternDays = document.querySelectorAll(".pattern-day");
		patternDays.forEach((day) => {
			const dayIndex = parseInt(day.getAttribute("data-day") || "0", 10);
			const isSelected = this.selectedPattern.includes(dayIndex);
			day.setAttribute("aria-pressed", isSelected.toString());
		});
		this.updatePatternStatus();
	}

	private updatePatternStatus(): void {
		if (!this.patternStatus) return;

		const officeDays = 5 - this.selectedPattern.length;
		const minOfficeDays = this.minOfficeDaysInput
			? parseInt(this.minOfficeDaysInput.value, 10)
			: 3;
		const isValid = officeDays >= minOfficeDays;

		if (this.selectedPattern.length === 0) {
			this.patternStatus.textContent = "No pattern selected";
			this.patternStatus.className = "pattern-status";
		} else {
			const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
			const selectedDayNames = this.selectedPattern
				.map((day) => dayNames[day])
				.join(", ");
			this.patternStatus.textContent = `${selectedDayNames} (${officeDays} office days)`;
			this.patternStatus.className = isValid
				? "pattern-status valid"
				: "pattern-status invalid";
		}
	}

	private syncSettings(): void {
		const isDebugEnabled = window.validationManager?.getDebugMode() ?? false;
		this.debugToggle?.setAttribute("aria-checked", isDebugEnabled.toString());

		const config = window.validationManager?.getConfig() ?? {};
		if (this.minOfficeDaysInput && config.minOfficeDaysPerWeek !== undefined) {
			this.minOfficeDaysInput.value = config.minOfficeDaysPerWeek.toString();
		}

		// Sync color scheme dropdown
		if (this.colorSchemeSelect) {
			this.colorSchemeSelect.value = getColorScheme();
		}

		this.populateStartingWeekOptions();
		this.updatePatternSelectorUI();
	}

	private saveSettingsToLocalStorage(): void {
		settingsStore.set({
			...settingsStore.get(),
			debug: this.debugToggle?.getAttribute("aria-checked") === "true",
			saveData: this.saveDataToggle?.getAttribute("aria-checked") === "true",
			minOfficeDays: this.minOfficeDaysInput
				? parseInt(this.minOfficeDaysInput.value, 10)
				: DEFAULTS.minOfficeDays,
			rollingWindowWeeks: this.rollingWindowInput
				? parseInt(this.rollingWindowInput.value, 10)
				: DEFAULTS.rollingWindowWeeks,
			bestWeeksCount: this.bestWeeksInput
				? parseInt(this.bestWeeksInput.value, 10)
				: DEFAULTS.bestWeeksCount,
			startingWeek: this.startingWeekSelect?.value || null,
			defaultPattern:
				this.selectedPattern.length > 0 ? [...this.selectedPattern] : null,
			holidays: {
				countryCode: this.countrySelect?.value ?? null,
				holidaysAsOOF:
					this.holidayOofToggle?.getAttribute("aria-checked") === "true",
			},
			sickDaysPenalize:
				this.sickPenalizeToggle?.getAttribute("aria-checked") !== "false",
			holidayPenalize:
				this.holidayPenalizeToggle?.getAttribute("aria-checked") !== "false",
			roundPercentage:
				this.roundPercentageToggle?.getAttribute("aria-checked") !== "false",
		});
		logger.debug("[Settings] Settings saved to localStorage");
	}

	private loadSettingsFromLocalStorage(): void {
		try {
			const settings = settingsStore.get();

			if (settings.saveData !== true) {
				logger.debug("[Settings] Data saving disabled, using default settings");
				return;
			}

			if (this.debugToggle) {
				this.debugToggle.setAttribute(
					"aria-checked",
					settings.debug.toString(),
				);
				window.validationManager?.setDebugMode(settings.debug);
			}

			if (this.saveDataToggle) {
				this.saveDataToggle.setAttribute(
					"aria-checked",
					settings.saveData.toString(),
				);
				window.storageManager?.setDataSavingEnabled(settings.saveData);
			}

			if (this.minOfficeDaysInput) {
				this.minOfficeDaysInput.value = settings.minOfficeDays.toString();
				window.validationManager?.updateConfig({
					minOfficeDaysPerWeek: settings.minOfficeDays,
				});
			}

			if (this.rollingWindowInput) {
				this.rollingWindowInput.value = settings.rollingWindowWeeks.toString();
			}

			if (this.bestWeeksInput) {
				this.bestWeeksInput.value = settings.bestWeeksCount.toString();
				this.bestWeeksInput.max = settings.rollingWindowWeeks.toString();
			}

			if (this.startingWeekSelect && settings.startingWeek) {
				// Populate options first so the saved value can be selected
				this.populateStartingWeekOptions();
				this.startingWeekSelect.value = settings.startingWeek;
			}

			if (settings.defaultPattern && Array.isArray(settings.defaultPattern)) {
				this.selectedPattern = settings.defaultPattern;
			} else {
				this.selectedPattern = [];
			}
			this.updatePatternSelectorUI();

			if (settings.holidays && this.countrySelect) {
				this.countrySelect.value = settings.holidays.countryCode ?? "";
			}

			if (this.holidayOofToggle) {
				this.holidayOofToggle.setAttribute(
					"aria-checked",
					settings.holidays.holidaysAsOOF.toString(),
				);
			}

			if (this.sickPenalizeToggle) {
				this.sickPenalizeToggle.setAttribute(
					"aria-checked",
					settings.sickDaysPenalize.toString(),
				);
			}

			if (this.holidayPenalizeToggle) {
				this.holidayPenalizeToggle.setAttribute(
					"aria-checked",
					settings.holidayPenalize.toString(),
				);
			}

			if (this.roundPercentageToggle) {
				this.roundPercentageToggle.setAttribute(
					"aria-checked",
					(settings.roundPercentage ?? true).toString(),
				);
			}

			logger.debug("[Settings] Settings loaded from localStorage");
		} catch (error) {
			logger.error("[Settings] Error loading settings:", error);
		}
	}

	private onColorSchemeChange(): void {
		const colorScheme = this.colorSchemeSelect?.value as
			| "tol-bright-light"
			| "tol-bright-dark"
			| "tol-vibrant-light"
			| "tol-vibrant-dark"
			| "tol-muted-light"
			| "tol-muted-dark";

		if (colorScheme) {
			setColorScheme(colorScheme);
			this.saveSettingsToLocalStorage();
		}
	}
}

/**
 * Enable the settings button once auto-compliance is initialized.
 * Polls until ready, then removes disabled state and loading indicator.
 */
function enableSettingsWhenReady(): void {
	const settingsButton = document.getElementById("settings-button");

	if (!settingsButton) {
		// Button not found, retry
		setTimeout(enableSettingsWhenReady, 50);
		return;
	}

	if (isAutoComplianceReady()) {
		settingsButton.removeAttribute("disabled");
		settingsButton.removeAttribute("data-loading");
		logger.debug("[Settings] Settings button enabled - auto-compliance ready");
		return;
	}

	// Not ready yet, poll again
	setTimeout(enableSettingsWhenReady, 50);
}

const settingsManager = new SettingsModal();
document.addEventListener("DOMContentLoaded", () => {
	settingsManager.initialize();
	// Wait a brief moment before starting to poll
	setTimeout(enableSettingsWhenReady, 100);
});

export { settingsManager };
