import { debugLog } from "./debug";

type HolidayCountry = { code: string; name: string; flag: string };

interface Settings {
	debug: boolean;
	saveData: boolean;
	strategy: string;
	minOfficeDays: number;
	defaultPattern: number[] | null;
	holidays: { countryCode: string | null; holidaysAsOOF: boolean };
	validationMode: "strict" | "average";
}

declare global {
	interface Window {
		__holidayCountries?: HolidayCountry[];
		validationManager?: {
			setDebugMode(enabled: boolean): void;
			getDebugMode(): boolean;
			SetValidator(strategy: string): void;
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
	private strategySelect: HTMLSelectElement | null = null;
	private minOfficeDaysInput: HTMLInputElement | null = null;
	private countrySelect: HTMLSelectElement | null = null;
	private patternSelector: HTMLElement | null = null;
	private clearPatternButton: HTMLElement | null = null;
	private patternStatus: HTMLElement | null = null;
	private selectedPattern: number[] = [];
	private holidayOofToggle: HTMLButtonElement | null = null;
	private validationModeStrictButton: HTMLButtonElement | null = null;
	private validationModeAverageButton: HTMLButtonElement | null = null;

	constructor() {
		this.bindElements();
		this.initializeEventListeners();
		this.initializeHolidaySettings();
		this.loadSettingsFromLocalStorage();
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
		this.strategySelect = document.getElementById(
			"validation-strategy",
		) as HTMLSelectElement | null;
		this.minOfficeDaysInput = document.getElementById(
			"min-office-days",
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
		this.validationModeStrictButton = document.getElementById(
			"validation-mode-strict",
		) as HTMLButtonElement | null;
		this.validationModeAverageButton = document.getElementById(
			"validation-mode-average",
		) as HTMLButtonElement | null;
	}

	private initializeEventListeners(): void {
		this.settingsButton?.addEventListener("click", () => {
			this.populateCountryDropdown();
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
		this.strategySelect?.addEventListener("change", (e) =>
			this.onStrategyChange(e),
		);
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
		this.validationModeStrictButton?.addEventListener("click", () =>
			this.setValidationMode("strict"),
		);
		this.validationModeAverageButton?.addEventListener("click", () =>
			this.setValidationMode("average"),
		);
	}

	private toggleDebugMode(): void {
		if (!this.debugToggle) return;
		const currentState =
			this.debugToggle.getAttribute("aria-checked") === "true";
		const newState = !currentState;
		this.debugToggle.setAttribute("aria-checked", newState.toString());

		window.validationManager?.setDebugMode(newState);
		debugLog(`[Settings] Debug mode ${newState ? "enabled" : "disabled"}`);
	}

	private toggleSaveData(): void {
		if (!this.saveDataToggle) return;
		const currentState =
			this.saveDataToggle.getAttribute("aria-checked") === "true";
		const newState = !currentState;
		this.saveDataToggle.setAttribute("aria-checked", newState.toString());

		window.storageManager?.setDataSavingEnabled(newState);
		debugLog(`[Settings] Data saving ${newState ? "enabled" : "disabled"}`);
	}

	private toggleHolidayOofMode(): void {
		if (!this.holidayOofToggle) return;
		const currentState =
			this.holidayOofToggle.getAttribute("aria-checked") === "true";
		const newState = !currentState;
		this.holidayOofToggle.setAttribute("aria-checked", newState.toString());

		debugLog(
			`[Settings] Holiday OOF mode ${newState ? "enabled" : "disabled"}`,
		);
		document.dispatchEvent(
			new CustomEvent("settings-changed", {
				bubbles: true,
				detail: { holidays: { holidaysAsOOF: newState } },
			}),
		);
	}

	private setValidationMode(mode: "strict" | "average"): void {
		if (!this.validationModeStrictButton || !this.validationModeAverageButton)
			return;

		const isStrict = mode === "strict";
		this.validationModeStrictButton.setAttribute(
			"aria-pressed",
			isStrict.toString(),
		);
		this.validationModeAverageButton.setAttribute(
			"aria-pressed",
			(!isStrict).toString(),
		);

		debugLog(`[Settings] Validation mode changed to: ${mode}`);
		document.dispatchEvent(
			new CustomEvent("settings-changed", {
				bubbles: true,
				detail: { validationMode: mode },
			}),
		);
	}

	private onStrategyChange(e: Event): void {
		const strategy = (e.target as HTMLSelectElement).value;
		debugLog(`[Settings] Strategy changed to: ${strategy}`);
		window.validationManager?.SetValidator(strategy);
	}

	private onMinOfficeDaysChange(e: Event): void {
		const value = parseInt((e.target as HTMLInputElement).value, 10);
		if (value >= 0 && value <= 5) {
			debugLog(`[Settings] Min office days changed to: ${value}`);
			window.validationManager?.updateConfig({ minOfficeDaysPerWeek: value });
		}
	}

	private onCountryChange(e: Event): void {
		const countryCode = (e.target as HTMLSelectElement).value;
		const holidaysAsOOF =
			this.holidayOofToggle?.getAttribute("aria-checked") === "true";
		debugLog(`[Settings] Country changed to: ${countryCode}`);

		document.dispatchEvent(
			new CustomEvent("settings-changed", {
				bubbles: true,
				detail: {
					holidays: { countryCode: countryCode || null, holidaysAsOOF },
				},
			}),
		);
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
				debugLog(`[Settings] Pattern applied to ${appliedCount} day(s)`);
				this.announceToScreenReader(
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

		if (this.strategySelect) {
			this.strategySelect.value = "rolling-period";
		}
		window.validationManager?.SetValidator("rolling-period");

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
		document.dispatchEvent(
			new CustomEvent("settings-changed", {
				bubbles: true,
				detail: { holidays: { holidaysAsOOF: true } },
			}),
		);

		this.validationModeStrictButton?.setAttribute("aria-pressed", "true");
		this.validationModeAverageButton?.setAttribute("aria-pressed", "false");
		document.dispatchEvent(
			new CustomEvent("settings-changed", {
				bubbles: true,
				detail: { validationMode: "strict" },
			}),
		);

		localStorage.removeItem("rto-calculator-settings");
		debugLog("[Settings] Settings reset to defaults");

		this.modal?.close();
		this.announceToScreenReader("Settings reset to defaults");
	}

	private clearPatternSelection(): void {
		this.selectedPattern = [];
		this.updatePatternSelectorUI();
		this.announceToScreenReader("Pattern selection cleared");

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

		this.updatePatternSelectorUI();
	}

	private saveSettingsToLocalStorage(): void {
		const settings: Settings = {
			debug: this.debugToggle?.getAttribute("aria-checked") === "true",
			saveData: this.saveDataToggle?.getAttribute("aria-checked") === "true",
			strategy: this.strategySelect?.value ?? "rolling-period",
			minOfficeDays: this.minOfficeDaysInput
				? parseInt(this.minOfficeDaysInput.value, 10)
				: 3,
			defaultPattern:
				this.selectedPattern.length > 0 ? [...this.selectedPattern] : null,
			holidays: {
				countryCode: this.countrySelect?.value ?? null,
				holidaysAsOOF:
					this.holidayOofToggle?.getAttribute("aria-checked") === "true",
			},
			validationMode:
				this.validationModeStrictButton?.getAttribute("aria-pressed") === "true"
					? "strict"
					: "average",
		};

		localStorage.setItem("rto-calculator-settings", JSON.stringify(settings));
		debugLog("[Settings] Settings saved to localStorage:", settings);
	}

	private loadSettingsFromLocalStorage(): void {
		try {
			const saved = localStorage.getItem("rto-calculator-settings");
			if (!saved) return;

			const settings = JSON.parse(saved) as Settings;

			if (settings.saveData !== true) {
				debugLog("[Settings] Data saving disabled, using default settings");
				return;
			}

			if (settings.debug !== undefined && this.debugToggle) {
				this.debugToggle.setAttribute(
					"aria-checked",
					settings.debug.toString(),
				);
				window.validationManager?.setDebugMode(settings.debug);
			}

			if (settings.saveData !== undefined && this.saveDataToggle) {
				this.saveDataToggle.setAttribute(
					"aria-checked",
					settings.saveData.toString(),
				);
				window.storageManager?.setDataSavingEnabled(settings.saveData);
			}

			if (settings.strategy && this.strategySelect) {
				this.strategySelect.value = settings.strategy;
				window.validationManager?.SetValidator(settings.strategy);
			}

			if (settings.minOfficeDays !== undefined && this.minOfficeDaysInput) {
				this.minOfficeDaysInput.value = settings.minOfficeDays.toString();
				window.validationManager?.updateConfig({
					minOfficeDaysPerWeek: settings.minOfficeDays,
				});
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

			if (
				settings.holidays?.holidaysAsOOF !== undefined &&
				this.holidayOofToggle
			) {
				this.holidayOofToggle.setAttribute(
					"aria-checked",
					settings.holidays.holidaysAsOOF.toString(),
				);
				document.dispatchEvent(
					new CustomEvent("settings-changed", {
						bubbles: true,
						detail: {
							holidays: { holidaysAsOOF: settings.holidays.holidaysAsOOF },
						},
					}),
				);
			}

			if (
				settings.validationMode &&
				this.validationModeStrictButton &&
				this.validationModeAverageButton
			) {
				const isStrict = settings.validationMode === "strict";
				this.validationModeStrictButton.setAttribute(
					"aria-pressed",
					isStrict.toString(),
				);
				this.validationModeAverageButton.setAttribute(
					"aria-pressed",
					(!isStrict).toString(),
				);
				document.dispatchEvent(
					new CustomEvent("settings-changed", {
						bubbles: true,
						detail: { validationMode: settings.validationMode },
					}),
				);
			}

			debugLog("[Settings] Settings loaded from localStorage:", settings);
		} catch (error) {
			console.error("[Settings] Error loading settings:", error);
		}
	}

	private populateCountryDropdown(): void {
		const countries = window.__holidayCountries;
		if (!countries) {
			console.warn(
				"[Settings] Holiday countries not available yet, skipping dropdown population",
			);
			return;
		}

		if (!this.countrySelect) return;

		this.countrySelect.innerHTML = '<option value="">None</option>';

		const sorted = [...countries].sort((a, b) => a.name.localeCompare(b.name));

		sorted.forEach((country) => {
			const option = document.createElement("option");
			option.value = country.code;
			option.textContent = `${country.flag} ${country.name} (${country.code})`;
			this.countrySelect?.appendChild(option);
		});
	}

	private initializeHolidaySettings(): void {
		debugLog("[SettingsModal] Initializing holiday settings...");
		debugLog(
			`[SettingsModal] Window.__holidayCountries exists: ${!!window.__holidayCountries}`,
		);
	}

	private announceToScreenReader(message: string): void {
		const announcement = document.createElement("div");
		announcement.setAttribute("role", "status");
		announcement.setAttribute("aria-live", "polite");
		announcement.setAttribute("aria-atomic", "true");
		announcement.className = "sr-only calendar-announcement";
		announcement.textContent = message;
		document.body.appendChild(announcement);
		setTimeout(() => document.body.removeChild(announcement), 1000);
	}
}

document.addEventListener("DOMContentLoaded", () => new SettingsModal());
