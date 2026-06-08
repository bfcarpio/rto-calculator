import { describe, expect, it } from "vitest";
import type { DotInfo } from "../weekDot";
import { buildDotClass, buildDotHtml } from "../weekDot";

describe("buildDotClass", () => {
	it("returns 'we-dot we-dot--best-ok' when isBest=true and isCompliant=true", () => {
		expect(
			buildDotClass({
				weekStart: new Date(2025, 0, 6),
				officeDays: 3,
				isBest: true,
				isCompliant: true,
			}),
		).toBe("we-dot we-dot--best-ok");
	});

	it("returns 'we-dot we-dot--best-bad' when isBest=true and isCompliant=false", () => {
		expect(
			buildDotClass({
				weekStart: new Date(2025, 0, 6),
				officeDays: 2,
				isBest: true,
				isCompliant: false,
			}),
		).toBe("we-dot we-dot--best-bad");
	});

	it("returns 'we-dot we-dot--drop-ok' when isBest=false and isCompliant=true", () => {
		expect(
			buildDotClass({
				weekStart: new Date(2025, 0, 6),
				officeDays: 3,
				isBest: false,
				isCompliant: true,
			}),
		).toBe("we-dot we-dot--drop-ok");
	});

	it("returns 'we-dot we-dot--drop-bad' when isBest=false and isCompliant=false", () => {
		expect(
			buildDotClass({
				weekStart: new Date(2025, 0, 6),
				officeDays: 2,
				isBest: false,
				isCompliant: false,
			}),
		).toBe("we-dot we-dot--drop-bad");
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
