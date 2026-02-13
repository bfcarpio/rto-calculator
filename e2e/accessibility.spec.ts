import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("should have no accessibility violations", async ({ page }) => {
	await page.goto("/");
	const results = await new AxeBuilder({ page }).analyze();
	expect(results.violations).toEqual([]);
});
