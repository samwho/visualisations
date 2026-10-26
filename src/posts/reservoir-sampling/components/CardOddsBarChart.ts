import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import type { Slider } from "../../../shared/components/Slider";
import { suits, ranks, type PlayingCard } from "../core/Cards";
import { colorForSuit } from "./PlayingCard";
import { repeat } from "lit/directives/repeat.js";
import { guard } from "lit/directives/guard.js";

import { holdingProbability, type SamplingMethod } from "../core/Odds";

interface BarState {
	card: PlayingCard;
	count: number;
	selected: boolean;
}

const DECK: PlayingCard[] = createDeck();
const MAX_DRAWS = DECK.length;
const FIRST_CARD = DECK[0]!;
const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
	notation: "standard",
	style: "percent",
	minimumSignificantDigits: 2,
	maximumSignificantDigits: 2,
});

function formatProbability(value: number): string {
	return value > 0 && value < 0.000000001
		? "<0.0000001%"
		: PERCENT_FORMATTER.format(value);
}

function createDeck(): PlayingCard[] {
	const deck: PlayingCard[] = [];
	for (const suit of suits) {
		for (const rank of ranks) {
			deck.push({ suit, rank });
		}
	}
	return deck;
}

function createInitialBars(): BarState[] {
	return DECK.map((card) => ({
		card,
		count: 0,
		selected: false,
	}));
}

function clampDrawCount(value: number): number {
	if (Number.isNaN(value)) {
		return 0;
	}
	const normalized = Math.floor(value);
	return Math.min(Math.max(0, normalized), MAX_DRAWS);
}

function numWithSuffix(num: number) {
	const suffixes = ["th", "st", "nd", "rd"];
	const value = num % 100;
	return num + (suffixes[(value - 20) % 10] ?? suffixes[value] ?? suffixes[0])!;
}

@customElement("s-card-odds-bar-chart")
export class CardOddsBarChart extends LitElement {
	static override styles = css`
		:host {
			display: block;
			width: 100%;
			font-family: var(--font-family-body);
		}

		.footer {
			display: flex;
			align-items: center;
		}

		.footer s-slider {
			width: 100%;
		}

		.draw-label {
			font-family: var(--font-family-code);
			font-weight: 400;
			text-align: center;
			box-sizing: border-box;
			min-height: calc(
				1em * var(--line-height-normal) + 2 * var(--space-2) +
					var(--border-width-thin)
			);
			padding: var(--space-2) var(--space-4);
			font-size: var(--type-ui-size);
			line-height: var(--line-height-normal);
			color: var(--color-text-primary);
		}

		.label-container {
			position: absolute;
			z-index: 1;
			inset: var(--space-2) var(--space-2) auto;
			display: flex;
			justify-content: space-between;
			gap: var(--space-2);
			font-family: var(--font-family-code);
			font-size: var(--type-ui-size);
			font-weight: 400;
		}
		.first-odds,
		.last-odds {
			--badge-font-size: 1em;
			flex-shrink: 0;
			white-space: nowrap;
		}
		.card-preview {
			position: absolute;
			bottom: var(--space-2);
			z-index: 1;
			width: 3rem;
			aspect-ratio: 178.58205 / 249.44822;
			opacity: 0.85;
			pointer-events: none;
		}
		.first-card {
			inset-inline-start: var(--space-2);
		}
		.last-card {
			inset-inline-end: var(--space-2);
		}
		.card-preview s-playing-card {
			width: 100%;
			height: 100%;
			display: block;
		}
		.chart-stage {
			position: relative;
			background-image:
				linear-gradient(
					to right,
					var(--color-border-separator) 1px,
					transparent 1px
				),
				linear-gradient(
					to bottom,
					var(--color-border-separator) 1px,
					transparent 1px
				);
			background-size: 40px 40px;
			background-position: -1px -1px;
		}
		.chart-container {
			margin: 0;
			list-style: none;
			width: 100%;
			height: 14rem;
			display: flex;
			align-items: flex-end;
			gap: 1px;
			padding: 0 var(--space-2);
			box-sizing: border-box;
			overflow: hidden;
		}

		.bar {
			flex: 1;
			min-width: 0;
			height: 100%;
			filter: grayscale(1);
			opacity: 0.7;
			transition:
				filter var(--motion-duration-state) var(--motion-ease-out),
				opacity var(--motion-duration-state) var(--motion-ease-out);
		}

		.bar.selected {
			filter: grayscale(0);
			opacity: 1;
		}

		.value {
			width: 100%;
			background: var(--bar-color, var(--color-data-fill-blue));
			height: 100%;
			transform-origin: bottom center;
			transform: scaleY(var(--value-scale, 0));
			transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
			will-change: transform;
		}

		@media (max-width: 480px) {
			.label-container {
				inset: var(--space-1) var(--space-1) auto;
				gap: var(--space-1);
				font-size: var(--type-caption-size);
			}
		}
		@media (max-width: 360px) {
			.label-container {
				font-size: var(--font-size-xsmall);
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.value,
			.bar {
				transition: none;
			}
		}
	`;

	@property({ type: Number, attribute: "min-value" })
	minValue = 0;

	@property({ reflect: true }) method: SamplingMethod = "coin-flip";

	@state()
	private bars: BarState[] = createInitialBars();

	@state()
	private drawCount = 0;

	override connectedCallback(): void {
		super.connectedCallback();
		if (!this.hasAttribute("role")) {
			this.setAttribute("role", "group");
		}
		if (!this.hasAttribute("aria-label")) {
			this.setAttribute(
				"aria-label",
				"Bar chart showing odds of holding each drawn card.",
			);
		}
	}

	protected override willUpdate(changed: PropertyValues<this>): void {
		if (changed.has("method")) {
			this.drawCount = 1;
		}
		this.recalculateBars();
	}

	private recalculateBars() {
		const drawCount = this.drawCount;
		const bars = DECK.map((card, index) => {
			if (index < drawCount) {
				const count = holdingProbability(this.method, drawCount, index);
				return { card, count, selected: true };
			}
			return { card, count: 0, selected: false };
		});
		this.bars = bars;
	}

	private handleSliderInput(event: Event) {
		// SAFETY: input events are handled on the shared slider host.
		const target = event.currentTarget as Slider | null;
		if (!target) {
			return;
		}
		const nextValue = clampDrawCount(Number(target.value) + 1);
		if (nextValue === this.drawCount) {
			return;
		}
		this.drawCount = nextValue;
	}

	private renderCard(
		card: PlayingCard | undefined,
		position: "first" | "last",
	) {
		return html`
			<div
				class=${`card-preview ${position}-card`}
				aria-hidden="true"
			>
				<s-playing-card
					suit=${card?.suit ?? FIRST_CARD.suit}
					rank=${card?.rank ?? FIRST_CARD.rank}
					?face-down=${!card}
				></s-playing-card>
			</div>
		`;
	}

	private renderBar(bar: BarState, index: number, maxValue: number) {
		const heightPercent =
			maxValue === 0 ? 0 : Math.max(0, (bar.count / maxValue) * 100);
		const style = {
			"--value-scale": String(Math.min(1, Math.max(0, heightPercent / 100))),
			"--bar-color": colorForSuit(bar.card.suit),
		};
		return html`
			<li
				class=${classMap({ bar: true, selected: bar.selected })}
				aria-label=${`Card ${index + 1}: ${formatProbability(bar.count)}`}
			>
				<div
					class="value"
					style=${styleMap(style)}
				></div>
			</li>
		`;
	}

	protected override render() {
		if (this.bars.length === 0) {
			return html``;
		}

		const referenceMax = Math.max(1, this.minValue);

		const firstOdds =
			this.drawCount === 0 ? "" : formatProbability(this.bars[0]?.count ?? 0);
		const lastOdds =
			this.drawCount === 0
				? ""
				: formatProbability(this.bars[this.drawCount - 1]?.count ?? 0);
		const drawLabel =
			this.drawCount === 0 ? "" : `${numWithSuffix(this.drawCount)} draw`;
		const lastLabel = this.drawCount === 0 ? "" : String(this.drawCount);
		const lastCard = this.drawCount <= 1 ? undefined : DECK[this.drawCount - 1];

		return html`
			<s-card full-width>
				<div
					class="draw-label"
					slot="header"
				>
					<span>${drawLabel}</span>
				</div>
				<div class="chart-stage">
					<div class="label-container">
						<s-badged-value class="first-odds">
							<span slot="label">card 1</span>
							<span slot="value">${firstOdds}</span>
						</s-badged-value>
						${
							this.drawCount > 1
								? html`<s-badged-value class="last-odds">
										<span slot="label">card ${lastLabel}</span>
										<span slot="value">${lastOdds}</span>
									</s-badged-value>`
								: nothing
						}
					</div>
					${this.renderCard(FIRST_CARD, "first")}
					${this.renderCard(lastCard, "last")}
					<ul
						class="chart-container"
						part="chart"
						role="list"
					>
						${repeat(
							this.bars,
							(bar) => `${bar.card.rank}-${bar.card.suit}`,
							(bar, index) =>
								guard([bar.count, bar.selected, referenceMax], () =>
									this.renderBar(bar, index, referenceMax),
								),
						)}
					</ul>
				</div>
				<div
					class="footer"
					slot="footer"
				>
					<s-slider
						min="0"
						max=${String(MAX_DRAWS - 1)}
						step="1"
						.value=${String(this.drawCount > 0 ? this.drawCount - 1 : 0)}
						value-text=${`${this.drawCount} ${this.drawCount === 1 ? "card" : "cards"} drawn`}
						@input=${this.handleSliderInput}
						label="Number of cards drawn"
					></s-slider>
				</div>
			</s-card>
		`;
	}
}
