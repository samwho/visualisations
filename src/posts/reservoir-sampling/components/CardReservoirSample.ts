import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { deck } from "../core/Cards";
import { reservoirIndex } from "../core/Samplers";
import { FairCoin } from "../core/Random";
import { dealStyles } from "./DealStyles";
import { Deck } from "./Deck";
import { CardPile } from "./CardPile";
import type { PlayingCard } from "./PlayingCard";
import { moveCard } from "./MoveCard";

const percent = new Intl.NumberFormat("en", {
	style: "percent",
	maximumFractionDigits: 1,
});

@customElement("s-card-reservoir-sample")
export class CardReservoirSample extends LitElement {
	@property({ attribute: "show-counts", type: Boolean }) showCounts = false;

	@property() method: "coin-flip" | "reservoir" = "reservoir";

	@state() private drawn = 0;

	@state() private resetting = false;

	@state() private held?: PlayingCard;

	@state() private holdCount = 0;

	@state() private message = "";

	private readonly stack = new Deck();

	private readonly heldPile = new CardPile();

	private readonly discardPile = new CardPile();

	private coin = FairCoin.random();

	constructor() {
		super();
		this.heldPile.angle = 1;
		this.discardPile.angle = 2;
	}

	static override styles = dealStyles;

	protected override render() {
		return html`
			<s-card>
				<div class="stage">
					${
						this.showCounts
							? html`<div class="counts">
									<output
										class="hold"
										aria-label="Cards selected"
										>${this.holdCount}</output
									>
									<output
										class="discarded"
										aria-label="Cards not selected"
										>${this.drawn - this.holdCount}</output
									>
								</div>`
							: ""
					}
					<div
						class="slots"
						role="group"
						aria-label=${`${this.drawn} cards drawn, ${this.held === undefined ? "no card held" : "one card held"}`}
					>
						<div class="slot">
							<button
								class="deck-button"
								type="button"
								aria-label="Deal from deck"
								@click=${this.deal}
								?disabled=${this.resetting || this.drawn === deck.length}
							>
								${this.stack}
							</button>
						</div>
						<div class="slot chosen">
							<span class="slot-label">Hold</span>
							${this.heldPile}
						</div>
						<div class="slot discard">
							<span class="slot-label">Discard</span>
							${this.discardPile}
						</div>
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
					<div class="deal-controls">
						${
							this.method === "coin-flip"
								? html`<output
										aria-label="Coin flip result"
										aria-live="polite"
									>
										${
											this.message
												? html`<s-badge
														size="large"
														variant=${this.message.endsWith("Hold.") ? "dark-blue" : "red"}
														>${this.message}</s-badge
													>`
												: ""
										}
									</output>`
								: html`<output
										aria-label="Next deal odds"
										aria-live="polite"
									>
										${
											this.drawn === deck.length
												? html`<s-badge
														info
														size="large"
														>Deck empty</s-badge
													>`
												: html`<s-badged-value info>
														<span slot="label">Hold:</span>
														<span slot="value"
															>${percent.format(1 / (this.drawn + 1))}</span
														>
													</s-badged-value>`
										}
									</output>`
						}
						<s-button
							@click=${this.deal}
							?disabled=${this.resetting || this.drawn === deck.length}
							>Deal</s-button
						>
					</div>
				</div>
			</s-card>
		`;
	}

	private readonly deal = (): void => {
		if (this.resetting || !this.stack.top) {
			return;
		}
		const card = this.stack.top;
		this.drawn += 1;
		const choose =
			this.drawn === 1 ||
			(this.method === "coin-flip"
				? this.coin.flip()
				: reservoirIndex(this.drawn) === 0);
		if (choose) {
			if (this.held) {
				this.held.selected = false;
				void moveCard(this.heldPile, this.discardPile, { card: this.held });
			}
			card.removeAttribute("aria-hidden");
			card.selected = true;
			void moveCard(this.stack, this.heldPile, { card, flip: true });
			this.held = card;
			this.holdCount += 1;
		} else {
			card.removeAttribute("aria-hidden");
			void moveCard(this.stack, this.discardPile, { card, flip: true });
		}
		this.message =
			this.drawn === 1
				? "First card! Hold."
				: choose
					? "Heads! Hold."
					: "Tails! Discard.";
	};

	private readonly reset = async (): Promise<void> => {
		if (this.resetting) {
			return;
		}
		this.resetting = true;
		this.drawn = 0;
		this.held = undefined;
		this.holdCount = 0;
		this.message = "";
		this.coin = FairCoin.random();
		await Promise.all(
			[this.heldPile, this.discardPile].flatMap((source) =>
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
