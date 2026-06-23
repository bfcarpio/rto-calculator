/**
 * Date Parsing Consistency Tests
 *
 * Documents the known bug pattern: new Date("YYYY-MM-DD") parses as UTC midnight,
 * not local midnight. In UTC-negative timezones (EST, CST, PST, etc.),
 * this causes dates to display one day earlier.
 *
 * For example, in UTC-5:
 *   new Date("2025-03-22")        → UTC midnight → Mar 21 7pm local (WRONG day)
 *   new Date(2025, 2, 22)         → Local midnight → Mar 22 midnight (CORRECT)
 *   new Date("2025-03-22T00:00:00") → Local midnight → Mar 22 midnight (CORRECT)
 *
 * The fix: always use new Date(year, month, day) or new Date("YYYY-MM-DDT00:00:00")
 * when constructing dates that should represent local midnight.
 */

import { describe, expect, it } from "vitest";
import { getStartOfWeek } from "../validation/rto-core";

describe("Date parsing consistency", () => {
	it('new Date("YYYY-MM-DD") parses as UTC, not local time', () => {
		// ISO date string without time component is parsed as UTC midnight.
		// Numeric constructor (year, month, day) creates local midnight.
		// In UTC+0 timezones the timestamps happen to be equal,
		// but in any other timezone they differ — the root cause of the "off-by-one day" bug.
		const utcDate = new Date("2025-03-22");
		const localDate = new Date(2025, 2, 22); // March 22, 2025 local midnight

		// In non-UTC timezones, timestamps differ because UTC midnight
		// is not local midnight
		const timezoneOffsetMinutes = new Date().getTimezoneOffset();
		if (timezoneOffsetMinutes !== 0) {
			expect(utcDate.getTime()).not.toBe(localDate.getTime());
		}

		// Regardless of timezone, the numeric constructor always produces local midnight
		expect(localDate.getHours()).toBe(0);
		expect(localDate.getMinutes()).toBe(0);
		expect(localDate.getSeconds()).toBe(0);

		// The ISO string produces a date whose local representation may shift
		// e.g., in UTC-5, "2025-03-22" appears as March 21 at 7pm local time
		if (timezoneOffsetMinutes > 0) {
			// UTC-negative timezone: UTC midnight shifts the date back locally
			expect(utcDate.getDate()).toBeLessThan(localDate.getDate());
		}
	});

	it('new Date("YYYY-MM-DDT00:00:00") parses as local time', () => {
		// Adding the T00:00:00 suffix forces local-time interpretation,
		// making it equivalent to the numeric constructor.
		const localTimeString = new Date("2025-03-22T00:00:00");
		const localDate = new Date(2025, 2, 22);

		expect(localTimeString.getFullYear()).toBe(localDate.getFullYear());
		expect(localTimeString.getMonth()).toBe(localDate.getMonth());
		expect(localTimeString.getDate()).toBe(localDate.getDate());
		expect(localTimeString.getDay()).toBe(localDate.getDay());
	});

	it("getStartOfWeek always returns Sunday (day 0)", () => {
		// Wednesday March 19, 2025
		const wednesday = new Date(2025, 2, 19);
		const result = getStartOfWeek(wednesday);

		expect(result.getDay()).toBe(0); // Sunday
		expect(result.getMonth()).toBe(2); // March
		expect(result.getDate()).toBe(16); // March 16, 2025
	});

	it("getStartOfWeek returns same day for Sunday input", () => {
		const sunday = new Date(2025, 2, 16);
		const result = getStartOfWeek(sunday);

		expect(result.getDay()).toBe(0);
		expect(result.getDate()).toBe(16);
	});
});
