/**
 * Unified Event System Types
 *
 * Defines a single event type (rto:state-changed) with a discriminator
 * to distinguish between config, compliance, and settings changes.
 */

import type { ComplianceEventData } from "../lib/auto-compliance";
import type { ValidationConfig } from "./validation-strategy";

/** Unified event name for all RTO state changes */
export const RTO_STATE_CHANGED = "rto:state-changed" as const;

/** Event type discriminator */
export type RTOEventType = "config" | "compliance" | "settings";

/** Payload for config changes */
export interface ConfigEventDetail {
	type: "config";
	settingKey: keyof ValidationConfig;
	oldValue: unknown;
	newValue: unknown;
}

/** Payload for compliance changes */
export interface ComplianceEventDetail {
	type: "compliance";
	compliance: ComplianceEventData;
}

/** Payload for settings changes */
export interface SettingsEventDetail {
	type: "settings";
	settings?: Partial<ValidationConfig>;
	/** Additional context for specific settings changes */
	holidays?: {
		countryCode?: string | null;
		holidaysAsOOF?: boolean;
	};
}

/** Union of all event detail types */
export type RTOStateEventDetail =
	| ConfigEventDetail
	| ComplianceEventDetail
	| SettingsEventDetail;

/** Base event payload for rto:state-changed */
export interface RTOStateEvent extends CustomEvent<RTOStateEventDetail> {
	detail: RTOStateEventDetail;
}

/**
 * Type guard for config event detail
 */
export function isConfigEvent(
	detail: RTOStateEventDetail,
): detail is ConfigEventDetail {
	return detail.type === "config";
}

/**
 * Type guard for compliance event detail
 */
export function isComplianceEvent(
	detail: RTOStateEventDetail,
): detail is ComplianceEventDetail {
	return detail.type === "compliance";
}

/**
 * Type guard for settings event detail
 */
export function isSettingsEvent(
	detail: RTOStateEventDetail,
): detail is SettingsEventDetail {
	return detail.type === "settings";
}

/**
 * Helper to dispatch an RTO state change event
 */
export function dispatchRTOStateEvent(detail: RTOStateEventDetail): void {
	window.dispatchEvent(
		new CustomEvent<RTOStateEventDetail>(RTO_STATE_CHANGED, { detail }),
	);
}

/**
 * Helper to subscribe to RTO state change events
 * Returns an unsubscribe function
 */
export function onRTOStateChanged(
	callback: (detail: RTOStateEventDetail) => void,
): () => void {
	const handler = (e: Event): void => {
		const event = e as CustomEvent<RTOStateEventDetail>;
		callback(event.detail);
	};
	window.addEventListener(RTO_STATE_CHANGED, handler);
	return () => window.removeEventListener(RTO_STATE_CHANGED, handler);
}
