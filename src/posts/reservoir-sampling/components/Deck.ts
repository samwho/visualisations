import { customElement } from "lit/decorators.js";
import { deck, shuffled, type PlayingCard as CardValue } from "../core/Cards";
import { PlayingCard } from "./PlayingCard";
import { CardPile } from "./CardPile";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";

@customElement("s-deck")
export class Deck extends CardPile {
	private initialized = false;

	private readonly homes = new WeakMap<PlayingCard, number>();

	constructor() {
		super();
		const visibility = new VisibilityController(this, { rootMargin: "200px" });
		visibility.addEventListener("first-visible", () => this.initialize(), {
			once: true,
		});
	}

	private initialize(): void {
		if (!this.initialized) {
			this.reset();
		}
	}

	get remaining(): number {
		return this.initialized ? this.size : deck.length;
	}

	override get top(): PlayingCard | undefined {
		// A keyboard or scripted deal can arrive before the visibility callback.
		this.initialize();
		return super.top;
	}

	indexFor(card: PlayingCard): number {
		const index = this.homes.get(card);
		if (index === undefined) {
			throw new Error("Card did not originate in this deck");
		}
		return index;
	}

	shuffle(): void {
		// Shuffle ranks/suits beneath identical backs, not the physical layers.
		const values = shuffled(
			this.cards.map(({ suit, rank }) => ({ suit, rank })),
		);
		this.cards.forEach((card, index) => {
			card.suit = values[index]!.suit;
			card.rank = values[index]!.rank;
		});
	}

	draw(): CardValue | undefined {
		const card = this.take();
		return card ? { suit: card.suit, rank: card.rank } : undefined;
	}

	reset(): void {
		this.initialized = true;
		for (const card of this.cards) {
			this.take(card);
		}
		deck.forEach(({ suit, rank }, index) => {
			const card = new PlayingCard();
			card.suit = suit;
			card.rank = rank;
			card.faceDown = true;
			card.setAttribute("aria-hidden", "true");
			this.homes.set(card, index);
			this.add(card, index);
		});
		this.shuffle();
	}

	protected override updated(): void {
		this.setAttribute("role", "img");
		this.setAttribute("aria-label", `Deck: ${this.remaining} cards remaining`);
	}
}
