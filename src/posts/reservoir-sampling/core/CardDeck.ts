import type { Rank, Suit } from "./Cards";

export const cardWidth = 178.58205;
export const cardHeight = 249.44822;
export const cardCornerRadius = 8.5039;

export const SUITS_BY_NAME = {
	C: {
		accessibilityName: "hearts",
		symbol: "circle",
		color: "var(--color-data-fill-orange)",
		foreground: "var(--color-text-data-orange)",
	},
	S: {
		accessibilityName: "spades",
		symbol: "square",
		color: "var(--color-data-fill-green)",
		foreground: "var(--color-text-data-green)",
	},
	T: {
		accessibilityName: "clubs",
		symbol: "triangle",
		color: "var(--color-data-fill-dark-blue)",
		foreground: "var(--color-text-data-dark-blue)",
	},
	D: {
		accessibilityName: "diamonds",
		symbol: "diamond",
		color: "var(--color-data-fill-pink)",
		foreground: "var(--color-text-data-pink)",
	},
} as const;

export function colorForSuit(suit: Suit): string {
	return SUITS_BY_NAME[suit].color;
}

export function accessibilityValueName(value: Rank): string {
	switch (value) {
		case "A":
			return "Ace";
		case "J":
			return "Jack";
		case "Q":
			return "Queen";
		case "K":
			return "King";
		default:
			return value;
	}
}
