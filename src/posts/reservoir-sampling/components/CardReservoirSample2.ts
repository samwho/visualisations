import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { reservoirIndex } from "../core/Samplers";
import { dealStyles } from "./DealStyles";
import { Deck } from "./Deck";
import { CardPile } from "./CardPile";
import {
	type PlayingCard,
	cardCornerRadius,
	cardWidth,
	cardHeight,
} from "./PlayingCard";
import { moveCard } from "./MoveCard";

@customElement("s-card-reservoir-sample-2")
export class CardReservoirSample2 extends LitElement {
	@state() private drawn = 0;

	@state() private resetting = false;

	@state() private message = "";

	@state() private randomSlot?: number;

	private readonly stack = new Deck();

	private readonly piles = Array.from({ length: 9 }, (_, index) => {
		const pile = new CardPile();
		pile.angle = index < 2 ? 1 : 2;
		return pile;
	});

	private held: PlayingCard[] = [];

	static override styles = [
		dealStyles,
		css`
			s-card {
				--container-max-width: var(--layout-content-max-width);
			}
			.slots {
				--columns: 5;
				--gap: var(--space-4);
				grid-template-rows: repeat(2, 1fr);
			}
			.random::after {
				content: "";
				position: absolute;
				inset: -4px;
				/* Preserve the inner curve's centre on the expanded ring. */
				border-radius:
					calc(${(cardCornerRadius / cardWidth) * 100}% + ${4 * (1 - (2 * cardCornerRadius) / cardWidth)}px) /
					calc(${(cardCornerRadius / cardHeight) * 100}% + ${4 * (1 - (2 * cardCornerRadius) / cardHeight)}px);
				outline: var(--focus-ring-width-strong) solid
					var(--color-status-success-border);
				/* Paint outlines above rotated cards. */
				z-index: 100;
				pointer-events: none;
			}
			/* Keep the header's reserved height before dealing and after resetting. */
			.message:empty {
				display: block;
			}
			.message {
				color: var(--color-text-data-green);
			}
		`,
	];

	protected override render() {
		return html`
			<s-card>
				<output
					class="message"
					slot="header"
					aria-live="polite"
					>${this.message}</output
				>
				<div class="stage">
					<div
						class="slots"
						role="group"
						aria-label=${`${this.drawn} cards drawn, ${this.held.length} cards held`}
					>
						${Array.from(
							{ length: 10 },
							(_, i) =>
								html`<div
									class=${`slot ${i > 0 && i < 3 ? "chosen" : i === 0 ? "" : "discard"} ${i === this.randomSlot ? "random" : ""}`}
								>
									${i === 0 ? "" : html`<span class="slot-label">${i < 3 ? "Hold" : "Discard"}</span>`}
									${
										i === 0
											? html`<button
													class="deck-button"
													type="button"
													aria-label="Deal from deck"
													@click=${this.deal}
													?disabled=${this.resetting || this.drawn === 9}
												>
													${this.stack}
												</button>`
											: this.piles[i - 1]
									}
								</div>`,
						)}
					</div>
				</div>
				<div
					class="controls"
					slot="footer"
				>
					<s-button
						@click=${this.reset}
						?disabled=${this.resetting || this.drawn === 0}
						label="Reset"
						><s-icon
							slot="icon"
							name="restart"
							aria-hidden="true"
						></s-icon
					></s-button>
					<s-button
						@click=${this.deal}
						?disabled=${this.resetting || this.drawn === 9}
						>Deal</s-button
					>
				</div>
			</s-card>
		`;
	}

	private readonly deal = (): void => {
		if (this.resetting || this.drawn === 9 || !this.stack.top) {
			return;
		}
		const card = this.stack.top;
		card.removeAttribute("aria-hidden");
		this.drawn += 1;
		if (this.held.length < 2) {
			void moveCard(this.stack, this.piles[this.held.length]!, {
				card,
				flip: true,
			});
			card.selected = true;
			this.held.push(card);
			return;
		}
		// Choose a position in all cards seen, not just the two held.
		const index = reservoirIndex(this.drawn);
		if (index < 2) {
			const replaced = this.held[index]!;
			replaced.selected = false;
			void moveCard(this.piles[index]!, this.piles[this.drawn - 1]!, {
				card: replaced,
			});
			card.selected = true;
			void moveCard(this.stack, this.piles[index]!, { card, flip: true });
			this.held[index] = card;
		} else {
			void moveCard(this.stack, this.piles[this.drawn - 1]!, {
				card,
				flip: true,
			});
		}
		this.message = `randBetween(0, ${this.drawn}) = ${index}`;
		this.randomSlot = index + 1;
	};

	private readonly reset = async (): Promise<void> => {
		if (this.resetting) {
			return;
		}
		this.resetting = true;
		this.drawn = 0;
		this.message = "";
		this.randomSlot = undefined;
		this.held = [];
		await Promise.all(
			this.piles.flatMap((source) =>
				source.cards.map((card) => {
					card.selected = false;
					card.setAttribute("aria-hidden", "true");
					return moveCard(source, this.stack, {
						card,
						index: this.stack.indexFor(card),
						flip: true,
					});
				}),
			),
		);
		this.stack.shuffle();
		this.resetting = false;
	};
}
