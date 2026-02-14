/**
 * Color derivation utilities for import/export.
 * Derives background and text colors from a primary hex color.
 */

/** Mix a hex color with white at the given ratio (0–1 = fully white) */
export function deriveBgColor(hex: string, whiteRatio = 0.85): string {
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);

	const mix = (c: number) =>
		Math.round(c + (255 - c) * whiteRatio)
			.toString(16)
			.padStart(2, "0");

	return `#${mix(r)}${mix(g)}${mix(b)}`;
}

/** Return white or dark text depending on perceived luminance */
export function deriveTextColor(hex: string): string {
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);

	// Relative luminance (sRGB)
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.6 ? "#1e293b" : "#ffffff";
}
