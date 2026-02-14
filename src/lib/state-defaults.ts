/**
 * Single source of truth for calendar state metadata.
 * Used by Datepainter config, import/export, and color derivation.
 */

export interface StateMetadata {
	label: string;
	color: string;
	bgColor: string;
	icon: string;
	emoji: string;
}

export const STATE_DEFAULTS: Record<string, StateMetadata> = {
	oof: {
		label: "Work From Home",
		color: "#ffffff",
		bgColor: "#ef4444",
		icon: "🏠",
		emoji: "🏠",
	},
	holiday: {
		label: "Holiday",
		color: "#ffffff",
		bgColor: "#f59e0b",
		icon: "☀️",
		emoji: "☀️",
	},
	sick: {
		label: "Sick Day",
		color: "#ffffff",
		bgColor: "#1890ff",
		icon: "💊",
		emoji: "💊",
	},
};

export const STATE_KEYS = Object.keys(STATE_DEFAULTS) as Array<
	keyof typeof STATE_DEFAULTS
>;

/** Build datepainter-compatible state config records from STATE_DEFAULTS */
export function getDefaultStates(): Record<
	string,
	{ label: string; color: string; bgColor: string; icon: string; position: "below" }
> {
	const states: Record<
		string,
		{ label: string; color: string; bgColor: string; icon: string; position: "below" }
	> = {};
	for (const [key, meta] of Object.entries(STATE_DEFAULTS)) {
		states[key] = {
			label: meta.label,
			color: meta.color,
			bgColor: meta.bgColor,
			icon: meta.icon,
			position: "below",
		};
	}
	return states;
}
