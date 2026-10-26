import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Pile } from "../core/CardPile";
import { AnimationController } from "../../../shared/core/controllers/AnimationController";
import { PlayingCard, cardHeight, cardWidth } from "./PlayingCard";

@customElement("s-card-pile")
export class CardPile extends LitElement {
	@property({ type: Number, reflect: true }) angle = 2.5;

	private readonly pile = new Pile<PlayingCard>();

	private readonly placements: { x: number; y: number; rotation: number }[] =
		[];

	private readonly flying = new Set<PlayingCard>();

	readonly animations = new AnimationController(this);

	get cards(): readonly PlayingCard[] {
		return this.pile.cards;
	}

	get size(): number {
		return this.pile.size;
	}

	get top(): PlayingCard | undefined {
		return this.pile.top;
	}

	placementAt(index: number): string {
		while (this.placements.length <= index) {
			const depth = this.placements.length;
			this.placements.push({
				x: (Math.random() - 0.5) * 2 - depth * 0.025,
				y: (Math.random() - 0.5) * 2 - depth * 0.06,
				rotation: (Math.random() - 0.5) * 2,
			});
		}
		const placement = this.placements[index]!;
		return `translate(${placement.x}%, ${placement.y}%) rotate(${placement.rotation * this.angle}deg)`;
	}

	add(card: PlayingCard, index?: number): void {
		const position = this.pile.add(card, index);
		card.flippable = true;
		card.style.transform = this.placementAt(position);
		card.style.zIndex = String(position);
		// Light DOM keeps the same card element, faces and accessibility state
		// through every transfer. Motion is captured before the fallback reparent.
		this.append(card);
		this.requestUpdate();
	}

	take(card = this.top): PlayingCard | undefined {
		const taken = this.pile.take(card);
		if (taken) {
			this.flying.delete(taken);
			taken.remove();
			this.settleOrder();
		}
		this.requestUpdate();
		return taken;
	}

	lift(card: PlayingCard): void {
		const index = this.pile.entries.find(([, item]) => item === card)![0];
		this.flying.add(card);
		card.style.zIndex = String(1000 + index);
	}

	land(card: PlayingCard): void {
		this.flying.delete(card);
		this.settleOrder();
	}

	private settleOrder(): void {
		// Keep concurrent arrivals in destination order until they have all
		// landed; settling individual z-indices would briefly reorder the edges.
		if (this.flying.size === 0) {
			for (const [index, card] of this.pile.entries) {
				card.style.zIndex = String(index);
			}
		}
	}

	static override styles = css`
		:host {
			display: inline-block;
			position: relative;
			width: var(--card-width, ${cardWidth}px);
			max-width: 100%;
			aspect-ratio: ${cardWidth} / ${cardHeight};
		}
		::slotted(s-playing-card) {
			position: absolute;
			inset: 0;
			width: 100%;
			pointer-events: none;
			/* Transfers own flips, including interrupted turns. */
			--card-flip-transition: none;
		}
	`;

	private readonly syncChildren = (): void => {
		const cards = [...this.children].filter(
			(child): child is PlayingCard => child instanceof PlayingCard,
		);
		for (const card of this.cards) {
			if (!cards.includes(card)) {
				this.pile.take(card);
			}
		}
		for (const card of cards) {
			if (!this.cards.includes(card)) {
				this.add(card);
			}
		}
		this.requestUpdate();
	};

	protected override willUpdate(changed: PropertyValues<this>): void {
		if (changed.has("angle")) {
			for (const [index, card] of this.pile.entries) {
				card.style.transform = this.placementAt(index);
			}
		}
	}

	protected override render() {
		return html`<slot @slotchange=${this.syncChildren}></slot>`;
	}
}
