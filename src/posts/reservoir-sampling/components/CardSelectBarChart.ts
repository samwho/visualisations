import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { TargetController } from "../../../shared/core/controllers/TargetController";
import { RandomSelect } from "./RandomSelect";
import { RandomShuffle } from "./RandomShuffle";
import { exampleCards, type PlayingCard } from "../core/Cards";
import { colorForSuit } from "./PlayingCard";

@customElement("s-card-select-bar-chart")
export class CardSelectBarChart extends LitElement {
	@property({ attribute: "target-id" }) targetId = "";

	@state() private counts = exampleCards.map(() => 0);

	@state() private selected: string[] = [];

	constructor() {
		super();
		const targetController = new TargetController(this, {
			id: () => this.targetId,
			isTarget: (el): el is RandomSelect | RandomShuffle =>
				el instanceof RandomSelect || el instanceof RandomShuffle,
		});
		targetController.addEventListener("connected", (event) => {
			// SAFETY: TargetController emits connected with this payload.
			const target = (event as CustomEvent<RandomSelect | RandomShuffle>)
				.detail;
			target.addEventListener("selected", this.select);
		});
		targetController.addEventListener("disconnected", (event) => {
			// SAFETY: TargetController emits disconnected with this payload.
			const target = (event as CustomEvent<RandomSelect | RandomShuffle>)
				.detail;
			target.removeEventListener("selected", this.select);
		});
	}

	static override styles = css`
		:host {
			display: block;
			width: 100%;
			container-type: inline-size;
			box-sizing: border-box;
			padding: var(--space-4);
		}
		ul {
			display: flex;
			align-items: flex-end;
			gap: 1cqw;
			height: 16rem;
			list-style: none;
			margin: 0;
			padding: 0;
		}
		li {
			flex: 1;
			min-width: 0;
			height: 100%;
			display: flex;
			flex-direction: column;
			justify-content: flex-end;
		}
		.track {
			flex: 1;
			display: flex;
			align-items: flex-end;
			margin-top: calc(1.5 * var(--type-caption-size) + var(--space-1));
		}
		.bar-stack {
			position: relative;
			width: 100%;
			min-height: 5px;
			transition: height 200ms ease;
		}
		.count {
			position: absolute;
			bottom: 100%;
			width: 100%;
			padding-bottom: var(--space-1);
			text-align: center;
			font-family: var(--font-family-code);
			font-size: clamp(
				var(--font-size-xsmall),
				2.5cqw,
				var(--type-caption-size)
			);
			line-height: var(--line-height-normal);
			color: var(--color-text-primary);
		}
		.value {
			width: 100%;
			height: 100%;
			border-radius: min(2cqw, var(--radius-small))
				min(2cqw, var(--radius-small)) 0 0;
			background: var(--_bar-color);
			transition:
				filter var(--motion-duration-playful) ease,
				opacity var(--motion-duration-playful) ease;
		}
		.label {
			margin-top: var(--space-1);
			text-align: center;
			font-family: var(--font-family-code);
			font-size: var(--type-caption-size);
			font-weight: var(--font-weight-semibold);
			color: var(--_bar-label-color);
			transition: filter var(--motion-duration-playful) ease;
		}
		li:not(.selected) .label {
			filter: grayscale(1);
		}
		@media (prefers-reduced-motion: reduce) {
			.bar-stack,
			.value,
			.label {
				transition: none;
			}
		}
		li:not(.selected) .value {
			filter: grayscale(1);
			opacity: 0.7;
		}
	`;

	private readonly select = (event: Event): void => {
		// SAFETY: both card pickers publish an array of PlayingCard values.
		const cards = (event as CustomEvent<PlayingCard[]>).detail;
		this.selected = cards.map((card) => `${card.suit}-${card.rank}`);
		this.counts = this.counts.map(
			(count, i) =>
				count +
				(this.selected.includes(
					`${exampleCards[i]!.suit}-${exampleCards[i]!.rank}`,
				)
					? 1
					: 0),
		);
	};

	reset(): void {
		this.counts = exampleCards.map(() => 0);
		this.selected = [];
	}

	protected override render() {
		const max = Math.max(10, ...this.counts);
		return html`<ul
			role="list"
			aria-label="How often each card has been selected"
		>
			${exampleCards.map(
				(card, i) =>
					html`<li
						class=${this.selected.includes(`${card.suit}-${card.rank}`) ? "selected" : ""}
						aria-label=${`${card.rank}, selected ${this.counts[i]} times`}
						style=${`--_bar-color: ${colorForSuit(card.suit)}; --_bar-label-color: var(--color-text-data-${{ C: "orange", S: "green", T: "dark-blue", D: "pink" }[card.suit]})`}
					>
						<div class="track">
							<div
								class="bar-stack"
								style=${`height: ${(this.counts[i]! / max) * 100}%`}
							>
								<span
									class="count"
									aria-hidden="true"
									>${this.counts[i]}</span
								>
								<div class="value"></div>
							</div>
						</div>
						<span class="label">${card.rank}</span>
					</li>`,
			)}
		</ul>`;
	}
}
