import { css } from "lit";
import { customElement } from "lit/decorators.js";
import { CardPicker } from "./CardPicker";
import { shuffled } from "../core/Cards";
import { AnimationController } from "../../../shared/core/controllers/AnimationController";
import { prefersReducedMotion } from "../../../shared/Accessibility";

const shuffleDuration = 600;

@customElement("s-random-shuffle")
export class RandomShuffle extends CardPicker {
	static override styles = [
		CardPicker.styles,
		css`
			:host {
				/* Reordered cards must not pull the reader's viewport with them. */
				overflow-anchor: none;
			}
			s-playing-card {
				transition:
					filter ${shuffleDuration}ms linear,
					opacity ${shuffleDuration}ms linear;
				--card-border-transition: border-color ${shuffleDuration}ms linear;
			}
			s-playing-card[muted] {
				opacity: 0.7;
			}
			s-playing-card[muted][data-theme="dark"] {
				opacity: 0.85;
			}
			@media (prefers-reduced-motion: reduce) {
				s-playing-card {
					transition: none;
					--card-border-transition: none;
				}
			}
		`,
	];

	private readonly animations = new AnimationController(this);

	private sequence = 0;

	protected override firstUpdated(): void {
		this.selected = this.cards
			.slice(0, this.n)
			.map((card) => `${card.suit}-${card.rank}`);
	}

	async shuffle(times = 1): Promise<void> {
		const sequence = ++this.sequence;
		const previous = new Map(
			[...this.renderRoot.querySelectorAll<HTMLElement>("s-playing-card")].map(
				(card) => [
					card,
					{
						rect: card.getBoundingClientRect(),
						opacity: getComputedStyle(card).opacity,
						filter: getComputedStyle(card).filter,
						selected: card.classList.contains("selected"),
					},
				],
			),
		);
		// Keep the current visual positions when another shuffle interrupts this one.
		this.animations.cancelAnimations();
		for (let i = 0; i < times; i += 1) {
			this.cards = shuffled(this.cards);
			this.publish(this.cards.slice(0, this.n));
		}
		await this.updateComplete;
		if (
			prefersReducedMotion() ||
			sequence !== this.sequence ||
			!this.isConnected
		) {
			return;
		}
		for (const [card, before] of previous) {
			const after = card.getBoundingClientRect();
			this.animations.trackAnimation(
				card.animate(
					[
						{
							transform: `translate(${before.rect.left - after.left}px, ${before.rect.top - after.top}px)`,
						},
						{ transform: "translate(0,0)" },
					],
					{
						duration: shuffleDuration,
						easing: "cubic-bezier(0.25,0.46,0.45,0.94)",
					},
				),
			);
			if (!before.selected && card.classList.contains("selected")) {
				// Reordering cards can skip a CSS transition on the moved element.
				this.animations.trackAnimation(
					card.animate(
						[
							{ opacity: before.opacity, filter: before.filter },
							{ opacity: "1", filter: "none" },
						],
						{ duration: shuffleDuration, easing: "linear" },
					),
				);
			}
		}
	}
}
