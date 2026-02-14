import { describe, expect, it } from "vitest";
import { deriveBgColor, deriveTextColor } from "../color";

describe("deriveBgColor", () => {
	it("lightens red", () => {
		const bg = deriveBgColor("#ef4444");
		const r = Number.parseInt(bg.slice(1, 3), 16);
		expect(r).toBeGreaterThan(240);
	});

	it("lightens blue", () => {
		const bg = deriveBgColor("#1890ff");
		const b = Number.parseInt(bg.slice(5, 7), 16);
		expect(b).toBe(255); // already 0xff, stays max
	});

	it("returns valid hex", () => {
		expect(deriveBgColor("#ef4444")).toMatch(/^#[0-9a-f]{6}$/);
	});
});

describe("deriveTextColor", () => {
	it("returns white for dark colors", () => {
		expect(deriveTextColor("#ef4444")).toBe("#ffffff");
	});

	it("returns dark for light colors", () => {
		expect(deriveTextColor("#fef3c7")).toBe("#1e293b");
	});
});
