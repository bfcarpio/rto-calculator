import { expect, test } from "@playwright/test";

test("hello-world: page loads successfully", async ({ page }) => {
	// Navigate to app (baseURL configured in playwright.config.ts includes subdirectory)
	await page.goto("/");

	// Verify page title contains RTO
	await expect(page).toHaveTitle(/RTO/);

	// Verify h1 heading is visible
	const heading = page.locator("h1");
	await expect(heading).toBeVisible();

	console.log("✅ Hello World test passed!");
});
