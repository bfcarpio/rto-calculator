import { describe, expect, it, test } from "vitest";
import type { DotInfo } from "../weekDot";
import { buildDotClass, buildDotHtml } from "../weekDot";

describe("buildDotClass", () => {
	test.each([
		{
			isBest: true,
			isCompliant: true,
			officeDays: 3,
			expected: "we-dot we-dot--best-ok",
		},
		{
			isBest: true,
			isCompliant: false,
			officeDays: 2,
			expected: "we-dot we-dot--best-bad",
		},
		{
			isBest: false,
			isCompliant: true,
			officeDays: 3,
			expected: "we-dot we-dot--drop-ok",
		},
		{
			isBest: false,
			isCompliant: false,
			officeDays: 2,
			expected: "we-dot we-dot--drop-bad",
		},
	])("returns '$expected' when isBest=$isBest and isCompliant=$isCompliant", ({
		isBest,
		isCompliant,
		officeDays,
		expected,
	}) => {
		expect(
			buildDotClass({
				weekStart: new Date(2025, 0, 6),
				officeDays,
				isBest,
				isCompliant,
			}),
		).toBe(expected);
	});
});

describe("buildDotHtml", () => {
	it("renders evaluated+compliant dot with correct classes and aria", () => {
		const info: DotInfo = {
			weekStart: new Date(2025, 0, 6),
			officeDays: 3,
			isBest: true,
			isCompliant: true,
		};
		const html = buildDotHtml(info);
		expect(html).toContain("we-dot--best-ok");
		expect(html).toContain('role="img"');
		expect(html).toContain(
			'aria-label="Jan 6: 3 office days, evaluated, compliant"',
		);
		expect(html).toContain("Jan 6: 3 days</span>");
		expect(html).toContain("we-dot-wrap");
		expect(html).toContain("we-dot-tip");
	});

	it("renders evaluated+non-compliant dot", () => {
		const info: DotInfo = {
			weekStart: new Date(2025, 0, 6),
			officeDays: 2,
			isBest: true,
			isCompliant: false,
		};
		const html = buildDotHtml(info);
		expect(html).toContain("we-dot--best-bad");
		expect(html).toContain("Jan 6: 2 office days, evaluated, non-compliant");
		expect(html).toContain("Jan 6: 2 days</span>");
	});

	it("renders dropped+compliant dot with (dropped) in tip", () => {
		const info: DotInfo = {
			weekStart: new Date(2025, 0, 13),
			officeDays: 3,
			isBest: false,
			isCompliant: true,
		};
		const html = buildDotHtml(info);
		expect(html).toContain("we-dot--drop-ok");
		expect(html).toContain("Jan 13: 3 office days, dropped, compliant");
		expect(html).toContain("Jan 13: 3 days (dropped)");
	});

	it("renders dropped+non-compliant dot", () => {
		const info: DotInfo = {
			weekStart: new Date(2025, 0, 13),
			officeDays: 1,
			isBest: false,
			isCompliant: false,
		};
		const html = buildDotHtml(info);
		expect(html).toContain("we-dot--drop-bad");
		expect(html).toContain("Jan 13: 1 office days, dropped, non-compliant");
		expect(html).toContain("Jan 13: 1 days (dropped)");
	});

	it("hides tip text with aria-hidden", () => {
		const info: DotInfo = {
			weekStart: new Date(2025, 0, 6),
			officeDays: 3,
			isBest: true,
			isCompliant: true,
		};
		const html = buildDotHtml(info);
		expect(html).toContain('aria-hidden="true"');
	});
});
