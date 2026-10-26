import { LitElement, css, html, render } from "lit";
import { AnimationController } from "../core/controllers/AnimationController";
import { ThemeController } from "../core/controllers/ThemeController";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { property, state } from "lit/decorators.js";
import { prefersReducedMotion } from "../Accessibility";
import { PointerPress } from "../core/PointerPress";
import "./FullBleed";

export interface DogPortrait {
	name: string;
	/** Trusted, bundled SVG markup. */
	artwork: string;
	/** Visible artwork bounds, excluding transparent padding. */
	bounds: readonly [number, number, number, number];
	canvas?: readonly [number, number];
	alt: Record<string, string> & { en: string };
	flip?: boolean;
}

function randomInteger(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

export abstract class DogBase extends LitElement {
	protected abstract readonly portrait: DogPortrait;

	protected readonly petPortrait?: DogPortrait;

	@property({ type: Boolean, attribute: "portrait-only", reflect: true })
	portraitOnly = false;

	@state()
	private petting = false;

	private readonly animations = new AnimationController(this);

	private sequence = 0;

	private readonly particles = new Set<HTMLElement>();

	private readonly pointerPress = new PointerPress(this);

	constructor() {
		super();
		new ThemeController(this);
	}

	static override styles = css`
		:host {
			--focus-ring-color-playful: var(--palette-orange);
			--dog-image-filter: none;
			--dog-credit-color: color-mix(
				in srgb,
				var(--color-text-secondary) 75%,
				var(--color-surface-band)
			);
			container-type: inline-size;
			display: block;
			box-sizing: border-box;
			width: 100%;
		}
		:host([data-theme="dark"]) {
			--dog-image-filter: brightness(0.8);
			/* Secondary text is already near minimum contrast on the dark band. */
			--dog-credit-color: var(--color-text-secondary);
		}

		s-full-bleed {
			margin-block: var(--space-6);
			padding-block: var(--space-3) var(--space-7);
		}

		.dialogue-row {
			display: flex;
			align-items: center;
			gap: var(--space-7);
			margin: 0;
			border: 0;
			background: none;
			font-family: var(--font-family-body);
		}

		.image-button {
			-webkit-tap-highlight-color: transparent;
			flex: none;
			margin: 0;
			padding: 0;
			border: 0;
			background: none;
			cursor: grab;
			transform: scale(1);
			transform-origin: center bottom;
			transition: transform var(--motion-duration-press) var(--motion-ease-out);
		}

		:host([pressing]) .image-button {
			transform: scale(0.985);
		}

		.image-button:focus-visible {
			border-radius: var(--radius-medium);
			outline: var(--focus-ring-width-strong) solid
				var(--focus-ring-color-playful);
			outline-offset: var(--focus-ring-offset-wide);
		}

		.portrait {
			display: block;
			overflow: visible;
			filter: var(--dog-image-filter);
		}

		.portrait.flip {
			transform: scaleX(-1);
		}

		#tail {
			transform-box: view-box;
			transform-origin: 0 0;
		}

		.dialogue {
			flex: 1;
			min-width: 0;
		}

		p {
			margin: 0;
			text-align: left;
			font-family: var(--font-family-heading);
			font-size: var(--type-callout-size);
			font-style: italic;
			line-height: var(--line-height-normal);
			overflow-wrap: anywhere;
		}

		.quote-mark {
			color: var(--color-text-secondary);
			font-style: normal;
		}

		.attribution {
			margin-block-end: var(--space-3);
			text-align: center;
			color: var(--dog-credit-color);
			font-family: var(--font-family-body);
			font-size: var(--type-caption-size);
			font-style: normal;
			font-variant-caps: all-small-caps;
			white-space: nowrap;
		}

		::slotted([slot="controls"]) {
			display: flex;
			align-items: center;
			gap: var(--space-3);
			width: 100%;
			margin: var(--space-5) 0 0;
			font-family: var(--font-family-body);
			font-size: var(--type-ui-size);
			font-style: normal;
			text-align: start;
		}

		::slotted(code) {
			font-weight: var(--font-weight-bold);
		}

		@container (width < 40ch) {
			s-full-bleed {
				padding-block-end: var(--space-5);
			}

			.dialogue-row {
				flex-direction: column-reverse;
				gap: var(--space-4);
			}

			.dialogue {
				width: 100%;
			}

			p {
				width: fit-content;
				margin-inline: auto;
			}

			.image-button {
				width: clamp(48px, 20cqw, 72px);
			}

			.portrait {
				width: 100%;
				height: auto;
			}
		}

		:host([portrait-only]) {
			container-type: normal;
		}

		:host([portrait-only]) .image-button {
			display: block;
			width: 100%;
		}

		:host([portrait-only]) .portrait {
			width: 100%;
			height: auto;
		}

		@media (prefers-reduced-motion: reduce) {
			.image-button,
			:host([pressing]) .image-button {
				transform: none;
				transition: none;
			}
		}
	`;

	override connectedCallback(): void {
		super.connectedCallback();
		this.dataset.dog = "";
		document.addEventListener("visibilitychange", this.handleVisibilityChange);
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		document.removeEventListener(
			"visibilitychange",
			this.handleVisibilityChange,
		);
		this.stopPetting();
	}

	protected override render() {
		const resting = this.portrait;
		const variant = this.petting ? (this.petPortrait ?? resting) : resting;
		// Keep both the resting footprint and viewBox throughout petting.
		// The normalised drawings then share exactly the same scale and origin,
		// even when one has extra artwork above its head (such as a question mark).
		const [x, y, croppedWidth, height] = resting.bounds;
		const canvasWidth = resting.canvas?.[0] ?? 640;
		// The drawings share a body centre; tight bounds also include off-centre tails.
		const width = this.portraitOnly
			? 2 * Math.max(canvasWidth / 2 - x, x + croppedWidth - canvasWidth / 2)
			: croppedWidth;
		const viewBox = this.portraitOnly
			? [canvasWidth / 2 - width / 2, y, width, height]
			: resting.bounds;
		const scale = 180 / canvasWidth;
		const alt = this.resolveAlt(variant);

		const image = html`<button
			class="image-button"
			type="button"
			aria-label=${`Pet dog. ${alt}`}
			@pointerdown=${this.pointerPress.start}
			@pointerup=${this.pointerPress.end}
			@pointercancel=${this.pointerPress.end}
			@click=${this.handleImageClick}
		>
			<svg
				class=${variant.flip ? "portrait flip" : "portrait"}
				viewBox=${viewBox.join(" ")}
				width=${width * scale}
				height=${height * scale}
				aria-hidden="true"
			>
				${unsafeSVG(variant.artwork)}
			</svg>
		</button>`;

		if (this.portraitOnly) {
			return image;
		}

		return html`
			<s-full-bleed>
				<div class="attribution">${resting.name} says...</div>
				<div class="dialogue-row">
					${image}
					<div class="dialogue">
						<p>
							<span
								class="quote-mark"
								aria-hidden="true"
								>“</span
							><slot @slotchange=${this.trimDialogueWhitespace}></slot
							><span
								class="quote-mark"
								aria-hidden="true"
								>”</span
							>
						</p>
						<slot name="controls"></slot>
					</div>
				</div>
			</s-full-bleed>
		`;
	}

	private trimDialogueWhitespace(event: Event): void {
		// SAFETY: this handler is attached to the default dialogue slot.
		const slot = event.currentTarget as HTMLSlotElement;
		const nodes = slot.assignedNodes();
		const first = nodes[0];
		const last = nodes.at(-1);
		// WebKit can fire slotchange again when an assigned text node is rewritten.
		if (first?.nodeType === Node.TEXT_NODE) {
			const trimmed = first.textContent?.trimStart() ?? "";
			if (first.textContent !== trimmed) {
				first.textContent = trimmed;
			}
		}
		if (last?.nodeType === Node.TEXT_NODE) {
			const trimmed = last.textContent?.trimEnd() ?? "";
			if (last.textContent !== trimmed) {
				last.textContent = trimmed;
			}
		}
	}

	private resolveAlt(variant: DogPortrait): string {
		const language = document.documentElement.lang.split("-")[0] ?? "";
		return variant.alt[language] ?? variant.alt.en;
	}

	private handleImageClick = (event: MouseEvent): void => {
		// SAFETY: handleImageClick is attached directly to the dog image's button.
		const target = event.currentTarget as HTMLButtonElement;
		const bounds = target.getBoundingClientRect();
		const point =
			event.detail === 0
				? {
						x: bounds.left + bounds.width / 2 + window.scrollX,
						y: bounds.top + bounds.height / 2 + window.scrollY,
					}
				: { x: event.pageX, y: event.pageY };
		void this.pet(point);
	};

	private readonly handleVisibilityChange = (): void => {
		if (document.hidden) {
			this.stopPetting();
		}
	};

	private stopPetting(): void {
		this.sequence += 1;
		this.petting = false;
		this.animations.cancelAnimations();
		for (const particle of this.particles) {
			particle.remove();
		}
		this.particles.clear();
	}

	private async pet(point: { x: number; y: number }): Promise<void> {
		this.stopPetting();
		const sequence = this.sequence;
		if (!this.isConnected || document.hidden) {
			return;
		}

		try {
			this.petting = true;
			await this.updateComplete;
			if (sequence !== this.sequence) {
				return;
			}
			if (prefersReducedMotion()) {
				await this.spawnStationaryHeart(point);
				return;
			}

			// SAFETY: render always creates this portrait before updateComplete resolves.
			const portrait =
				this.renderRoot.querySelector<SVGSVGElement>(".portrait")!;
			const head = this.headPoint(portrait);
			await Promise.all([
				this.wagTail(portrait),
				this.explodeHearts(point),
				...Array.from({ length: 3 }, (_, index) =>
					this.floatHeart(head, index),
				),
			]);
		} catch (error) {
			if (!(error instanceof DOMException && error.name === "AbortError")) {
				throw error;
			}
		} finally {
			if (sequence === this.sequence) {
				this.petting = false;
			}
		}
	}

	private async wagTail(portrait: SVGSVGElement): Promise<void> {
		const tail = portrait.querySelector<SVGGElement>("#tail");
		if (!tail) {
			// The author's PNG portrait has no tail.
			return;
		}
		// Map the normalised canvas centre into the tail parent's coordinates.
		// Some optimised drawings retain a translated/scaled outer group.
		// SAFETY: bundled tail groups are children of an SVG root or graphics group.
		const parent = tail.parentNode as SVGGraphicsElement;
		const canvasToParent = DOMMatrix.fromMatrix(parent.getScreenCTM()!)
			.inverse()
			.multiply(DOMMatrix.fromMatrix(portrait.getScreenCTM()!));
		const original = DOMMatrix.fromMatrix(
			tail.transform.baseVal.consolidate()?.matrix,
		);
		const mirror = new DOMMatrix().translate(640, 0).scale(-1, 1);
		const flipped = canvasToParent
			.multiply(mirror)
			.multiply(canvasToParent.inverse())
			.multiply(original);
		await this.playAnimation(
			tail,
			Array.from({ length: 6 }, (_, index) => ({
				transform: (index % 2 === 0 ? original : flipped).toString(),
				offset: index / 5,
				easing: "steps(1, end)",
			})),
			{ duration: 1500 },
		);
	}

	private headPoint(portrait: SVGSVGElement) {
		const variant = this.petPortrait ?? this.portrait;
		const head = new DOMPoint(
			variant.canvas ? 100 : 320,
			variant.canvas ? 45 : 230,
		).matrixTransform(portrait.getScreenCTM()!);
		return {
			x: head.x + window.scrollX,
			y: head.y + window.scrollY,
		};
	}

	private async playAnimation(
		element: Element,
		keyframes: Keyframe[],
		options: KeyframeAnimationOptions,
	): Promise<void> {
		const animation = element.animate(keyframes, options);
		this.animations.trackAnimation(animation);
		try {
			await animation.finished;
		} finally {
			animation.cancel();
		}
	}

	private createHeart(point: { x: number; y: number }): HTMLElement {
		const heart = document.createElement("div");
		heart.className = "s-dog-heart";
		heart.setAttribute("aria-hidden", "true");
		// Body-level particles cannot inherit paint from the dog's shadow host.
		Object.assign(heart.style, {
			color: getComputedStyle(this)
				.getPropertyValue("--color-data-fill-pink")
				.trim(),
			width: "20px",
			height: "20px",
			marginLeft: "-10px",
			marginTop: "-10px",
			left: "0",
			opacity: "0",
			pointerEvents: "none",
			position: "absolute",
			top: "0",
			transform: `translate(${point.x}px, ${point.y}px)`,
			zIndex: "1000",
		});
		render(
			html`<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				width="20"
				height="20"
			>
				<path
					fill="currentColor"
					d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
				></path>
			</svg>`,
			heart,
		);
		this.appendParticle(heart);
		return heart;
	}

	private async spawnStationaryHeart(point: {
		x: number;
		y: number;
	}): Promise<void> {
		const heart = this.createHeart(point);
		try {
			await this.playAnimation(
				heart,
				[{ opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }],
				{ duration: 600, easing: "ease-out" },
			);
		} finally {
			this.removeParticle(heart);
		}
	}

	private async explodeHearts(point: { x: number; y: number }): Promise<void> {
		await Promise.all(
			Array.from({ length: 10 }, async (_, index) => {
				const heart = this.createHeart(point);
				const angle = (index * Math.PI * 2) / 10;
				const distance = randomInteger(40, 75);
				const x = point.x + Math.cos(angle) * distance;
				const y = point.y + Math.sin(angle) * distance;
				const rotation = randomInteger(-35, 35);
				try {
					await this.playAnimation(
						heart,
						[
							{
								opacity: 0,
								transform: `translate(${point.x}px, ${point.y}px) scale(0.3)`,
							},
							{ opacity: 1, offset: 0.15 },
							{
								opacity: 0,
								transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(1.1)`,
							},
						],
						{ duration: 650, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
					);
				} finally {
					this.removeParticle(heart);
				}
			}),
		);
	}

	private async floatHeart(
		point: { x: number; y: number },
		index: number,
	): Promise<void> {
		const heart = this.createHeart(point);
		const drift = (index - 1) * 24;
		try {
			await this.playAnimation(
				heart,
				[
					{
						opacity: 0,
						transform: `translate(${point.x}px, ${point.y}px) scale(0.65)`,
					},
					{ opacity: 1, offset: 0.2 },
					{ opacity: 0.9, offset: 0.65 },
					{
						opacity: 0,
						transform: `translate(${point.x + drift}px, ${point.y - 85}px) scale(1.15)`,
					},
				],
				{ duration: 1200, delay: index * 140, easing: "ease-out" },
			);
		} finally {
			this.removeParticle(heart);
		}
	}

	private appendParticle(particle: HTMLElement): void {
		this.particles.add(particle);
		document.body.append(particle);
	}

	private removeParticle(particle: HTMLElement): void {
		particle.remove();
		this.particles.delete(particle);
	}
}
