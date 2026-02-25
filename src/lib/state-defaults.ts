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
		bgColor: "#44AA99",
		icon: "🏠",
		emoji: "🏠",
	},
	holiday: {
		label: "Holiday",
		color: "#3a3520",
		bgColor: "#DDCC77",
		icon: "☀️",
		emoji: "☀️",
	},
	sick: {
		label: "Sick Day",
		color: "#ffffff",
		bgColor: "#332288",
		icon: "💊",
		emoji: "💊",
	},
};

export const STATE_KEYS = Object.keys(STATE_DEFAULTS) as Array<
	keyof typeof STATE_DEFAULTS
>;

export function isValidDateState(
	value: string,
): value is keyof typeof STATE_DEFAULTS {
	return value in STATE_DEFAULTS;
}

/** Build datepainter-compatible state config records from STATE_DEFAULTS */
export function getDefaultStates(): Record<
	string,
	{
		label: string;
		color: string;
		bgColor: string;
		icon: string;
		position: "below";
	}
> {
	const states: Record<
		string,
		{
			label: string;
			color: string;
			bgColor: string;
			icon: string;
			position: "below";
		}
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
