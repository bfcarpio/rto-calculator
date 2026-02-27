/**
 * ValidationManager Tests
 *
 * Tests for config getters and state subscription system.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { RTO_STATE_CHANGED } from "../../types/events";
import type { ValidationConfig } from "../../types/validation-strategy";
import {
	RTO_CONFIG_CHANGED_EVENT,
	ValidationManager,
} from "../ValidationManager";

describe("ValidationManager", () => {
	let manager: ValidationManager;

	beforeEach(() => {
		manager = new ValidationManager();
	});

	describe("Task 1.1: Config Getters", () => {
		describe("getMinOfficeDaysPerWeek", () => {
			it("should return default min office days", () => {
				const result = manager.getMinOfficeDaysPerWeek();
				expect(result).toBe(3);
			});

			it("should return updated value after config change", () => {
				manager.updateConfig({ minOfficeDaysPerWeek: 4 });
				expect(manager.getMinOfficeDaysPerWeek()).toBe(4);
			});
		});

		describe("getTotalWeekdaysPerWeek", () => {
			it("should return default total weekdays", () => {
				expect(manager.getTotalWeekdaysPerWeek()).toBe(5);
			});

			it("should return updated value after config change", () => {
				manager.updateConfig({ totalWeekdaysPerWeek: 4 });
				expect(manager.getTotalWeekdaysPerWeek()).toBe(4);
			});
		});

		describe("getRollingPeriodWeeks", () => {
			it("should return default rolling period weeks", () => {
				expect(manager.getRollingPeriodWeeks()).toBe(12);
			});

			it("should return updated value after config change", () => {
				manager.updateConfig({ rollingPeriodWeeks: 8 });
				expect(manager.getRollingPeriodWeeks()).toBe(8);
			});
		});

		describe("getThresholdPercentage", () => {
			it("should return default threshold percentage", () => {
				expect(manager.getThresholdPercentage()).toBe(0.6);
			});

			it("should return updated value after config change", () => {
				manager.updateConfig({ thresholdPercentage: 0.75 });
				expect(manager.getThresholdPercentage()).toBe(0.75);
			});
		});
	});

	describe("Task 1.2: State Subscription", () => {
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

	describe("Task 4.2: Unified Event Dispatch", () => {
		describe("rto:state-changed event", () => {
			it("should dispatch unified event with type 'config' on config change", () => {
				const handler = vi.fn();
				window.addEventListener(RTO_STATE_CHANGED, handler);

				manager.updateConfig({ minOfficeDaysPerWeek: 4 });

				expect(handler).toHaveBeenCalledTimes(1);
				const event = handler.mock.calls[0]?.[0] as CustomEvent;
				expect(event.detail.type).toBe("config");
				expect(event.detail.settingKey).toBe("minOfficeDaysPerWeek");
				expect(event.detail.oldValue).toBe(3);
				expect(event.detail.newValue).toBe(4);

				window.removeEventListener(RTO_STATE_CHANGED, handler);
			});

			it("should dispatch unified event for each changed config key", () => {
				const handler = vi.fn();
				window.addEventListener(RTO_STATE_CHANGED, handler);

				manager.updateConfig({ minOfficeDaysPerWeek: 4, debug: true });

				expect(handler).toHaveBeenCalledTimes(2);
				const events = handler.mock.calls.map(
					(call) => (call[0] as CustomEvent).detail,
				);
				const keys = events.map((e) => e.settingKey);
				expect(keys).toContain("minOfficeDaysPerWeek");
				expect(keys).toContain("debug");

				window.removeEventListener(RTO_STATE_CHANGED, handler);
			});
		});

		describe("backward compatibility: rto:config-changed event", () => {
			it("should still dispatch legacy rto:config-changed event", () => {
				const handler = vi.fn();
				window.addEventListener(RTO_CONFIG_CHANGED_EVENT, handler);

				manager.updateConfig({ minOfficeDaysPerWeek: 4 });

				expect(handler).toHaveBeenCalledTimes(1);
				const event = handler.mock.calls[0]?.[0] as CustomEvent;
				expect(event.detail.settingKey).toBe("minOfficeDaysPerWeek");
				expect(event.detail.oldValue).toBe(3);
				expect(event.detail.newValue).toBe(4);

				window.removeEventListener(RTO_CONFIG_CHANGED_EVENT, handler);
			});
		});
	});
});
