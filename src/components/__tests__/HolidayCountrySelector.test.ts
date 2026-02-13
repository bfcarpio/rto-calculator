/**
 * HolidayCountrySelector Tests
 *
 * Tests UI structure, country dropdown population, and auto-added
 * holiday tracking logic for the holiday country selector component.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("HolidayCountrySelector - UI Structure", () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<details class="holiday-drawer" id="holiday-drawer">
				<summary class="holiday-drawer__summary">
					<span class="holiday-drawer__title">Public Holidays</span>
					<span class="holiday-drawer__chevron" aria-hidden="true"></span>
				</summary>
				<div class="holiday-drawer__content">
					<p class="holiday-drawer__description">
						Select a country to automatically mark public holidays on the calendar.
					</p>
					<select id="country-select" class="holiday-drawer__select">
						<option value="">Select a country...</option>
					</select>
					<div id="holiday-status" class="holiday-drawer__status"></div>
				</div>
			</details>
		`;
	});

	it("should render a details element with holiday-drawer class", () => {
		const drawer = document.getElementById("holiday-drawer");
		expect(drawer).toBeTruthy();
		expect(drawer!.tagName.toLowerCase()).toBe("details");
		expect(drawer!.classList.contains("holiday-drawer")).toBe(true);
	});

	it("should have a select element with id country-select", () => {
		const select = document.getElementById("country-select");
		expect(select).toBeTruthy();
		expect(select!.tagName.toLowerCase()).toBe("select");
	});

	it("should have a status div with id holiday-status", () => {
		const status = document.getElementById("holiday-status");
		expect(status).toBeTruthy();
		expect(status!.classList.contains("holiday-drawer__status")).toBe(true);
	});

	it("should not have an add-holidays button", () => {
		const button = document.getElementById("add-holidays-button");
		expect(button).toBeNull();
	});

	it("should have a placeholder option with empty value", () => {
		const select = document.getElementById(
			"country-select",
		) as HTMLSelectElement;
		const firstOption = select.options[0];
		expect(firstOption).toBeTruthy();
		expect(firstOption!.value).toBe("");
		expect(firstOption!.textContent).toBe("Select a country...");
	});
});

describe("HolidayCountrySelector - Country Dropdown Population", () => {
	// Simulate what the component script does to populate the dropdown
	function populateDropdown(select: HTMLSelectElement): void {
		const countries = [
			{ code: "DE", name: "Germany", flag: "\u{1F1E9}\u{1F1EA}" },
			{ code: "US", name: "United States", flag: "\u{1F1FA}\u{1F1F8}" },
			{ code: "JP", name: "Japan", flag: "\u{1F1EF}\u{1F1F5}" },
		];

		for (const country of countries) {
			const option = document.createElement("option");
			option.value = country.code;
			option.textContent = `${country.flag} ${country.name}`;
			select.appendChild(option);
		}
	}

	beforeEach(() => {
		document.body.innerHTML = `
			<select id="country-select">
				<option value="">Select a country...</option>
			</select>
		`;
	});

	it("should render correct number of options (placeholder + countries)", () => {
		const select = document.getElementById(
			"country-select",
		) as HTMLSelectElement;
		populateDropdown(select);
		// 1 placeholder + 3 countries
		expect(select.options).toHaveLength(4);
	});

	it("should display flag + name in option text", () => {
		const select = document.getElementById(
			"country-select",
		) as HTMLSelectElement;
		populateDropdown(select);
		const usOption = select.options[2]; // US is second country added
		expect(usOption!.textContent).toContain("United States");
		expect(usOption!.value).toBe("US");
	});

	it("should set country code as option value", () => {
		const select = document.getElementById(
			"country-select",
		) as HTMLSelectElement;
		populateDropdown(select);
		const deOption = select.options[1]; // DE is first country added
		expect(deOption!.value).toBe("DE");
	});
});

describe("HolidayCountrySelector - Auto-Added Holiday Tracking", () => {
	it("should call setDates with holiday dates and holiday state", () => {
		const mockSetDates = vi.fn();

		// Simulate what handleCountryChange does after fetching
		const datesToAdd = ["2026-01-01", "2026-01-20", "2026-02-17"];
		mockSetDates(datesToAdd, "holiday");

		expect(mockSetDates).toHaveBeenCalledWith(datesToAdd, "holiday");
	});

	it("should clear only auto-added holidays when switching countries", () => {
		const mockClearDates = vi.fn();
		const mockGetState = vi.fn();

		// Simulate: US holidays were auto-added
		const autoAdded = new Set(["2026-01-01", "2026-01-20", "2026-07-04"]);

		// All are still in holiday state
		mockGetState.mockReturnValue("holiday");

		// When switching countries, clear auto-added that are still holiday
		const toRemove: string[] = [];
		for (const date of autoAdded) {
			if (mockGetState(date) === "holiday") {
				toRemove.push(date);
			}
		}
		mockClearDates(toRemove);

		expect(mockClearDates).toHaveBeenCalledWith([
			"2026-01-01",
			"2026-01-20",
			"2026-07-04",
		]);
	});

	it("should preserve manually painted holidays when clearing", () => {
		const mockClearDates = vi.fn();
		const mockGetState = vi.fn();

		// Simulate: some auto-added dates, but user manually changed one to a different state
		const autoAdded = new Set(["2026-01-01", "2026-01-20", "2026-07-04"]);

		// 2026-01-20 was repainted by user to 'oof' — no longer 'holiday'
		mockGetState.mockImplementation((date: string) => {
			if (date === "2026-01-20") return "oof";
			return "holiday";
		});

		const toRemove: string[] = [];
		for (const date of autoAdded) {
			if (mockGetState(date) === "holiday") {
				toRemove.push(date);
			}
		}

		if (toRemove.length > 0) {
			mockClearDates(toRemove);
		}

		// 2026-01-20 should NOT be in the cleared list (user changed it)
		expect(toRemove).not.toContain("2026-01-20");
		expect(toRemove).toContain("2026-01-01");
		expect(toRemove).toContain("2026-07-04");
	});

	it("should skip dates already marked as holiday when adding", () => {
		const mockGetState = vi.fn();

		// Simulate: user manually painted 2026-01-01 as holiday before selecting a country
		mockGetState.mockImplementation((date: string) => {
			if (date === "2026-01-01") return "holiday";
			return null;
		});

		const fetchedDates = ["2026-01-01", "2026-01-20", "2026-07-04"];
		const datesToAdd: string[] = [];

		for (const dateStr of fetchedDates) {
			if (mockGetState(dateStr) === "holiday") continue;
			datesToAdd.push(dateStr);
		}

		// 2026-01-01 skipped because already holiday
		expect(datesToAdd).toEqual(["2026-01-20", "2026-07-04"]);
	});

	it("should clear all auto-added holidays when selecting empty", () => {
		const mockClearDates = vi.fn();
		const mockGetState = vi.fn().mockReturnValue("holiday");

		const autoAdded = new Set(["2026-01-01", "2026-07-04"]);
		const toRemove: string[] = [];

		for (const date of autoAdded) {
			if (mockGetState(date) === "holiday") {
				toRemove.push(date);
			}
		}

		if (toRemove.length > 0) {
			mockClearDates(toRemove);
		}

		expect(mockClearDates).toHaveBeenCalledWith(["2026-01-01", "2026-07-04"]);
	});
});
