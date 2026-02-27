/**
 * SettingIndicator Tests
 *
 * Tests the SettingIndicator component renders correctly as inline element
 * and responds to config change events.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("SettingIndicator - Rendering", () => {
	beforeEach(() => {
		// Mock ValidationManager for initial value
		vi.stubGlobal("validationManager", {
			getConfig: vi.fn().mockReturnValue({
				totalWeekdaysPerWeek: 5,
			}),
		});

		// Set up the same HTML structure that SettingIndicator.astro renders
		document.body.innerHTML = `
			<span
				class="setting-indicator"
				data-setting-key="totalWeekdaysPerWeek"
				title="Setting: totalWeekdaysPerWeek = 5"
			>
				<span class="control">
					<span class="tag is-light">Weekdays</span>
				</span>
				<span class="control">
					<span
						class="has-text-weight-semibold setting-value"
						data-setting-key="totalWeekdaysPerWeek"
					>5</span>
				</span>
			</span>
		`;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("should render as span element (not div)", () => {
		// SettingIndicator.astro renders as <span> for inline use
		const wrapper = document.querySelector(".setting-indicator");
		expect(wrapper).toBeTruthy();
		expect(wrapper!.tagName.toLowerCase()).toBe("span");
	});

	it("should have inline flex display CSS", async () => {
		// Verify the component has inline display style for inline use
		// Note: The CSS is in a <style> block in the Astro component, not inline on the element.
		// We verify the CSS class is defined in the component source.
		const wrapper = document.querySelector(".setting-indicator");
		expect(wrapper).toBeTruthy();

		// Read the component source to verify CSS is defined
		const { readFile } = await import("node:fs/promises");
		const componentSource = await readFile(
			"./src/components/SettingIndicator.astro",
			"utf-8",
		);

		// Verify the CSS defines inline-flex display
		expect(componentSource).toContain("display: inline-flex");
		expect(componentSource).toContain(".setting-indicator");
	});

	it("should have data-setting-key attribute", () => {
		const wrapper = document.querySelector(
			".setting-indicator[data-setting-key]",
		);
		expect(wrapper).toBeTruthy();
	});
});

describe("SettingIndicator - Event Listener", () => {
	// Helper function that simulates what SettingIndicator.astro script does
	const attachEventListeners = () => {
		const wrappers = document.querySelectorAll(
			".setting-indicator[data-setting-key]",
		);
		wrappers.forEach((wrapper) => {
			const settingKey = wrapper.getAttribute("data-setting-key");
			const valueEl = wrapper.querySelector(".setting-value");
			const tooltipEl = wrapper.querySelector(".sr-only");

			if (!settingKey || !valueEl) return;

			window.addEventListener("rto:state-changed", (ev) => {
				const detail = (ev as CustomEvent).detail;
				if (!detail || detail.type !== "config" || !detail.settingKey) return;

				if (detail.settingKey === settingKey) {
					const newValue = detail.newValue;
					valueEl.textContent = String(newValue);
					wrapper.setAttribute("title", `Setting: ${settingKey} = ${newValue}`);
					if (tooltipEl)
						tooltipEl.textContent = `Setting: ${settingKey} = ${newValue}`;
				}
			});
		});
	};

	beforeEach(() => {
		// Set up the same HTML structure that SettingIndicator.astro renders
		document.body.innerHTML = `
			<span
				class="setting-indicator"
				data-setting-key="totalWeekdaysPerWeek"
				title="Setting: totalWeekdaysPerWeek = 5"
				aria-describedby="setting-indicator-tooltip-totalWeekdaysPerWeek"
			>
				<span class="control">
					<span class="tag is-light" aria-label="Weekdays">Weekdays</span>
				</span>
				<span class="control">
					<span
						id="setting-indicator-value-totalWeekdaysPerWeek"
						class="has-text-weight-semibold setting-value"
						data-setting-key="totalWeekdaysPerWeek"
					>5</span>
				</span>
				<span id="setting-indicator-tooltip-totalWeekdaysPerWeek" class="sr-only">Setting: totalWeekdaysPerWeek = 5</span>
			</span>
		`;

		// Attach the event listener (simulating what the Astro component script does)
		attachEventListeners();
	});

	it("should update value when rto:state-changed event fires with type 'config'", () => {
		const valueEl = document.querySelector(".setting-value");
		expect(valueEl).toBeTruthy();
		expect(valueEl!.textContent).toBe("5");

		// Dispatch unified state change event
		const event = new CustomEvent("rto:state-changed", {
			detail: {
				type: "config",
				settingKey: "totalWeekdaysPerWeek",
				newValue: 4,
				oldValue: 5,
			},
		});
		window.dispatchEvent(event);

		expect(valueEl!.textContent).toBe("4");
	});

	it("should update tooltip title when rto:state-changed event fires with type 'config'", () => {
		const wrapper = document.querySelector(".setting-indicator");
		expect(wrapper).toBeTruthy();
		expect(wrapper!.getAttribute("title")).toBe(
			"Setting: totalWeekdaysPerWeek = 5",
		);

		// Dispatch unified state change event
		const event = new CustomEvent("rto:state-changed", {
			detail: {
				type: "config",
				settingKey: "totalWeekdaysPerWeek",
				newValue: 3,
				oldValue: 5,
			},
		});
		window.dispatchEvent(event);

		expect(wrapper!.getAttribute("title")).toBe(
			"Setting: totalWeekdaysPerWeek = 3",
		);
	});

	it("should update sr-only tooltip text when rto:state-changed event fires with type 'config'", () => {
		const tooltipEl = document.querySelector(".sr-only");
		expect(tooltipEl).toBeTruthy();
		expect(tooltipEl!.textContent).toBe("Setting: totalWeekdaysPerWeek = 5");

		// Dispatch unified state change event
		const event = new CustomEvent("rto:state-changed", {
			detail: {
				type: "config",
				settingKey: "totalWeekdaysPerWeek",
				newValue: 2,
				oldValue: 5,
			},
		});
		window.dispatchEvent(event);

		expect(tooltipEl!.textContent).toBe("Setting: totalWeekdaysPerWeek = 2");
	});

	it("should only update matching setting key", () => {
		const valueEl = document.querySelector(".setting-value");
		expect(valueEl!.textContent).toBe("5");

		// Dispatch event for different setting key
		const event = new CustomEvent("rto:state-changed", {
			detail: {
				type: "config",
				settingKey: "otherSetting",
				newValue: 99,
				oldValue: 0,
			},
		});
		window.dispatchEvent(event);

		// Value should not change
		expect(valueEl!.textContent).toBe("5");
	});

	it("should ignore non-config events", () => {
		const valueEl = document.querySelector(".setting-value");
		expect(valueEl!.textContent).toBe("5");

		// Dispatch event with different type
		const event = new CustomEvent("rto:state-changed", {
			detail: { type: "settings" },
		});
		window.dispatchEvent(event);

		// Value should not change
		expect(valueEl!.textContent).toBe("5");
	});

	it("should handle string newValue values", () => {
		const valueEl = document.querySelector(".setting-value");
		expect(valueEl!.textContent).toBe("5");

		// Dispatch unified state change event with string value
		const event = new CustomEvent("rto:state-changed", {
			detail: {
				type: "config",
				settingKey: "totalWeekdaysPerWeek",
				newValue: "4",
				oldValue: 5,
			},
		});
		window.dispatchEvent(event);

		// Value should be converted to string
		expect(valueEl!.textContent).toBe("4");
	});
});
