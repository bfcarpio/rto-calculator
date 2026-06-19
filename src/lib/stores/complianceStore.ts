import { atom, type WritableAtom } from "nanostores";
import type { ComplianceEventData } from "../auto-compliance";

/**
 * Single source of truth for compliance data.
 * Replaces the CustomEvent dispatch system and module-level latestResult.
 */
export const complianceStore: WritableAtom<ComplianceEventData | null> =
	atom<ComplianceEventData | null>(null);

/**
 * Subscribe to compliance data changes.
 *
 * Note: Deduplication uses reference equality (===), not deep equality.
 * Since complianceStore.set() always receives a freshly computed object,
 * every computation will trigger subscribers even if the data is semantically
 * identical. This is intentional — it ensures subscribers never miss updates.
 *
 * For reliable initial data, subscribe first and trust the immediate callback.
 * Do NOT also call complianceStore.get() — the callback fires on subscription
 * when data exists.
 *
 * @returns Unsubscribe function
 */
export function onComplianceChange(
	callback: (data: ComplianceEventData) => void,
): () => void {
	let prev: ComplianceEventData | null = null;
	return complianceStore.subscribe((value) => {
		if (value && value !== prev) {
			prev = value;
			callback(value);
		}
	});
}
