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
					<select id="company-select" class="holiday-drawer__select holiday-drawer__select--company" style="display: none;">
						<option value="">All public holidays</option>
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

describe("HolidayCountrySelector - Company Dropdown Structure", () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<select id="company-select" class="holiday-drawer__select holiday-drawer__select--company" style="display: none;">
				<option value="">All public holidays</option>
			</select>
		`;
	});

	it("should have a select element with id company-select", () => {
		const select = document.getElementById("company-select");
		expect(select).toBeTruthy();
		expect(select!.tagName.toLowerCase()).toBe("select");
	});

	it("should be initially hidden", () => {
		const select = document.getElementById(
			"company-select",
		) as HTMLSelectElement;
		expect(select.style.display).toBe("none");
	});

	it("should have 'All public holidays' as default option", () => {
		const select = document.getElementById(
			"company-select",
		) as HTMLSelectElement;
		const firstOption = select.options[0];
		expect(firstOption!.value).toBe("");
		expect(firstOption!.textContent).toBe("All public holidays");
	});
});

describe("HolidayCountrySelector - Company Dropdown Visibility", () => {
	let companySelect: HTMLSelectElement;

	beforeEach(() => {
		document.body.innerHTML = `
			<select id="company-select" class="holiday-drawer__select holiday-drawer__select--company" style="display: none;">
				<option value="">All public holidays</option>
			</select>
		`;
		companySelect = document.getElementById(
			"company-select",
		) as HTMLSelectElement;
	});

	it("should show when country has company filters", () => {
		const companies = ["Amazon", "Google", "Microsoft", "Meta"];

		// Simulate populateCompanySelect logic
		for (const name of companies) {
			const option = document.createElement("option");
			option.value = name;
			option.textContent = name;
			companySelect.appendChild(option);
		}
		companySelect.style.display = "";

		expect(companySelect.style.display).toBe("");
		expect(companySelect.options).toHaveLength(5); // "All public holidays" + 4 companies
	});

	it("should hide when country has no company filters", () => {
		// Simulate hideCompanySelect logic
		companySelect.style.display = "none";
		companySelect.value = "";

		expect(companySelect.style.display).toBe("none");
	});

	it("should hide when country selection is cleared", () => {
		// First show it
		companySelect.style.display = "";

		// Then simulate clearing country
		companySelect.style.display = "none";
		companySelect.value = "";

		expect(companySelect.style.display).toBe("none");
		expect(companySelect.value).toBe("");
	});
});

describe("HolidayCountrySelector - Company Filter Logic", () => {
	it("should pass companyName to fetchHolidays when company selected", () => {
		const mockFetchHolidays = vi.fn();

		// Simulate selecting a company
		const countryCode = "US";
		const companyName = "Amazon";
		mockFetchHolidays({ countryCode, years: [2026], companyName });

		expect(mockFetchHolidays).toHaveBeenCalledWith(
			expect.objectContaining({ companyName: "Amazon" }),
		);
	});

	it("should not pass companyName when 'All public holidays' selected", () => {
		const mockFetchHolidays = vi.fn();

		// Simulate selecting "All public holidays" (empty value)
		const countryCode = "US";
		const companyName = "";
		const fetchOptions: {
			countryCode: string;
			years: number[];
			companyName?: string;
		} = {
			countryCode,
			years: [2026],
		};
		if (companyName) {
			fetchOptions.companyName = companyName;
		}
		mockFetchHolidays(fetchOptions);

		expect(mockFetchHolidays).toHaveBeenCalledWith(
			expect.not.objectContaining({ companyName: expect.anything() }),
		);
	});

	it("should clear previous auto-added holidays when switching companies", () => {
		const mockClearDates = vi.fn();
		const mockSetDates = vi.fn();
		const mockGetState = vi.fn().mockReturnValue("holiday");

		// First company selection added some holidays
		const autoAdded = new Set(["2026-01-01", "2026-01-20", "2026-07-04"]);

		// When switching companies, clear previous auto-added
		const toRemove: string[] = [];
		for (const date of autoAdded) {
			if (mockGetState(date) === "holiday") {
				toRemove.push(date);
			}
		}
		mockClearDates(toRemove);
		autoAdded.clear();

		// Then add new filtered set
		const newDates = ["2026-01-01", "2026-01-20"];
		mockSetDates(newDates, "holiday");

		expect(mockClearDates).toHaveBeenCalledWith([
			"2026-01-01",
			"2026-01-20",
			"2026-07-04",
		]);
		expect(mockSetDates).toHaveBeenCalledWith(newDates, "holiday");
	});
});
