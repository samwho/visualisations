import { MediaQueryController } from "../core/controllers/MediaQueryController";
import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { guard } from "lit/directives/guard.js";
import { repeat } from "lit/directives/repeat.js";
import { ThemeController } from "../core/controllers/ThemeController";
import {
	SplitFlapTransitions,
	type SplitFlapFace,
	type SplitFlapHighlight,
	type SplitFlapTurn,
} from "./SplitFlapTransitions";

import { splitFlapColours } from "./SplitFlapStyles";

export type { SplitFlapHighlight } from "./SplitFlapTransitions";

@customElement("s-split-flap")
export class SplitFlap extends LitElement {
	/** One grapheme, including multi-codepoint glyphs such as emoji or accented letters. */
	@property() glyph = " ";

	@property() highlight: SplitFlapHighlight = "";

	/** Captured per face so the border arrives with the incoming glyph. */
	@property({ type: Boolean }) outlined = false;

	/** Optional CSS colour pair, used only while highlighted and captured per face. */
	@property({ attribute: "highlight-background" }) highlightBackground = "";

	@property({ attribute: "highlight-foreground" }) highlightForeground = "";

	@property({ type: Boolean }) quiet = false;

	@property({ type: Number }) delay = 0;

	/** Captured per update; changing it never retimes a flip already in progress. */
	@property({ type: Number }) duration = 480;

	/** Can force reduced motion; never overrides the system's reduced-motion preference. */
	@property({ type: Boolean, attribute: "reduced-motion" }) reducedMotion =
		false;

	private readonly motion = new MediaQueryController(
		this,
		"(prefers-reduced-motion: reduce)",
	);

	private transitions?: SplitFlapTransitions;

	private reportedActive = 0;

	constructor() {
		super();
		this.motion.addEventListener("change", this.motionChanged);
		new ThemeController(this);
	}

	static override styles = [
		splitFlapColours,
		css`
			:host {
				display: block;
				min-width: 0;
				aspect-ratio: 0.7;
				font: inherit;
			}
			.flap {
				position: relative;
				height: 100%;
			}
			.stack {
				position: absolute;
				inset: 0;
				z-index: 1;
			}
			.turning .stack {
				perspective: 150px;
			}
			.falling-top,
			.falling-bottom {
				backface-visibility: hidden;
			}
			.half {
				position: absolute;
				inset-inline: 0;
				height: 50%;
				overflow: hidden;
				background: var(--_surface);
				color: var(--_ink);
			}
			.half::after {
				content: "";
				position: absolute;
				inset: 0;
				border: var(--border-width-thin) solid var(--_border-color);
				border-radius: inherit;
				pointer-events: none;
			}
			.top::after {
				border-bottom: 0;
			}
			.bottom::after {
				border-top: 0;
			}
			.flap:not(.turning) .half::after {
				border-color: var(
					--split-flap-hover-border-color,
					var(--_border-color)
				);
			}
			.top {
				top: 0;
				border-radius: 3px 3px 0 0;
				transform-origin: bottom;
			}
			.bottom {
				bottom: 0;
				border-radius: 0 0 3px 3px;
				transform-origin: top;
			}
			.digit {
				position: absolute;
				inset-inline: 0;
				height: 200%;
				white-space: pre;
				display: grid;
				place-items: center;
			}
			.bottom .digit {
				bottom: 0;
			}
			.flap::after {
				content: "";
				position: absolute;
				top: calc(50% - 0.5px);
				inset-inline: 0;
				height: 1px;
				/* Opaque backing and independent stacks keep every leaf beneath a neutral hinge. */
				background:
					linear-gradient(
						var(--color-border-separator),
						var(--color-border-separator)
					),
					var(--color-surface-page);
				z-index: 2;
			}
			.falling-top {
				animation: fold var(--duration) cubic-bezier(0.45, 0, 0.8, 0.5) both;
				animation-delay: var(--delay);
			}
			.falling-bottom {
				animation: unfold var(--duration) cubic-bezier(0.2, 0.5, 0.4, 1) both;
				animation-delay: var(--delay);
			}
			.clear-face {
				animation: clear var(--clear-duration) ease-out both;
			}
			.clear-face.quiet {
				animation-name: clear-quiet;
			}
			.half {
				animation-play-state: var(--play-state, running);
			}
			@keyframes clear {
				from {
					background: var(--_old-highlight-surface);
					color: var(--_old-highlight-ink);
				}
				to {
					background: var(--_face-surface);
					color: var(--_face-foreground);
				}
			}
			@keyframes clear-quiet {
				from {
					background: var(--_old-highlight-surface);
					color: var(--_old-highlight-ink);
				}
				to {
					background: var(--_face-surface);
					color: var(--_face-foreground);
				}
			}
			@keyframes fold {
				0% {
					transform: rotateX(0);
				}
				50%,
				100% {
					transform: rotateX(-90deg);
				}
			}
			@keyframes unfold {
				0%,
				50% {
					transform: rotateX(90deg);
				}
				100% {
					transform: rotateX(0);
				}
			}
			@media (prefers-reduced-motion: reduce) {
				.falling-top,
				.falling-bottom,
				.clear-face {
					display: none;
					animation: none;
				}
			}
		`,
	];

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		// Detached animations cannot deliver their completion event.
		this.transitions?.settle();
		this.requestUpdate();
	}

	private readonly motionChanged = (): void =>
		this.requestUpdate("reducedMotion");

	protected override shouldUpdate(changed: PropertyValues<this>): boolean {
		if (!this.hasUpdated || changed.size === 0) {
			return true;
		}
		// Timing is captured by the next submission, not by existing leaves.
		for (const key of changed.keys()) {
			if (key !== "delay" && key !== "duration") {
				return true;
			}
		}
		return false;
	}

	protected override willUpdate(changed: PropertyValues<this>): void {
		const instant =
			this.reducedMotion || this.motion.matches || !this.isConnected;
		if (
			this.transitions &&
			!changed.has("glyph") &&
			!changed.has("highlight") &&
			!changed.has("highlightBackground") &&
			!changed.has("highlightForeground") &&
			!changed.has("outlined") &&
			!changed.has("quiet") &&
			!(changed.has("reducedMotion") && instant)
		) {
			return;
		}
		const face = {
			glyph: this.glyph,
			highlight: this.highlight,
			quiet: this.quiet,
			highlightBackground: this.highlightBackground,
			highlightForeground: this.highlightForeground,
			outlined: this.outlined,
		};
		if (!this.transitions) {
			this.transitions = new SplitFlapTransitions(face);
		} else if (
			instant ||
			face.glyph !== this.transitions.target.glyph ||
			face.highlight !== this.transitions.target.highlight ||
			face.quiet !== this.transitions.target.quiet ||
			face.highlightBackground !==
				this.transitions.target.highlightBackground ||
			face.highlightForeground !==
				this.transitions.target.highlightForeground ||
			face.outlined !== this.transitions.target.outlined
		) {
			this.transitions.submit(face, this.delay, this.duration, instant);
		}
	}

	protected override updated(): void {
		const active = this.transitions!.active.length;
		if (active !== this.reportedActive) {
			this.reportedActive = active;
			this.dispatchEvent(
				new CustomEvent<number>("flap-change", {
					detail: active,
					bubbles: true,
					composed: true,
				}),
			);
		}
	}

	private finished(event: AnimationEvent, turn: SplitFlapTurn): void {
		if (
			event.animationName !==
			(turn.turning ? "unfold" : turn.face.quiet ? "clear-quiet" : "clear")
		) {
			return;
		}
		const completed = this.transitions?.complete(turn.id);
		if (!completed) {
			return;
		}
		this.requestUpdate();
		this.dispatchEvent(
			new CustomEvent<SplitFlapFace>("flap-complete", {
				detail: completed,
				bubbles: true,
				composed: true,
			}),
		);
	}

	private highlightPaint(value: SplitFlapFace): [string, string] {
		const background = value.highlightBackground ?? "";
		const foreground = value.highlightForeground ?? "";
		return [
			background || `var(--_highlight-${value.highlight || "grey"}-surface)`,
			foreground ||
				`var(--color-palette-${value.highlight || "grey"}-foreground)`,
		];
	}

	private face(
		classes: string,
		value: SplitFlapFace,
		z: number,
		turn?: SplitFlapTurn,
	) {
		const [highlightSurface, highlightInk] = this.highlightPaint(value);
		const surface = value.highlight ? highlightSurface : "var(--_face-surface)";
		const ink = value.highlight ? highlightInk : "var(--_face-foreground)";
		let animation = "";
		if (turn) {
			const [oldSurface, oldInk] = this.highlightPaint(turn.from);
			animation = `--duration: ${turn.duration}ms; --delay: ${turn.delay}ms;
				--clear-duration: ${Math.min(320, turn.duration)}ms;
				--_old-highlight-surface: ${oldSurface}; --_old-highlight-ink: ${oldInk}`;
		}
		return html`<span
			class="half ${classes} ${value.quiet ? "quiet" : ""}"
			aria-hidden="true"
			style="z-index: ${z}; --_surface: ${surface}; --_ink: ${ink}; --_border-color: ${value.outlined ? "var(--color-border-control)" : "transparent"}; ${animation}"
			@animationend=${
				classes.includes("bottom") && turn
					? (event: AnimationEvent) => this.finished(event, turn)
					: undefined
			}
			><span class="digit">${value.glyph}</span></span
		>`;
	}

	protected override render() {
		const transitions = this.transitions!;
		return html`
			<div
				class="flap ${transitions.active.some((turn) => turn.turning) ? "turning" : ""}"
				role="img"
				aria-label=${transitions.current.glyph.trim() ? transitions.current.glyph : "Blank"}
			>
				<div class="stack">
					${guard([transitions.target, transitions.sequence], () => this.face("top", transitions.target, -transitions.sequence - 1))}
					${repeat(
						transitions.active,
						(turn) => turn.id,
						(turn) =>
							guard([turn], () =>
								this.face(
									turn.turning ? "top falling-top" : "top clear-face",
									turn.turning ? turn.from : turn.face,
									-turn.id,
									turn,
								),
							),
					)}
				</div>
				<div class="stack">
					${guard([transitions.current, transitions.settledId], () => this.face("bottom", transitions.current, transitions.settledId))}
					${repeat(
						transitions.active,
						(turn) => turn.id,
						(turn) =>
							guard([turn], () =>
								this.face(
									turn.turning ? "bottom falling-bottom" : "bottom clear-face",
									turn.face,
									turn.id,
									turn,
								),
							),
					)}
				</div>
			</div>
		`;
	}
}
