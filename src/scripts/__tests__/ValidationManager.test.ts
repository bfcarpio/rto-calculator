/**
 * ValidationManager Tests
 *
 * Tests for config getters and state subscription system.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ValidationConfig } from "../../types/index";
import { ValidationManager } from "../ValidationManager";

describe("ValidationManager", () => {
	let manager: ValidationManager;

	beforeEach(() => {
		manager = new ValidationManager();
	});

	describe("getConfig", () => {
		it("should return default config values", () => {
			const config = manager.getConfig();
			expect(config.minOfficeDaysPerWeek).toBe(3);
			expect(config.totalWeekdaysPerWeek).toBe(5);
			expect(config.rollingPeriodWeeks).toBe(12);
			expect(config.thresholdPercentage).toBe(0.6);
		});

		it("should return updated values after config change", () => {
			manager.updateConfig({ minOfficeDaysPerWeek: 4 });
			expect(manager.getConfig().minOfficeDaysPerWeek).toBe(4);
		});

		it("should return total weekdays after config change", () => {
			manager.updateConfig({ totalWeekdaysPerWeek: 4 });
			expect(manager.getConfig().totalWeekdaysPerWeek).toBe(4);
		});

		it("should return rolling period weeks after config change", () => {
			manager.updateConfig({ rollingPeriodWeeks: 8 });
			expect(manager.getConfig().rollingPeriodWeeks).toBe(8);
		});

		it("should return threshold percentage after config change", () => {
			manager.updateConfig({ thresholdPercentage: 0.75 });
			expect(manager.getConfig().thresholdPercentage).toBe(0.75);
		});

		it("should return a copy, not a reference", () => {
			const config = manager.getConfig();
			config.minOfficeDaysPerWeek = 99;
			expect(manager.getConfig().minOfficeDaysPerWeek).toBe(3);
		});
	});

	describe("State Subscription", () => {
		describe("subscribe", () => {
			it("should register a callback that receives config on updates", () => {
				const callback = vi.fn();
				manager.subscribe(callback);

				manager.updateConfig({ minOfficeDaysPerWeek: 4 });

				expect(callback).toHaveBeenCalledTimes(1);
				expect(callback).toHaveBeenCalledWith(
					expect.objectContaining({ minOfficeDaysPerWeek: 4 }),
				);
			});

			it("should allow multiple subscribers", () => {
				const callback1 = vi.fn();
				const callback2 = vi.fn();

				manager.subscribe(callback1);
				manager.subscribe(callback2);

				manager.updateConfig({ minOfficeDaysPerWeek: 4 });

				expect(callback1).toHaveBeenCalledTimes(1);
				expect(callback2).toHaveBeenCalledTimes(1);
			});

			it("should not notify subscriber after unsubscribe", () => {
				const callback = vi.fn();
				manager.subscribe(callback);
				manager.unsubscribe(callback);

				manager.updateConfig({ minOfficeDaysPerWeek: 4 });

				expect(callback).not.toHaveBeenCalled();
			});
		});

		describe("unsubscribe", () => {
			it("should remove specific subscriber while keeping others", () => {
				const callback1 = vi.fn();
				const callback2 = vi.fn();

				manager.subscribe(callback1);
				manager.subscribe(callback2);
				manager.unsubscribe(callback1);

				manager.updateConfig({ minOfficeDaysPerWeek: 4 });

				expect(callback1).not.toHaveBeenCalled();
				expect(callback2).toHaveBeenCalledTimes(1);
			});

			it("should handle unsubscribe of non-existent callback gracefully", () => {
				const callback = vi.fn();

				// Should not throw when unsubscribing a callback that was never subscribed
				expect(() => manager.unsubscribe(callback)).not.toThrow();
			});
		});

		describe("subscriber receives full config", () => {
			it("should receive complete config object on subscription", () => {
				const callback = vi.fn();
				manager.subscribe(callback);

				manager.updateConfig({ debug: true });

				const receivedConfig = callback.mock.calls[0]?.[0] as ValidationConfig;
				expect(receivedConfig).toBeDefined();
				expect(receivedConfig).toHaveProperty("minOfficeDaysPerWeek");
				expect(receivedConfig).toHaveProperty("totalWeekdaysPerWeek");
				expect(receivedConfig).toHaveProperty("rollingPeriodWeeks");
				expect(receivedConfig).toHaveProperty("thresholdPercentage");
				expect(receivedConfig).toHaveProperty("debug");
				expect(receivedConfig.debug).toBe(true);
			});
		});
	});
});
