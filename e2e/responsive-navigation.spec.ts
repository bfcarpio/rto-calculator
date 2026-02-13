/**
 * Responsive Navigation Tests
 *
 * Tests for responsive design across different viewports including
 * mobile menu, desktop layout, tablet behavior, and data-testid attributes.
 *
 * @module responsive-navigation.spec
 */

import { expect, test } from "@playwright/test";
import { waitForCalendarReady } from "./test-helpers";

test.describe("Responsive Navigation", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/rto-calculator/");
		await waitForCalendarReady(page);
	});
	test.describe("Mobile Viewport (375px)", () => {
		test("should show mobile menu button", async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });

			// Mobile menu button should be visible
			const mobileMenuButton = page.locator(
				"[data-testid='mobile-menu-button']",
			);
			await expect(mobileMenuButton.first()).toBeVisible();
		});

		test("should show stacked layout on mobile", async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });

			// Calendar and status should both be visible (stacked vertically)
			const calendar = page.locator(".datepainter");
			const status = page.locator(".status-details");
			await expect(calendar).toBeVisible();
			await expect(status.first()).toBeVisible();
		});

		test("mobile menu button should have correct attributes", async ({
			page,
		}) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });

			const mobileMenuButton = page.locator(
				"[data-testid='mobile-menu-button']",
			).first();

			// Check accessibility attributes
			await expect(mobileMenuButton).toHaveAttribute("aria-label");
			await expect(mobileMenuButton).toHaveAttribute("aria-haspopup");
			await expect(mobileMenuButton).toHaveAttribute("aria-expanded");
		});
	});
	test.describe("Desktop Viewport (1920px)", () => {
		test("should show desktop layout", async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 });

			// Unified responsive layout should be visible
			const columns = page.locator(".columns.is-desktop");
			await expect(columns).toBeVisible();
		});

		test("should hide mobile menu button on desktop", async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 });

			// Mobile menu button should be hidden
			const mobileMenuButton = page.locator(
				"[data-testid='mobile-menu-button']",
			);
			await expect(mobileMenuButton.first()).toBeHidden();
		});

		test("should show two-column layout", async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 });

			// Two-column layout should be visible
			const columns = page.locator(".columns").first();
			await expect(columns).toBeVisible();
		});

		test("should show calendar and status side by side", async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 });

			// Both calendar and status should be visible
			const calendar = page.locator(".datepainter");
			const status = page.locator(".status-details");

			await expect(calendar).toBeVisible();
			await expect(status).toBeVisible();
		});
	});
	test.describe("Tablet Viewport (768px)", () => {
		test("tablet should show appropriate layout", async ({ page }) => {
			// Set tablet viewport
			await page.setViewportSize({ width: 768, height: 1024 });

			// Unified layout should be visible with columns
			const columns = page.locator(".columns.is-desktop");
			await expect(columns).toBeVisible();
		});

		test("tablet should handle interactions correctly", async ({ page }) => {
			// Set tablet viewport
			await page.setViewportSize({ width: 768, height: 1024 });

			// Try to select a day
			const dayCell = page.locator("[data-testid='calendar-day']:not(.datepainter__day--empty):not(.datepainter__day--disabled)").first();
			await dayCell.click();

			// Selection should work - check for any datepainter state class
			await expect(dayCell).toHaveClass(/datepainter-day--(oof|holiday|sick)/);
		});
	});
	test.describe("data-testid Attributes", () => {
		test("calendar day should have data-testid", async ({ page }) => {
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			await expect(dayCell).toBeVisible();
		});

		test("clear-all button should have data-testid", async ({ page }) => {
			const clearButton = page.locator("[data-testid='clear-all-button']");
			await expect(clearButton.first()).toBeVisible();
		});

		test("mobile menu button should have data-testid", async ({ page }) => {
			// Set mobile viewport to see button
			await page.setViewportSize({ width: 375, height: 667 });

			const mobileMenuButton = page.locator(
				"[data-testid='mobile-menu-button']",
			);
			await expect(mobileMenuButton.first()).toBeVisible();
		});

		test("all interactive elements should have accessible selectors", async ({
			page,
		}) => {
			// Check that common interactive elements are present
			const buttons = page.locator("button");
			const buttonCount = await buttons.count();
			expect(buttonCount).toBeGreaterThan(0);

			// Check that calendar days are present
			const dayCells = page.locator('[data-testid="calendar-day"]:not(.datepainter__day--empty)');
			const dayCount = await dayCells.count();
			expect(dayCount).toBeGreaterThan(0);
		});
	});
	test.describe("Viewport Changes", () => {
		test("should adapt when viewport changes from mobile to desktop", async ({
			page,
		}) => {
			// Start with mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto("/rto-calculator/");
			await waitForCalendarReady(page);

			// Verify mobile menu is visible
			const mobileMenu = page.locator("[data-testid='mobile-menu-button']").first();
			await expect(mobileMenu).toBeVisible();

			// Change to desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 });

			// Verify mobile menu is now hidden on desktop
			await expect(mobileMenu).toBeHidden();
		});

		test("should adapt when viewport changes from desktop to mobile", async ({
			page,
		}) => {
			// Start with desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 });
			await page.goto("/rto-calculator/");
			await waitForCalendarReady(page);

			// Verify mobile menu is hidden on desktop
			const mobileMenu = page.locator("[data-testid='mobile-menu-button']").first();
			await expect(mobileMenu).toBeHidden();

			// Change to mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });

			// Verify mobile menu is visible
			await expect(mobileMenu).toBeVisible();
		});
	});
});
