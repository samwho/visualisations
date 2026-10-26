export type SeasonalPalette = "normal" | "pride" | "trans";

export function seasonalPalette(date = new Date()): SeasonalPalette {
	if (date.getMonth() === 5) {
		return "pride";
	}
	return date.getMonth() === 2 && date.getDate() === 31 ? "trans" : "normal";
}

export const seasonalPaletteColours = {
	pride: [
		"var(--color-flag-pride-red)",
		"var(--color-flag-pride-orange)",
		"var(--color-flag-pride-yellow)",
		"var(--color-flag-pride-green)",
		"var(--color-flag-pride-blue)",
		"var(--color-flag-pride-violet)",
	],
	trans: [
		"var(--color-flag-trans-blue)",
		"var(--color-flag-trans-pink)",
		"var(--color-flag-trans-white)",
	],
} as const;
