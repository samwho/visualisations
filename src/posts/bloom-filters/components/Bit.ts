import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./SegmentedRing";
import type { RingSegment } from "./SegmentedRing";

const effectClasses = ["insert", "hit", "miss"] as const;

/** Own a bit's fill and feedback; the ring owns its preview animation. */
@customElement("s-bit")
export class Bit extends LitElement {
	@property({ type: Boolean, reflect: true }) fill = false;

	@property({ type: Boolean }) ring = false;

	@property({ attribute: false })
	previewSegments: readonly RingSegment[] = [];

	static override styles = css`
		:host {
			position: relative;
			display: inline-block;
			width: var(--control-min-height-small);
			height: var(--control-min-height-small);
		}
		span {
			--peak-scale: 1.2;
			--rest-color: var(--color-palette-orange-surface-strong);
			--_bit-rest-text: var(--color-palette-orange-foreground);
			display: grid;
			place-items: center;
			box-sizing: border-box;
			width: 100%;
			height: 100%;
			border: 0;
			border-radius: var(--radius-circle);
			background-color: var(--rest-color);
			color: var(--_bit-rest-text);
			transform: scale(1);
			transition: background-color var(--motion-duration-press) ease;
			font: var(--font-weight-bold)
				var(--type-caption-size)/ var(--line-height-solid)
				var(--font-family-code);
			padding: 0;
		}
		:host(.set) span {
			--rest-color: var(--color-data-fill-orange);
			--_bit-rest-text: var(--bloom-bit-fill-text);
		}
		.highlight-ring {
			position: absolute;
			inset: -5px;
			z-index: 1;
			width: calc(100% + 10px);
			height: calc(100% + 10px);
			overflow: visible;
			pointer-events: none;
		}
		.highlight-ring circle {
			cx: 50%;
			cy: 50%;
			r: calc(50% - 2px);
			fill: none;
			stroke: var(--color-border-focus);
			stroke-width: 2px;
			stroke-dasharray: 1.1 0.9;
			animation: bit-highlight-march 900ms linear infinite;
		}
		.highlight-ring.ring-main {
			clip-path: inset(0 50% 0 0);
		}
		.highlight-ring.ring-seam {
			clip-path: inset(0 0 0 50%);
		}
		.highlight-ring.ring-seam circle {
			transform: rotate(180deg);
			transform-origin: center;
		}
		s-segmented-ring {
			/* A 2px stroke with a 2px gap around the bit. */
			position: absolute;
			inset: -4px;
			z-index: 1;
		}
		:host(.previewed) .highlight-ring {
			inset: -8px;
			width: calc(100% + 16px);
			height: calc(100% + 16px);
		}
		@keyframes bit-highlight-march {
			to {
				stroke-dashoffset: -2;
			}
		}
		:host(.insert) span {
			animation: insert 500ms ease-out;
		}
		:host(.hit) span {
			--check-color: var(--color-data-fill-green);
			animation: check 1.3s ease-out;
		}
		:host(.miss) span {
			--check-color: var(--color-data-fill-red);
			animation: check 1.3s ease-out;
		}
		@keyframes insert {
			10% {
				transform: scale(var(--peak-scale));
			}
			100% {
				transform: scale(1);
			}
		}
		@keyframes check {
			0%,
			45% {
				background-color: var(--check-color);
				color: var(--black);
			}
			8%,
			45% {
				transform: scale(var(--peak-scale));
			}
			53%,
			100% {
				transform: scale(1);
				background-color: var(--rest-color);
				color: var(--_bit-rest-text);
			}
		}
		@media (prefers-reduced-motion: reduce) {
			span {
				/* Keep animationend feedback without scaling. */
				--peak-scale: 1;
				transition: none;
			}
			.highlight-ring circle {
				animation: none;
			}
		}
		:host([fill]) {
			display: block;
			width: 100%;
			height: auto;
			aspect-ratio: 1;
		}
		:host([fill]) span {
			font-size: clamp(var(--font-size-xsmall), 2.5cqw, var(--type-body-size));
		}
	`;

	setValue(value: boolean, animate = false): void {
		this.classList.toggle("set", value);
		this.setEffect(animate && value ? "insert" : undefined);
		this.changed();
	}

	check(): void {
		this.setEffect(this.classList.contains("set") ? "hit" : "miss");
		this.changed();
	}

	highlight(): void {
		if (!this.classList.contains("highlight")) {
			this.classList.add("highlight");
			this.changed();
		}
	}

	unhighlight(): void {
		if (this.classList.contains("highlight")) {
			this.classList.remove("highlight");
			this.changed();
		}
	}

	clearHighlight(): void {
		this.unhighlight();
	}

	private setEffect(effect: (typeof effectClasses)[number] | undefined): void {
		for (const name of effectClasses) {
			this.classList.toggle(name, name === effect);
		}
	}

	private changed(): void {
		this.requestUpdate();
		this.dispatchEvent(
			new Event("bit-change", { bubbles: true, composed: true }),
		);
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.setEffect(undefined);
		this.classList.remove("highlight");
	}

	protected override render() {
		return html`<span
				@animationend=${(event: AnimationEvent) => {
					if (event.target !== event.currentTarget) {
						return;
					}
					// Only clear the completed animation, not a newer, different effect.
					const classes =
						event.animationName === "check"
							? ["hit", "miss"]
							: [event.animationName];
					this.classList.remove(...classes);
					this.changed();
				}}
			>
				<slot></slot>
			</span>
			${
				this.previewSegments.length > 0
					? html`<s-segmented-ring
							.strokeWidth=${2}
							.lineCap=${"round"}
							.segments=${this.previewSegments}
						></s-segmented-ring>`
					: null
			}
			${
				this.classList.contains("highlight") || this.ring
					? html`<svg
								class="highlight-ring ring-main"
								aria-hidden="true"
							>
								<circle pathLength="32"></circle>
							</svg>
							<svg
								class="highlight-ring ring-seam"
								aria-hidden="true"
							>
								<circle pathLength="32"></circle>
							</svg>`
					: null
			}`;
	}
}
