export type Suit = "C" | "S" | "T" | "D";
export type Rank =
	| "A"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "7"
	| "8"
	| "9"
	| "10"
	| "J"
	| "Q"
	| "K";

export const ranks: Rank[] = [
	"A",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"J",
	"Q",
	"K",
];
export const suits: Suit[] = ["C", "S", "T", "D"];

export interface PlayingCard {
	suit: Suit;
	rank: Rank;
}

export const deck: PlayingCard[] = suits.flatMap((suit) =>
	ranks.map((rank) => ({ suit, rank })),
);

export const exampleCards: PlayingCard[] = [
	{ suit: "C", rank: "A" },
	{ suit: "D", rank: "4" },
	{ suit: "S", rank: "K" },
	{ suit: "T", rank: "2" },
	{ suit: "C", rank: "J" },
	{ suit: "D", rank: "Q" },
	{ suit: "S", rank: "5" },
	{ suit: "T", rank: "8" },
	{ suit: "C", rank: "10" },
	{ suit: "D", rank: "9" },
];

export { shuffled } from "../../../shared/core/Random";
