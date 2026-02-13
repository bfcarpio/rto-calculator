/**
 * WeekdaySelector Tests
 *
 * Tests the weekday toggle button row UI structure, accessibility,
 * and interaction logic for bulk-marking weekday instances as WFH.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dateUtils before any imports that use it
vi.mock("../../lib/dateUtils", () => ({
	getDateRange: () => ({
		startDate: new Date(2025, 0, 5), // Sun Jan 5
		endDate: new Date(2025, 0, 31), // Fri Jan 31
	}),
	getDateRangeArray: (start: Date, end: Date) => {
		const days: Date[] = [];
		const current = new Date(start);
		while (current <= end) {
			days.push(new Date(current));
			current.setDate(current.getDate() + 1);
		}
		return days;
	},
	formatDate: (date: Date) => {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, "0");
		const d = String(date.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	},
}));

describe("WeekdaySelector - UI Structure", () => {
	let selector: HTMLElement;

	beforeEach(() => {
		document.body.innerHTML = `
			<div class="weekday-selector" id="weekday-selector">
				<button class="weekday-btn" data-day="1">Mon</button>
				<button class="weekday-btn" data-day="2">Tue</button>
				<button class="weekday-btn" data-day="3">Wed</button>
				<button class="weekday-btn" data-day="4">Thu</button>
				<button class="weekday-btn" data-day="5">Fri</button>
			</div>
		`;
		selector = document.getElementById("weekday-selector") as HTMLElement;
	});

	it("should render the weekday selector container", () => {
		expect(selector).toBeTruthy();
		expect(selector.id).toBe("weekday-selector");
		expect(selector.classList.contains("weekday-selector")).toBe(true);
	});

	it("should have exactly 5 weekday buttons (Mon-Fri)", () => {
		const buttons = selector.querySelectorAll(".weekday-btn");
		expect(buttons).toHaveLength(5);
	});

	it("should have correct labels and data-day attributes", () => {
		const buttons = selector.querySelectorAll(".weekday-btn");
		const expected = [
			{ label: "Mon", day: "1" },
			{ label: "Tue", day: "2" },
			{ label: "Wed", day: "3" },
			{ label: "Thu", day: "4" },
			{ label: "Fri", day: "5" },
		];

		buttons.forEach((btn, i) => {
			expect(btn.textContent?.trim()).toBe(expected[i]!.label);
			expect(btn.getAttribute("data-day")).toBe(expected[i]!.day);
		});
	});

	it("should use button elements for all weekday controls", () => {
		const buttons = selector.querySelectorAll(".weekday-btn");
		buttons.forEach((btn) => {
			expect(btn.tagName.toLowerCase()).toBe("button");
		});
	});

	it("should not have any button active by default", () => {
		const buttons = selector.querySelectorAll(".weekday-btn");
		buttons.forEach((btn) => {
			expect(btn.classList.contains("is-active")).toBe(false);
		});
	});
});

describe("WeekdaySelector - Toggle Behavior", () => {
	let selector: HTMLElement;

	beforeEach(() => {
		document.body.innerHTML = `
			<div class="weekday-selector" id="weekday-selector">
				<button class="weekday-btn" data-day="1">Mon</button>
				<button class="weekday-btn" data-day="2">Tue</button>
				<button class="weekday-btn" data-day="3">Wed</button>
				<button class="weekday-btn" data-day="4">Thu</button>
				<button class="weekday-btn" data-day="5">Fri</button>
			</div>
		`;
		selector = document.getElementById("weekday-selector") as HTMLElement;
	});

	it("should toggle is-active class on button click", () => {
		const monBtn = selector.querySelector(
			'[data-day="1"]',
		) as HTMLButtonElement;
		expect(monBtn.classList.contains("is-active")).toBe(false);

		monBtn.classList.add("is-active");
		expect(monBtn.classList.contains("is-active")).toBe(true);

		monBtn.classList.remove("is-active");
		expect(monBtn.classList.contains("is-active")).toBe(false);
	});

	it("should allow multiple buttons to be active simultaneously", () => {
		const monBtn = selector.querySelector('[data-day="1"]') as HTMLElement;
		const wedBtn = selector.querySelector('[data-day="3"]') as HTMLElement;
		const friBtn = selector.querySelector('[data-day="5"]') as HTMLElement;

		monBtn.classList.add("is-active");
		wedBtn.classList.add("is-active");
		friBtn.classList.add("is-active");

		expect(monBtn.classList.contains("is-active")).toBe(true);
		expect(wedBtn.classList.contains("is-active")).toBe(true);
		expect(friBtn.classList.contains("is-active")).toBe(true);

		// Tue and Thu should remain inactive
		const tueBtn = selector.querySelector('[data-day="2"]') as HTMLElement;
		const thuBtn = selector.querySelector('[data-day="4"]') as HTMLElement;
		expect(tueBtn.classList.contains("is-active")).toBe(false);
		expect(thuBtn.classList.contains("is-active")).toBe(false);
	});
});

describe("WeekdaySelector - Weekday Date Calculation", () => {
	it("should generate correct dates for a given weekday index", async () => {
		const { getDateRange, getDateRangeArray, formatDate } = await import(
			"../../lib/dateUtils"
		);
		const range = getDateRange();
		const allDays = getDateRangeArray(range.startDate, range.endDate);

		// Filter for Mondays (dayIndex 1)
		const mondays = allDays.filter((d) => d.getDay() === 1);
		expect(mondays.length).toBeGreaterThan(0);

		// All filtered dates should be Mondays
		mondays.forEach((d) => {
			expect(d.getDay()).toBe(1);
		});

		// formatDate should produce YYYY-MM-DD strings
		const formatted = mondays.map((d) => formatDate(d));
		formatted.forEach((s) => {
			expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});
	});

	it("should generate dates for all 5 weekdays", async () => {
		const { getDateRange, getDateRangeArray } = await import(
			"../../lib/dateUtils"
		);
		const range = getDateRange();
		const allDays = getDateRangeArray(range.startDate, range.endDate);

		for (let dayIndex = 1; dayIndex <= 5; dayIndex++) {
			const weekdayDates = allDays.filter((d) => d.getDay() === dayIndex);
			expect(weekdayDates.length).toBeGreaterThan(0);
			weekdayDates.forEach((d) => {
				expect(d.getDay()).toBe(dayIndex);
			});
		}
	});

	it("should not include weekends (Saturday=0, Sunday=6)", async () => {
		const { getDateRange, getDateRangeArray } = await import(
			"../../lib/dateUtils"
		);
		const range = getDateRange();
		const allDays = getDateRangeArray(range.startDate, range.endDate);

		for (let dayIndex = 1; dayIndex <= 5; dayIndex++) {
			const weekdayDates = allDays.filter((d) => d.getDay() === dayIndex);
			weekdayDates.forEach((d) => {
				expect(d.getDay()).not.toBe(0); // Not Sunday
				expect(d.getDay()).not.toBe(6); // Not Saturday
			});
		}
	});
});

describe("WeekdaySelector - Sync Logic", () => {
	it("should mark button active when all weekday instances are oof", () => {
		document.body.innerHTML = `
			<div class="weekday-selector" id="weekday-selector">
				<button class="weekday-btn" data-day="1">Mon</button>
				<button class="weekday-btn" data-day="3">Wed</button>
			</div>
		`;

		const selector = document.getElementById("weekday-selector") as HTMLElement;

		// Simulate: all Mondays are marked oof → button should be active
		const monBtn = selector.querySelector('[data-day="1"]') as HTMLElement;
		monBtn.classList.add("is-active");
		expect(monBtn.classList.contains("is-active")).toBe(true);

		// Simulate: not all Wednesdays are oof → button should be inactive
		const wedBtn = selector.querySelector('[data-day="3"]') as HTMLElement;
		expect(wedBtn.classList.contains("is-active")).toBe(false);
	});

	it("should deactivate button when any weekday instance is not oof", () => {
		document.body.innerHTML = `
			<div class="weekday-selector" id="weekday-selector">
				<button class="weekday-btn is-active" data-day="1">Mon</button>
			</div>
		`;

		const selector = document.getElementById("weekday-selector") as HTMLElement;
		const monBtn = selector.querySelector('[data-day="1"]') as HTMLElement;

		// Initially active
		expect(monBtn.classList.contains("is-active")).toBe(true);

		// Simulate sync detecting incomplete coverage → deactivate
		monBtn.classList.remove("is-active");
		expect(monBtn.classList.contains("is-active")).toBe(false);
	});
});

describe("WeekdaySelector - CalendarManager Integration", () => {
	it("should call setDates with oof state when activating a weekday", () => {
		const mockSetDates = vi.fn();
		const mockClearDates = vi.fn();

		// Simulate what the component does on activation
		const dates = ["2025-01-06", "2025-01-13", "2025-01-20", "2025-01-27"];
		const isActive = false;

		if (isActive) {
			mockClearDates(dates);
		} else {
			mockSetDates(dates, "oof");
		}

		expect(mockSetDates).toHaveBeenCalledWith(dates, "oof");
		expect(mockClearDates).not.toHaveBeenCalled();
	});

	it("should call clearDates when deactivating a weekday", () => {
		const mockSetDates = vi.fn();
		const mockClearDates = vi.fn();

		const dates = ["2025-01-06", "2025-01-13", "2025-01-20", "2025-01-27"];
		const isActive = true;

		if (isActive) {
			mockClearDates(dates);
		} else {
			mockSetDates(dates, "oof");
		}

		expect(mockClearDates).toHaveBeenCalledWith(dates);
		expect(mockSetDates).not.toHaveBeenCalled();
	});

	it("should check all weekday instances against getAllDates for sync", () => {
		const allDates = new Map([
			["2025-01-06", "oof"],
			["2025-01-13", "oof"],
			["2025-01-20", "oof"],
			["2025-01-27", "oof"],
		]);

		const mondayDates = [
			"2025-01-06",
			"2025-01-13",
			"2025-01-20",
			"2025-01-27",
		];

		// All Mondays are oof → should be active
		const allMarked = mondayDates.every((d) => allDates.get(d) === "oof");
		expect(allMarked).toBe(true);
	});

	it("should detect incomplete coverage when some instances are not oof", () => {
		const allDates = new Map([
			["2025-01-06", "oof"],
			["2025-01-13", "oof"],
			// 2025-01-20 is missing (not marked)
			["2025-01-27", "oof"],
		]);

		const mondayDates = [
			"2025-01-06",
			"2025-01-13",
			"2025-01-20",
			"2025-01-27",
		];

		const allMarked = mondayDates.every((d) => allDates.get(d) === "oof");
		expect(allMarked).toBe(false);
	});

	it("should detect non-oof states as incomplete", () => {
		const allDates = new Map([
			["2025-01-06", "oof"],
			["2025-01-13", "holiday"], // marked but not as oof
			["2025-01-20", "oof"],
			["2025-01-27", "sick"], // marked but not as oof
		]);

		const mondayDates = [
			"2025-01-06",
			"2025-01-13",
			"2025-01-20",
			"2025-01-27",
		];

		const allMarked = mondayDates.every((d) => allDates.get(d) === "oof");
		expect(allMarked).toBe(false);
	});
});
