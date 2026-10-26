import { LitElement, html, css, nothing } from "lit";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import { customElement, property, state } from "lit/decorators.js";
import { cardArtwork } from "../CardArtwork";
import {
	SUITS_BY_NAME,
	accessibilityValueName,
	cardCornerRadius,
	cardWidth,
	cardHeight,
} from "../core/CardDeck";
import type { Suit, Rank } from "../core/Cards";
export { ranks, suits, type Rank, type Suit } from "../core/Cards";
export {
	cardWidth,
	cardHeight,
	cardCornerRadius,
	colorForSuit,
} from "../core/CardDeck";

const imageUrls = new Map<string, string>();
function imageUrl(name: keyof typeof cardArtwork, theme: string): string {
	const key = `${name}:${theme}`;
	let url = imageUrls.get(key);
	if (url === undefined) {
		const artwork = cardArtwork[name].replace(
			"<svg ",
			`<svg data-theme="${theme === "dark" ? "dark" : "light"}" `,
		);
		url = "data:image/svg+xml," + encodeURIComponent(artwork);
		imageUrls.set(key, url);
	}
	return url;
}

@customElement("s-playing-card")
export class PlayingCard extends LitElement {
	@property({ type: String, reflect: true }) suit: Suit = "C";

	@property({ type: String, reflect: true }) rank: Rank = "A";

	@property({ type: Boolean, reflect: true }) flippable = false;

	@property({ type: Boolean, reflect: true }) flipped = false;

	@property({ type: Boolean, reflect: true, attribute: "face-down" }) faceDown =
		false;

	@property({ type: Boolean, reflect: true }) muted = false;

	@property({ type: Boolean }) selected = false;

	@property({ attribute: "data-theme" }) private theme = "light";

	@state() private artworkVisible = false;

	private hasShownFace = false;

	constructor() {
		super();
		new ThemeController(this);
		const visibility = new VisibilityController(this, { rootMargin: "200px" });
		visibility.addEventListener(
			"first-visible",
			() => {
				this.artworkVisible = true;
			},
			{ once: true },
		);
	}

	static override styles = css`
		:host {
			display: inline-block;
			width: var(--card-width, 178.58205px);
			max-width: 100%;
			aspect-ratio: 178.58205 / 249.44822;
			--card-border-color: var(--color-border-default);
			position: relative;
			container-type: inline-size;
			color-scheme: light;
		}
		:host([data-theme="dark"]) {
			color-scheme: dark;
		}
		:host([data-theme="light"]) {
			--card-border-color: color-mix(
				in srgb,
				var(--color-border-default) 80%,
				var(--color-surface-default)
			);
		}

		:host([muted]) {
			filter: grayscale(1) contrast(0.5) brightness(1.35);
		}

		:host([muted][data-theme="dark"]) {
			/* Contrast pulls colours toward mid-grey; keep the dark surface dark. */
			filter: grayscale(1) contrast(0.5) brightness(0.4);
		}

		:host([flippable]) {
			perspective: 800px;
		}

		.card-art {
			display: block;
			width: 100%;
			height: 100%;
			max-width: none;
		}

		.card {
			position: relative;
			width: 100%;
			height: 100%;
		}

		:host([flippable]) .card {
			transform-style: preserve-3d;
			/* Lift the left edge above the table, then slide the pivot so the
			   turned card lands in its original footprint. A centre pivot sinks
			   half the card below the table during the turn. */
			transform-origin: right center;
			transform: translateX(0%) rotateY(0deg);
			transition: var(
				--card-flip-transition,
				transform 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)
			);
		}

		:host([flippable][flipped]) .card {
			transform: translateX(-100%) rotateY(180deg);
		}

		.face {
			position: absolute;
			inset: 0;
			border-radius: var(
				--card-border-radius,
				${(cardCornerRadius / cardWidth) * 100}% /
					${(cardCornerRadius / cardHeight) * 100}%
			);
			box-sizing: border-box;
			background: var(--color-surface-default);
			overflow: hidden;
		}

		:host([flippable]) .face {
			backface-visibility: hidden;
		}

		:host([flippable]) .face.front {
			transform: rotateY(0deg);
		}

		:host([flippable]) .face.back {
			transform: rotateY(180deg);
		}

		.face::after {
			content: "";
			position: absolute;
			inset: 0;
			border: calc(100cqw * 2 / 178.58205) solid var(--card-border-color);
			border-radius: inherit;
			box-sizing: border-box;
			pointer-events: none;
			transition: var(--card-border-transition, none);
		}

		@media (prefers-reduced-motion: reduce) {
			:host([flippable]) .card {
				transition: none;
			}
		}
	`;

	protected override willUpdate(): void {
		// Remember revealed faces so later flips do not replace their image nodes.
		this.hasShownFace ||= this.faceDown === this.flipped;
	}

	protected override updated(): void {
		this.setAttribute("role", "img");
		this.setAttribute(
			"aria-label",
			this.faceDown === this.flipped
				? `${accessibilityValueName(this.rank)} of ${SUITS_BY_NAME[this.suit].accessibilityName}${this.selected ? ", selected" : ""}`
				: "Card Back",
		);
	}

	async prepareArtwork(): Promise<void> {
		this.artworkVisible = true;
		await this.updateComplete;
		// A first flip must not expose a still-undecoded image halfway through.
		await Promise.all(
			[...this.renderRoot.querySelectorAll<HTMLImageElement>("img")].map(
				(image) => image.decode(),
			),
		);
	}

	private artwork(name: keyof typeof cardArtwork) {
		if (!this.artworkVisible) {
			return nothing;
		}
		return html`<img
			class="card-art"
			src=${imageUrl(name, this.theme)}
			alt=""
			aria-hidden="true"
			decoding="async"
			draggable="false"
		/>`;
	}

	protected override render() {
		const face = `${this.suit}-${this.rank}` as const;
		if (!this.flippable) {
			return html`<div class="card">
				<div
					class="face"
					aria-hidden="true"
				>
					${this.artwork(this.faceDown === this.flipped ? face : "back")}
				</div>
			</div>`;
		}
		const front = this.faceDown
			? this.artwork("back")
			: this.hasShownFace
				? this.artwork(face)
				: nothing;
		const rear = this.faceDown
			? this.hasShownFace
				? this.artwork(face)
				: nothing
			: this.artwork("back");
		return html`<div class="card">
			<div
				class="face front"
				aria-hidden="true"
			>
				${front}
			</div>
			<div
				class="face back"
				aria-hidden="true"
			>
				${rear}
			</div>
		</div>`;
	}
}
