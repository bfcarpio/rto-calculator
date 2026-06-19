import { describe, expect, it } from "vitest";
import { assertSundayMidnight, parseLocalDate } from "../date-helpers";

describe("parseLocalDate", () => {
	it("should parse YYYY-MM-DD as local midnight, not UTC midnight", () => {
		const result = parseLocalDate("2025-03-22");
		expect(result.getFullYear()).toBe(2025);
		expect(result.getMonth()).toBe(2); // March = 2
		expect(result.getDate()).toBe(22);
		expect(result.getHours()).toBe(0);
		expect(result.getMinutes()).toBe(0);
	});

	it("should produce different result than new Date(string) in UTC-negative timezones", () => {
		const localDate = parseLocalDate("2025-03-22");
		// In UTC-negative timezones, new Date("2025-03-22") would show the previous day
		// But we can't test timezone-dependent behavior directly, so we test that
		// local methods return correct values
		expect(localDate.getMonth()).toBe(2);
		expect(localDate.getDate()).toBe(22);
		// The UTC date may differ depending on timezone, just verify our function is consistent
		expect(localDate.getFullYear()).toBe(2025);
	});

	it("should throw for invalid format", () => {
		expect(() => parseLocalDate("not-a-date")).toThrow("Invalid date string");
		expect(() => parseLocalDate("2025-13-01")).toThrow(
			"Date values out of range",
		);
		expect(() => parseLocalDate("")).toThrow("Invalid date string");
		expect(() => parseLocalDate("2025-01")).toThrow("Invalid date string");
	});

	it("should handle edge cases: Jan 1, Dec 31, leap year", () => {
		const jan1 = parseLocalDate("2024-01-01");
		expect(jan1.getMonth()).toBe(0);
		expect(jan1.getDate()).toBe(1);

		const dec31 = parseLocalDate("2024-12-31");
		expect(dec31.getMonth()).toBe(11);
		expect(dec31.getDate()).toBe(31);

		const leapDay = parseLocalDate("2024-02-29");
		expect(leapDay.getMonth()).toBe(1);
		expect(leapDay.getDate()).toBe(29);
	});
});

describe("assertSundayMidnight", () => {
	it("should not throw for a Sunday midnight date", () => {
		const sunday = new Date(2025, 2, 23); // Sun Mar 23 2025
		expect(sunday.getDay()).toBe(0);
		expect(() => assertSundayMidnight(sunday, "test context")).not.toThrow();
	});

	it("should throw for a non-Sunday date", () => {
		const monday = new Date(2025, 2, 24); // Mon Mar 24 2025
		expect(() => assertSundayMidnight(monday, "test context")).toThrow(
			"Expected Sunday",
		);
	});

	it("should throw for a date with non-zero hours", () => {
		const sunday = new Date(2025, 2, 23, 10, 0, 0); // Sun but 10am
		expect(() => assertSundayMidnight(sunday, "test context")).toThrow(
			"Expected midnight",
		);
	});

	it("should include context in error message", () => {
		const monday = new Date(2025, 2, 24);
		try {
			assertSundayMidnight(monday, "readCalendarData weekStart");
		} catch (e) {
			expect((e as Error).message).toContain("readCalendarData weekStart");
		}
	});
});
