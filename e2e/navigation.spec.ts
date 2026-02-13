/**
 * Navigation Tests
 *
 * Basic navigation and page load tests for the RTO Calculator.
 * Verifies that the main page loads correctly, has the expected
 * title, and navigation works as expected.
 *
 * @module navigation.spec
 */

import { expect, test } from "@playwright/test";
import { waitForCalendarReady } from "./test-helpers";

test.describe("Navigation", () => {
	test.describe("Page Load", () => {
		test("should load the main page successfully", async ({ page }) => {
			// Navigate to the main page
			const response = await page.goto("/");

			// Verify page loaded successfully
			expect(response?.status()).toBe(200);
		});

		test("should have correct page title", async ({ page }) => {
			// Navigate to main page
			await page.goto("/");

			// Verify title contains 'RTO Calculator'
			await expect(page).toHaveTitle(/RTO Calculator/i);
		});

		test("should display main heading", async ({ page }) => {
			// Navigate to main page
			await page.goto("/");

			// Verify main heading is visible
			const heading = page.locator('h1:has-text("RTO")');
			await expect(heading).toBeVisible();
		});

		test("should have correct meta description", async ({ page }) => {
			// Navigate to main page
			await page.goto("/");

			// Get meta description
			const metaDescription = page.locator('meta[name="description"]');
			const content = await metaDescription.getAttribute("content");

			// Verify description exists and is not empty
			expect(content).toBeTruthy();
			expect(content?.length).toBeGreaterThan(0);
		});
	});
	test.describe("URL Routing", () => {
		test("should handle root URL", async ({ page }) => {
			// Test root URL
			await page.goto("/");

			// Verify page loaded
			await expect(page.locator("body")).toBeVisible();
		});

		test("should handle hash URLs", async ({ page }) => {
			// Test URL with hash
			await page.goto("/#settings");

			// Verify page loaded
			await expect(page.locator("body")).toBeVisible();
		});

		test("should maintain URL after page load", async ({ page }) => {
			// Navigate to page
			await page.goto("/");

			// Verify URL is correct
			const url = page.url();
			expect(url).toContain("localhost");
		});
	});
	test.describe("Page Structure", () => {
		test("should have header section", async ({ page }) => {
			await page.goto("/");
			await waitForCalendarReady(page);

			// Verify header exists
			const header = page.locator("header.hero");
			await expect(header).toBeVisible();
		});

		test("should have calendar section", async ({ page }) => {
			await page.goto("/");
			await waitForCalendarReady(page);

			// Verify calendar section exists
			const calendar = page.locator(".calendar-month");
			await expect(calendar).toBeVisible();
		});

		test("should have status/details section", async ({ page }) => {
			await page.goto("/");
			await waitForCalendarReady(page);

			// Verify status section exists
			const status = page.locator(".status-details");
			await expect(status).toBeVisible();
		});

		test("should have footer section", async ({ page }) => {
			await page.goto("/");
			await waitForCalendarReady(page);

			// Verify footer exists
			const footer = page.locator("footer.footer");
			await expect(footer).toBeVisible();
		});

		test("should have action buttons section", async ({ page }) => {
			await page.goto("/");
			await waitForCalendarReady(page);

			// Verify action buttons exist
			const buttons = page.locator(".action-buttons");
			await expect(buttons).toBeVisible();
		});
	});
	test.describe("Responsive Layout", () => {
		test("desktop should show two-column layout", async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 });
			await page.goto("/");
			await waitForCalendarReady(page);

			// Verify desktop layout is visible
			const desktopLayout = page.locator(".is-hidden-mobile");
			await expect(desktopLayout.first()).toBeVisible();
		});

		test("mobile should show mobile layout", async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto("/");
			await waitForCalendarReady(page);

			// Verify mobile layout is visible
			const mobileLayout = page.locator(".is-hidden-tablet");
			await expect(mobileLayout.first()).toBeVisible();
		});
	});
});
