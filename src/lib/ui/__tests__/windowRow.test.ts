/**
 * Window Row Rendering Tests
 *
 * Tests for buildWindowRowHtml — the shared function used by both
 * WindowExplorer and WindowBreakdown to render a single window row.
 */

import { describe, expect, it } from "vitest";
import type { WindowSummary } from "../../validation/all-windows";
import { buildWindowRowHtml } from "../windowRow";

// ─── Test Fixtures ───────────────────────────────────────────────────────

function createMockSummary(
	overrides: Partial<WindowSummary> = {},
): WindowSummary {
	return {
		windowIndex: 0,
		windowStart: new Date(2025, 0, 5), // Jan 5 (Sunday)
		windowEnd: new Date(2025, 2, 28), // Mar 28 (Friday)
		isValid: true,
		averageOfficeDays: 3.5,
		weekDetails: [
			{
				weekStart: new Date(2025, 0, 5),
				officeDays: 4,
				isBest: true,
				isCompliant: true,
			},
			{
				weekStart: new Date(2025, 0, 12),
				officeDays: 3,
				isBest: true,
				isCompliant: true,
			},
		],
		...overrides,
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("buildWindowRowHtml", () => {
	it("should contain we-row wrapper div", () => {
		const html = buildWindowRowHtml(createMockSummary());
		expect(html).toContain('class="we-row"');
	});

	it("should render we-row-label with date range", () => {
		const html = buildWindowRowHtml(createMockSummary());
		expect(html).toContain("we-row-label");
		// Should contain formatted dates from buildWindowRangeLabel
		expect(html).toContain("Jan 5");
	});

	it("should render PASS tag when isValid is true", () => {
		const html = buildWindowRowHtml(createMockSummary({ isValid: true }));
		expect(html).toContain("we-row-tag--pass");
		expect(html).toContain(">PASS<");
	});

	it("should render FAIL tag when isValid is false", () => {
		const html = buildWindowRowHtml(createMockSummary({ isValid: false }));
		expect(html).toContain("we-row-tag--fail");
		expect(html).toContain(">FAIL<");
	});

	it("should render we-row-dots containing dot wrappers", () => {
		const html = buildWindowRowHtml(createMockSummary());
		expect(html).toContain("we-row-dots");
		expect(html).toContain("we-dot-wrap");
	});

	it("should render one dot per weekDetail", () => {
		const summary = createMockSummary({
			weekDetails: [
				{
					weekStart: new Date(2025, 0, 5),
					officeDays: 3,
					isBest: true,
					isCompliant: true,
				},
				{
					weekStart: new Date(2025, 0, 12),
					officeDays: 2,
					isBest: false,
					isCompliant: false,
				},
				{
					weekStart: new Date(2025, 0, 19),
					officeDays: 4,
					isBest: true,
					isCompliant: true,
				},
			],
		});
		const html = buildWindowRowHtml(summary);
		const dotMatches = html.match(/we-dot-wrap/g);
		expect(dotMatches).toHaveLength(3);
	});

	it("should render correct dot classes for best-ok weeks", () => {
		const summary = createMockSummary({
			weekDetails: [
				{
					weekStart: new Date(2025, 0, 5),
					officeDays: 4,
					isBest: true,
					isCompliant: true,
				},
			],
		});
		const html = buildWindowRowHtml(summary);
		expect(html).toContain("we-dot--best-ok");
	});

	it("should render correct dot classes for best-bad weeks", () => {
		const summary = createMockSummary({
			weekDetails: [
				{
					weekStart: new Date(2025, 0, 5),
					officeDays: 1,
					isBest: true,
					isCompliant: false,
				},
			],
		});
		const html = buildWindowRowHtml(summary);
		expect(html).toContain("we-dot--best-bad");
	});

	it("should render correct dot classes for drop-ok weeks", () => {
		const summary = createMockSummary({
			weekDetails: [
				{
					weekStart: new Date(2025, 0, 5),
					officeDays: 3,
					isBest: false,
					isCompliant: true,
				},
			],
		});
		const html = buildWindowRowHtml(summary);
		expect(html).toContain("we-dot--drop-ok");
	});

	it("should render correct dot classes for drop-bad weeks", () => {
		const summary = createMockSummary({
			weekDetails: [
				{
					weekStart: new Date(2025, 0, 5),
					officeDays: 1,
					isBest: false,
					isCompliant: false,
				},
			],
		});
		const html = buildWindowRowHtml(summary);
		expect(html).toContain("we-dot--drop-bad");
	});

	it("should render averageOfficeDays in we-row-avg", () => {
		const html = buildWindowRowHtml(
			createMockSummary({ averageOfficeDays: 3.75 }),
		);
		expect(html).toContain("we-row-avg");
		expect(html).toContain("3.8");
	});

	it("should handle empty weekDetails", () => {
		const html = buildWindowRowHtml(
			createMockSummary({ weekDetails: [], averageOfficeDays: 0 }),
		);
		expect(html).toContain("we-row");
		expect(html).toContain("we-row-avg");
		expect(html).toContain("0.0");
	});
});
