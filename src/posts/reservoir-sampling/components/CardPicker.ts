import { css, html, LitElement, type CSSResultGroup } from "lit";
import { property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { exampleCards, type PlayingCard } from "../core/Cards";

export class CardPicker extends LitElement {
	@property({ type: Number }) n = 3;

	@state() cards: PlayingCard[] = [...exampleCards];

	@state() protected selected: string[] = [];

	static override styles: CSSResultGroup = css`
		:host {
			display: grid;
			grid-template-columns: repeat(5, minmax(0, 1fr));
			gap: 1cqw;
			width: 100%;
			container-type: inline-size;
		}
		s-playing-card {
			display: block;
			width: 100%;
			aspect-ratio: 178.58205 / 249.44822;
		}
		s-playing-card.selected {
			z-index: 1;
			--card-border-color: var(--color-border-strong);
		}
	`;

	protected publish(cards: PlayingCard[]): void {
		this.selected = cards.map((card) => `${card.suit}-${card.rank}`);
		this.dispatchEvent(
			new CustomEvent<PlayingCard[]>("selected", { detail: cards }),
		);
	}

	protected override render() {
		return html`${repeat(
			this.cards,
			(card) => `${card.suit}-${card.rank}`,
			(card) =>
				html`<s-playing-card
					suit=${card.suit}
					rank=${card.rank}
					.muted=${!this.selected.includes(`${card.suit}-${card.rank}`)}
					.selected=${this.selected.includes(`${card.suit}-${card.rank}`)}
					class=${this.selected.includes(`${card.suit}-${card.rank}`) ? "selected" : ""}
				></s-playing-card>`,
		)}`;
	}
}
