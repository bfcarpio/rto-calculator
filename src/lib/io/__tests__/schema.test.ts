import { describe, expect, it } from "vitest";
import { validateExportData } from "../schema";

function validPayload(overrides?: Record<string, unknown>) {
	return {
		version: 1,
		exportDate: "2026-02-13T00:00:00.000Z",
		categories: {
			oof: {
				label: "Work From Home",
				color: "#ef4444",
				emoji: "🏠",
				dates: ["2026-01-05"],
			},
			holiday: { label: "Holiday", color: "#f59e0b", emoji: "☀️", dates: [] },
			sick: { label: "Sick Day", color: "#1890ff", emoji: "💊", dates: [] },
		},
		...overrides,
	};
}

describe("validateExportData", () => {
	it("validates correct export data", () => {
		expect(validateExportData(validPayload()).success).toBe(true);
	});

	it("rejects version !== 1", () => {
		expect(validateExportData(validPayload({ version: 2 })).success).toBe(
			false,
		);
		expect(validateExportData(validPayload({ version: 0 })).success).toBe(
			false,
		);
	});

	it("rejects unknown category keys", () => {
		const data = validPayload();
		(data.categories as Record<string, unknown>).unknown = {
			label: "X",
			color: "#000",
			emoji: "?",
			dates: [],
		};
		expect(validateExportData(data).success).toBe(false);
	});

	it("rejects invalid date format in dates array", () => {
		const data = validPayload();
		data.categories.oof.dates = ["not-a-date"];
		expect(validateExportData(data).success).toBe(false);
	});

	it("accepts empty dates arrays", () => {
		const data = validPayload();
		data.categories.oof.dates = [];
		expect(validateExportData(data).success).toBe(true);
	});

	it("accepts valid ranges", () => {
		const data = validPayload();
		(data.categories.oof as Record<string, unknown>).ranges = [
			{ start: "2026-01-05", end: "2026-01-08" },
		];
		expect(validateExportData(data).success).toBe(true);
	});

	it("rejects invalid date format in ranges", () => {
		const data = validPayload();
		(data.categories.oof as Record<string, unknown>).ranges = [
			{ start: "01/05/2026", end: "2026-01-08" },
		];
		expect(validateExportData(data).success).toBe(false);
	});

	it("accepts missing ranges (backward compat)", () => {
		const data = validPayload();
		expect(data.categories.oof).not.toHaveProperty("ranges");
		expect(validateExportData(data).success).toBe(true);
	});

	it("settings field is optional", () => {
		const data = validPayload();
		delete (data as Record<string, unknown>).settings;
		expect(validateExportData(data).success).toBe(true);
	});
});
