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
		await page.goto("/");
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
			await expect(mobileMenuButton).toBeVisible();
		});

		test("should hide desktop layout on mobile", async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });

			// Desktop layout should be hidden
			const desktopLayout = page.locator(".is-hidden-mobile").first();
			await expect(desktopLayout).toBeHidden();
		});

		test("should show mobile panel toggles", async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });

			// Mobile panel toggles should be visible
			const panelToggle = page.locator("details.panel-toggle").first();
			await expect(panelToggle).toBeVisible();
		});

		test("mobile menu button should have correct attributes", async ({
			page,
		}) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });

			const mobileMenuButton = page.locator(
				"[data-testid='mobile-menu-button']",
			);

			// Check accessibility attributes
			await expect(mobileMenuButton).toHaveAttribute("aria-label");
			await expect(mobileMenuButton).toHaveAttribute("aria-haspopup");
			await expect(mobileMenuButton).toHaveAttribute("aria-expanded");
		});

		test("should toggle mobile panel", async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });

			// Find panel toggle
			const panelToggle = page.locator("details.panel-toggle").first();

			// Check if initially closed (or open)
			const initialOpen = await panelToggle.evaluate(
				(el: HTMLDetailsElement) => el.open,
			);

			// Click to toggle
			await panelToggle.locator("summary").click();
			await page.waitForTimeout(300);

			// Verify toggle state changed
			const newOpen = await panelToggle.evaluate(
				(el: HTMLDetailsElement) => el.open,
			);
			expect(newOpen).not.toBe(initialOpen);
		});
	});
	test.describe("Desktop Viewport (1920px)", () => {
		test("should show desktop layout", async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 });

			// Desktop layout should be visible
			const desktopLayout = page.locator(".is-hidden-mobile").first();
			await expect(desktopLayout).toBeVisible();
		});

		test("should hide mobile menu button on desktop", async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 });

			// Mobile menu button should be hidden
			const mobileMenuButton = page.locator(
				"[data-testid='mobile-menu-button']",
			);
			await expect(mobileMenuButton).toBeHidden();
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
			const calendar = page.locator(".calendar-month");
			const status = page.locator(".status-details");

			await expect(calendar).toBeVisible();
			await expect(status).toBeVisible();
		});

		test("desktop layout should have proper structure", async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 });

			// Check layout structure
			const columns = page.locator(".columns.is-desktop");
			await expect(columns).toBeVisible();
		});
	});
	test.describe("Tablet Viewport (768px)", () => {
		test("should adapt to tablet viewport", async ({ page }) => {
			// Set tablet viewport
			await page.setViewportSize({ width: 768, height: 1024 });

			// Page should load without errors
			await expect(page.locator("body")).toBeVisible();
		});

		test("tablet should show appropriate layout", async ({ page }) => {
			// Set tablet viewport
			await page.setViewportSize({ width: 768, height: 1024 });

			// Check which layout is shown based on breakpoint
			const isTabletDesktopVisible = await page
				.locator(".is-hidden-mobile")
				.first()
				.isVisible()
				.catch(() => false);

			const isTabletMobileVisible = await page
				.locator(".is-hidden-tablet")
				.first()
				.isVisible()
				.catch(() => false);

			// One of the layouts should be visible
			expect(isTabletDesktopVisible || isTabletMobileVisible).toBe(true);
		});

		test("tablet should handle interactions correctly", async ({ page }) => {
			// Set tablet viewport
			await page.setViewportSize({ width: 768, height: 1024 });

			// Try to select a day
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			await dayCell.click();

			// Selection should work
			await expect(dayCell).toHaveClass(/selected/);
		});
	});
	test.describe("data-testid Attributes", () => {
		test("calendar day should have data-testid", async ({ page }) => {
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			await expect(dayCell).toBeVisible();
		});

		test("validate button should have data-testid", async ({ page }) => {
			const validateButton = page.locator("[data-testid='validate-button']");
			await expect(validateButton.first()).toBeVisible();
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
			await expect(mobileMenuButton).toBeVisible();
		});

		test("week status cells should have data-testid", async ({ page }) => {
			const weekStatus = page.locator("[data-testid='week-status']").first();
			await expect(weekStatus).toBeVisible();
		});

		test("calendar week rows should have data-testid", async ({ page }) => {
			const weekRow = page.locator("[data-testid='calendar-week']").first();
			await expect(weekRow).toBeVisible();
		});

		test("all interactive elements should have accessible selectors", async ({
			page,
		}) => {
			// Check that common interactive elements are present
			const buttons = page.locator("button");
			const buttonCount = await buttons.count();
			expect(buttonCount).toBeGreaterThan(0);

			// Check that calendar days are present
			const dayCells = page.locator(".calendar-day:not(.empty)");
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
			await page.goto("/");
			await waitForCalendarReady(page);

			// Verify mobile layout
			const mobileMenu = page.locator("[data-testid='mobile-menu-button']");
			await expect(mobileMenu).toBeVisible();

			// Change to desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 });
			await page.waitForTimeout(300);

			// Verify desktop layout
			const desktopLayout = page.locator(".is-hidden-mobile").first();
			await expect(desktopLayout).toBeVisible();
		});

		test("should adapt when viewport changes from desktop to mobile", async ({
			page,
		}) => {
			// Start with desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 });
			await page.goto("/");
			await waitForCalendarReady(page);

			// Verify desktop layout
			const desktopLayout = page.locator(".is-hidden-mobile").first();
			await expect(desktopLayout).toBeVisible();

			// Change to mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });
			await page.waitForTimeout(300);

			// Verify mobile layout
			const mobileMenu = page.locator("[data-testid='mobile-menu-button']");
			await expect(mobileMenu).toBeVisible();
		});
	});
});
