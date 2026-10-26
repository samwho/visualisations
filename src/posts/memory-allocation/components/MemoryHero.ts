import { ResizeController } from "../../../shared/core/controllers/ResizeController";
import {
	seasonalPalette,
	type SeasonalPalette,
} from "../../../shared/core/SeasonalPalette";
import { MediaQueryController } from "../../../shared/core/controllers/MediaQueryController";
import { css, html, LitElement } from "lit";
import "../../../shared/components/Button";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import leftArrow from "../../../../static/images/icons/framework7/cropped/arrow_left.svg";
import rightArrow from "../../../../static/images/icons/framework7/cropped/arrow_right.svg";
import downArrow from "../../../../static/images/icons/framework7/cropped/arrow_down.svg";
import rotateArrow from "../../../../static/images/icons/framework7/cropped/arrow_clockwise.svg";
import { customElement, property, state } from "lit/decorators.js";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { TimelineController } from "../../../shared/core/controllers/TimelineController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import { COLUMNS, HeroTetris } from "../model/HeroTetris";

type HeroAction = "left" | "right" | "down" | "rotate";

// NTSC NES DAS: 16 frames initially, then 6; soft drop advances every 2 frames.
// https://tetris.wiki/Tetris_(NES)
// Rotation also repeats at the DAS cadence here, unlike the NES's edge-only rotation.
const FRAME_MS = 1000 / 60;
const HOLD_DELAY = 16 * FRAME_MS;
const HOLD_INTERVAL = 6 * FRAME_MS;
const DROP_INTERVAL = 2 * FRAME_MS;
const TARGET_CELLS = COLUMNS * 10;

interface HeldInput {
	surface: HTMLElement;
	delay?: number;
	interval?: number;
}

interface HeroTouch {
	identifier: number;
	time: number;
	x: number;
	y: number;
}

const LOSS_MESSAGE = [
	"101.111.101",
	"101.101.101",
	"010.101.101",
	"010.111.111",
	"",
	"100.111.011.111",
	"100.101.100.110",
	"100.101.001.100",
	"111.111.110.111",
];

@customElement("s-memory-hero")
export class MemoryHero extends LitElement {
	@property({ reflect: true, attribute: "data-palette" })
	palette: SeasonalPalette = seasonalPalette();

	@property({ reflect: true })
	controls: "auto" | "keyboard" | "touch" = "auto";

	private readonly coarsePointer = new MediaQueryController(
		this,
		"(pointer: coarse)",
	);

	private get touchControls(): boolean {
		return (
			this.controls === "touch" ||
			(this.controls === "auto" && this.coarsePointer.matches)
		);
	}

	private readonly motion = new MediaQueryController(
		this,
		"(prefers-reduced-motion: reduce)",
	);

	private game = new HeroTetris(this.motion.matches);

	@state()
	private measured = false;

	private timer?: number;

	private readonly heldInputs = new Map<number, HeldInput>();

	private touchStart?: HeroTouch;

	private lastTap?: HeroTouch;

	private clearStep = -1;

	private lossPhase = 0;

	@property({ type: Boolean, reflect: true })
	private playing = false;

	private readonly visibility = new VisibilityController(this);

	private readonly timeline = new TimelineController(this, this.visibility);

	constructor() {
		super();
		this.motion.addEventListener("change", this.motionChanged);
		this.timeline.addEventListener("pause", this.releaseInputs);
		this.coarsePointer.addEventListener("change", () => this.requestUpdate());
		new ThemeController(this);
		const resize = new ResizeController(
			this,
			() =>
				this.renderRoot.querySelector<HTMLElement>(".board-space") ?? undefined,
		);
		resize.addEventListener("resize", (event) => {
			// SAFETY: ResizeController forwards its ResizeObserverEntry.
			const { width, height } = (event as CustomEvent<ResizeObserverEntry>)
				.detail.contentRect;
			if (width === 0 || height === 0) {
				return;
			}
			const button =
				this.renderRoot.querySelector<HTMLButtonElement>("button")!;
			const gap = Number.parseFloat(getComputedStyle(button).rowGap);
			const columns = Math.max(
				12,
				Math.min(
					COLUMNS,
					Math.round(Math.sqrt((TARGET_CELLS * width) / height) / 2) * 2,
				),
			);
			const cellSize = (width - (columns - 1) * gap) / columns;
			// Bound both the DOM size and autoplay's search on unusually narrow containers.
			const rows = Math.max(
				LOSS_MESSAGE.length,
				Math.min(48, Math.floor((height + gap) / (cellSize + gap))),
			);
			if (
				rows !== this.game.board.length ||
				columns !== this.game.board[0]!.length
			) {
				this.stop();
				this.style.setProperty("--memory-hero-columns", String(columns));
				this.game.resize(rows, columns);
				this.requestUpdate();
			}
			// The fallback grid must never paint before the reserved space is measured.
			this.measured = true;
			this.start();
		});

		this.visibility.addEventListener("visible", () => this.start());
		this.visibility.addEventListener("hidden", () => this.stop());
	}

	static override styles = css`
		/* Outer sizing lives in static/css/posts/memory-allocation.css to reserve space before upgrade. */
		:host {
			-webkit-user-select: none;
			user-select: none;
			-webkit-touch-callout: none;
			--_empty-cell-tint: 60%;
			--_piece-1: var(--memory-allocated);
			--_piece-2: var(--memory-metadata-size);
			--_piece-3: var(--memory-metadata-free);
			--_piece-4: var(--memory-metadata-free);
			--_piece-5: var(--color-data-fill-dark-blue);
			--_piece-6: var(--color-data-fill-red);
			--_piece-7: var(--color-data-fill-pink);
		}
		:host([data-palette="pride"]) {
			--_piece-1: var(--color-flag-pride-red);
			--_piece-2: var(--color-flag-pride-orange);
			--_piece-3: var(--color-flag-pride-yellow);
			--_piece-4: var(--color-flag-pride-green);
			--_piece-5: var(--color-flag-pride-green);
			--_piece-6: var(--color-flag-pride-blue);
			--_piece-7: var(--color-flag-pride-violet);
		}
		:host([data-palette="trans"]) {
			--_piece-1: var(--color-flag-trans-blue);
			--_piece-2: var(--color-flag-trans-pink);
			--_piece-3: var(--color-flag-trans-white);
			--_piece-4: var(--color-flag-trans-white);
			--_piece-5: var(--color-flag-trans-white);
			--_piece-6: var(--color-flag-trans-pink);
			--_piece-7: var(--color-flag-trans-blue);
		}
		:host([data-theme="dark"]) {
			--_empty-cell-tint: 20%;
		}
		:host([data-theme="dark"]) .board {
			filter: brightness(0.85);
		}
		.board-space {
			flex: 1;
			min-height: 0;
			display: flex;
			align-items: center;
		}
		.board {
			visibility: hidden;
			display: grid;
			grid-template-columns: repeat(
				var(--memory-hero-columns, 20),
				minmax(0, 1fr)
			);
			gap: var(--memory-hero-cell-gap);
			width: 100%;
			padding: 0;
			border: 0;
			background: none;
			cursor: pointer;
			touch-action: pan-y;
		}
		.board[data-ready] {
			visibility: visible;
		}
		.board:focus-visible {
			outline: var(--focus-ring-width) solid var(--focus-ring-color);
			outline-offset: var(--focus-ring-offset);
		}
		.cell {
			/* Grid-sized squares can isolate paint invalidation to changed cells. */
			contain: strict;
			aspect-ratio: 1;
			min-width: 0;
			border-radius: 22%;
			background: color-mix(
				in srgb,
				var(--memory-available) var(--_empty-cell-tint),
				var(--color-surface-page)
			);
		}
		.instructions {
			position: absolute;
			inset-inline: 0;
			top: 100%;
			height: var(--memory-hero-reveal-height);
			box-sizing: border-box;
			padding-block: var(--memory-hero-instructions-gap);
			clip-path: inset(0 0 100% 0);
			transition: clip-path var(--motion-duration-move) ease-out;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 0.75rem;
			white-space: nowrap;
			margin: 0;
			font-size: var(--type-caption-size);
			line-height: 1.5;
			text-align: start;
			color: var(--color-text-secondary);
		}
		.instructions[data-visible="true"] {
			clip-path: inset(0);
		}
		kbd {
			display: inline-block;
			min-width: 1.1em;
			padding: 0.15em 0.4em;
			border: 1px solid var(--color-border-control);
			border-bottom-width: 3px;
			border-radius: 0.3em;
			background: var(--color-surface-raised);
			color: var(--color-text-primary);
			font: 0.9em / 1.2 var(--font-family-code);
			text-align: center;
		}
		.key-group {
			display: inline-block;
			white-space: nowrap;
		}
		.sr-only {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}
		.colour-8 {
			background: var(--color-status-danger-foreground);
		}
		.tetris-flash {
			background: var(--color-surface-fixed-light);
		}
		.score {
			flex: none;
			margin-inline-start: auto;
			font: 1em / 1.5 var(--font-family-code);
			font-variant-numeric: tabular-nums;
			color: var(--color-text-primary);
		}
		@media (prefers-reduced-motion: reduce) {
			.instructions {
				transition: none;
			}
		}
		.touch-buttons {
			display: flex;
			gap: 0.5rem;
		}
		.play-again {
			--button-height: 44px;
		}
		s-button:not(.play-again) {
			touch-action: none;
			--button-height: 44px;
			--button-min-width: 44px;
			--control-padding-inline: 0;
			width: 44px;
			height: 44px;
		}
		.button-icon {
			display: inline-flex;
			width: var(--icon-size-small);
			height: var(--icon-size-small);
		}
		.button-icon svg {
			width: 100%;
			height: 100%;
			fill: currentColor;
		}
		.instructions[data-touch="true"] .score {
			position: absolute;
			left: 50%;
			transform: translateX(-50%);
			margin-inline-start: 0;
		}
		.instructions[data-touch="true"] .score-label {
			display: none;
		}
		@container (width < 32rem) {
			.alternate-keys {
				display: none;
			}
		}
		@container (width < 24rem) {
			.move-label,
			.score-label {
				display: none;
			}
		}
		.colour-1 {
			background: var(--_piece-1);
		}
		.colour-2 {
			background: var(--_piece-2);
		}
		.colour-3 {
			background: var(--_piece-3);
		}
		.colour-4 {
			background: var(--_piece-4);
		}
		.colour-5 {
			background: var(--_piece-5);
		}
		.colour-6 {
			background: var(--_piece-6);
		}
		.colour-7 {
			background: var(--_piece-7);
		}
	`;

	override connectedCallback(): void {
		super.connectedCallback();
		window.addEventListener("blur", this.releaseInputs);
		this.addEventListener("touchstart", this.handleTouchStart, {
			passive: false,
		});
		this.addEventListener("touchend", this.handleTouchEnd);
		this.addEventListener("touchcancel", this.clearTouchStart);
	}

	override disconnectedCallback(): void {
		this.releaseInputs();
		window.removeEventListener("blur", this.releaseInputs);
		this.removeEventListener("touchstart", this.handleTouchStart);
		this.removeEventListener("touchend", this.handleTouchEnd);
		this.removeEventListener("touchcancel", this.clearTouchStart);
		this.touchStart = undefined;
		this.lastTap = undefined;
		super.disconnectedCallback();
		this.stop();
	}

	private readonly handleTouchStart = (event: TouchEvent): void => {
		if (event.touches.length !== 1 || event.changedTouches.length !== 1) {
			this.touchStart = undefined;
			return;
		}
		const touch = event.changedTouches[0]!;
		const lastTap = this.lastTap;
		// WebKit can show its loupe on tap-then-hold even with selection disabled.
		// Cancel only a nearby second touch so ordinary swipes can still scroll.
		if (
			lastTap &&
			event.timeStamp - lastTap.time < 500 &&
			Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y) < 40
		) {
			event.preventDefault();
		}
		this.touchStart = {
			identifier: touch.identifier,
			time: event.timeStamp,
			x: touch.clientX,
			y: touch.clientY,
		};
	};

	private readonly handleTouchEnd = (event: TouchEvent): void => {
		const start = this.touchStart;
		this.touchStart = undefined;
		if (
			!start ||
			event.touches.length > 0 ||
			event.changedTouches.length !== 1
		) {
			this.lastTap = undefined;
			return;
		}
		const touch = event.changedTouches[0]!;
		this.lastTap =
			touch.identifier === start.identifier &&
			event.timeStamp - start.time < 300 &&
			Math.hypot(touch.clientX - start.x, touch.clientY - start.y) < 12
				? {
						...start,
						time: event.timeStamp,
						x: touch.clientX,
						y: touch.clientY,
					}
				: undefined;
	};

	private readonly clearTouchStart = (): void => {
		this.touchStart = undefined;
		this.lastTap = undefined;
	};

	protected override updated(): void {
		if (!this.playing || !this.touchControls || this.game.lost) {
			this.releaseInputs();
		}
	}

	private readonly motionChanged = (): void => {
		this.stop();
		if (this.playing) {
			if (this.game.lost && this.motion.matches) {
				this.lossPhase = 4;
			}
			this.requestUpdate();
			this.start();
			return;
		}
		this.game = new HeroTetris(
			this.motion.matches,
			this.game.board.length,
			this.game.board[0]!.length,
		);
		this.playing = false;
		this.lossPhase = 0;
		this.clearStep = -1;
		this.requestUpdate();
		this.start();
	};

	private start(): void {
		if (this.game.lost && (this.motion.matches || this.lossPhase >= 4)) {
			this.stop();
			return;
		}
		if (
			!this.measured ||
			this.timer !== undefined ||
			this.visibility.isHidden ||
			(this.motion.matches && !this.playing) ||
			!this.isConnected
		) {
			return;
		}
		this.timeline.resume();
		this.timer = this.timeline.setTimeout(
			() => {
				this.timer = undefined;
				if (this.game.lost) {
					this.lossPhase++;
				} else if (
					!this.motion.matches &&
					this.game.clearing.length > 0 &&
					this.clearStep < 4
				) {
					this.clearStep++;
				} else {
					this.game.step();
					this.clearStep =
						this.game.clearing.length === 4 && !this.motion.matches
							? -3
							: this.game.clearing.length > 0
								? 0
								: -1;
					if (this.game.lost) {
						this.lossPhase = 0;
					}
				}
				this.requestUpdate();
				this.start();
			},
			// NES clears five centre-out bands, each lasting four frames at 60Hz.
			this.game.lost
				? 450
				: this.game.clearing.length > 0
					? this.clearStep < 0
						? 250
						: 1000 / 15
					: this.game.stepDelay,
		);
	}

	private stop(): void {
		if (this.timer !== undefined) {
			this.timeline.clearTimeout(this.timer);
		}
		this.timeline.pause();
		this.timer = undefined;
	}

	private takeOver(event: MouseEvent): void {
		if (this.game.lost) {
			return;
		}
		if (!this.playing) {
			this.stop();
			if (this.motion.matches) {
				this.game = new HeroTetris(
					false,
					this.game.board.length,
					this.game.board[0]!.length,
					0,
				);
			}
			this.game.takeOver();
			this.playing = true;
		} else if (event.detail > 0 && !this.touchControls) {
			this.game.rotate();
		}
		this.renderRoot
			.querySelector<HTMLButtonElement>("button")
			?.focus({ preventScroll: true });
		this.requestUpdate();
		this.start();
	}

	private playAgain(): void {
		this.stop();
		this.game = new HeroTetris(
			false,
			this.game.board.length,
			this.game.board[0]!.length,
			0,
		);
		this.game.takeOver();
		this.playing = true;
		this.lossPhase = 0;
		this.clearStep = -1;
		this.renderRoot
			.querySelector<HTMLButtonElement>(".board")
			?.focus({ preventScroll: true });
		this.requestUpdate();
		this.start();
	}

	private keyDown(event: KeyboardEvent): void {
		if (
			!this.playing ||
			this.game.lost ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey
		) {
			return;
		}
		const key = event.key.toLowerCase();
		if (
			!["a", "d", "s", "arrowleft", "arrowright", "arrowdown", " "].includes(
				key,
			)
		) {
			return;
		}
		event.preventDefault();
		if (this.game.clearing.length > 0) {
			return;
		}
		if (key === "a" || key === "arrowleft") {
			this.game.move(-1);
		} else if (key === "d" || key === "arrowright") {
			this.game.move(1);
		} else if (key === "s" || key === "arrowdown") {
			this.game.drop();
		} else if (!event.repeat) {
			this.game.rotate();
		}
		this.afterInput();
	}

	private afterInput(): void {
		if (this.game.lost) {
			this.stop();
			this.lossPhase = 0;
			this.start();
		} else if (this.game.clearing.length > 0 && this.clearStep < 0) {
			this.clearStep =
				this.game.clearing.length === 4 && !this.motion.matches ? -3 : 0;
		}
		this.requestUpdate();
	}

	private holdInput(event: PointerEvent, action: HeroAction): void {
		if (event.button !== 0 || !this.playing || this.game.lost) {
			return;
		}
		event.preventDefault();
		// SAFETY: s-button originates pointer presses on its native button; its slot ignores pointers.
		// Capture there to preserve the shared control's press feedback.
		const surface = event.composedPath()[0] as HTMLElement;
		surface.setPointerCapture(event.pointerId);
		surface.focus({ preventScroll: true });
		const held: HeldInput = { surface };
		this.heldInputs.set(event.pointerId, held);
		this.touchInput(action);
		if (!this.heldInputs.has(event.pointerId)) {
			return;
		}
		const interval = action === "down" ? DROP_INTERVAL : HOLD_INTERVAL;
		held.delay = this.timeline.setTimeout(
			() => {
				held.delay = undefined;
				this.touchInput(action);
				if (this.heldInputs.has(event.pointerId)) {
					held.interval = this.timeline.setInterval(
						() => this.touchInput(action),
						interval,
					);
				}
			},
			action === "down" ? DROP_INTERVAL : HOLD_DELAY,
		);
	}

	private readonly releaseInput = (event: PointerEvent): void => {
		this.releasePointer(event.pointerId);
	};

	private releasePointer(pointerId: number): void {
		const held = this.heldInputs.get(pointerId);
		if (!held) {
			return;
		}
		this.heldInputs.delete(pointerId);
		if (held.delay !== undefined) {
			this.timeline.clearTimeout(held.delay);
		}
		if (held.interval !== undefined) {
			this.timeline.clearInterval(held.interval);
		}
		if (held.surface.hasPointerCapture(pointerId)) {
			held.surface.releasePointerCapture(pointerId);
		}
	}

	private readonly releaseInputs = (): void => {
		for (const pointerId of this.heldInputs.keys()) {
			this.releasePointer(pointerId);
		}
	};

	private clickInput(event: MouseEvent, action: HeroAction): void {
		// Pointer input already acts on press; native keyboard/AT clicks still activate.
		if (event.detail === 0) {
			this.touchInput(action);
		}
	}

	private touchInput(action: HeroAction): void {
		if (!this.playing || this.game.lost || this.game.clearing.length > 0) {
			return;
		}
		if (action === "rotate") {
			this.game.rotate();
		} else if (action === "down") {
			this.game.drop();
		} else {
			this.game.move(action === "left" ? -1 : 1);
		}
		this.afterInput();
	}

	protected override render() {
		const columns = this.game.board[0]!.length;
		const cells = this.game
			.cells()
			.flat()
			.map((colour, i) => {
				const row = Math.floor(i / columns);
				if (this.game.lost) {
					const pixels =
						LOSS_MESSAGE[
							row -
								Math.floor((this.game.board.length - LOSS_MESSAGE.length) / 2)
						] ?? "";
					const x = (i % columns) - Math.floor((columns - pixels.length) / 2);
					return pixels[x] === "1" &&
						(this.motion.matches || this.lossPhase % 2 === 0)
						? 8
						: 0;
				}
				const distance = Math.abs((i % columns) - (columns - 1) / 2);
				const band = Math.floor((distance * 10) / columns);
				return this.game.clearing.includes(row) && band <= this.clearStep
					? 0
					: colour;
			});
		return html`<div class="board-space">
				<button
					type="button"
					class="board"
					?data-ready=${this.measured}
					?inert=${!this.measured}
					data-playing=${this.playing}
					aria-label=${this.game.lost ? "You lose" : this.playing ? "Tetris game" : "Take over Tetris game"}
					aria-describedby=${this.playing ? "instructions" : ""}
					aria-expanded=${this.playing}
					aria-controls="instructions"
					@click=${this.takeOver}
					@keydown=${this.keyDown}
				>
					${cells.map(
						(colour, i) =>
							html`<span
								aria-hidden="true"
								class="cell colour-${colour} ${!this.motion.matches && this.game.clearing.length === 4 && (this.clearStep === -3 || this.clearStep === -1) && this.game.clearing.includes(Math.floor(i / columns)) ? "tetris-flash" : ""}"
							></span>`,
					)}
				</button>
			</div>
			<div
				id="instructions"
				class="instructions"
				data-visible=${this.playing}
				?inert=${!this.playing}
				data-touch=${this.touchControls}
				@contextmenu=${(event: Event) => event.preventDefault()}
			>
				${
					this.game.lost
						? html`<s-button
								class="play-again"
								@click=${this.playAgain}
								>Play again</s-button
							>`
						: this.touchControls
							? html`<span class="touch-buttons">
									<s-button
										label="Move left"
										?disabled=${this.game.lost}
										@pointerdown=${(event: PointerEvent) => this.holdInput(event, "left")}
										@pointerup=${this.releaseInput}
										@pointercancel=${this.releaseInput}
										@lostpointercapture=${this.releaseInput}
										@click=${(event: MouseEvent) => this.clickInput(event, "left")}
										><span
											slot="icon"
											class="button-icon"
											aria-hidden="true"
											>${unsafeSVG(leftArrow)}</span
										></s-button
									>
									<s-button
										label="Move down"
										?disabled=${this.game.lost}
										@pointerdown=${(event: PointerEvent) => this.holdInput(event, "down")}
										@pointerup=${this.releaseInput}
										@pointercancel=${this.releaseInput}
										@lostpointercapture=${this.releaseInput}
										@click=${(event: MouseEvent) => this.clickInput(event, "down")}
										><span
											slot="icon"
											class="button-icon"
											aria-hidden="true"
											>${unsafeSVG(downArrow)}</span
										></s-button
									>
								</span>`
							: html`<span class="keyboard-hint">
									<span class="alternate-keys"
										><span class="key-group"
											><kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></span
										>
										/
									</span>
									<span class="key-group"
										><kbd aria-label="Left arrow">←</kbd>
										<kbd aria-label="Down arrow">↓</kbd>
										<kbd aria-label="Right arrow">→</kbd></span
									>
									<span class="move-label">move, </span><kbd>Space</kbd> rotate.
								</span>`
				}
				<span
					class="score"
					aria-label="Score"
					><span class="score-label">Score: </span
					>${this.game.score.toLocaleString("en-GB")}</span
				>
				${
					this.touchControls && !this.game.lost
						? html`<span class="touch-buttons">
								<s-button
									label="Rotate"
									?disabled=${this.game.lost}
									@pointerdown=${(event: PointerEvent) => this.holdInput(event, "rotate")}
									@pointerup=${this.releaseInput}
									@pointercancel=${this.releaseInput}
									@lostpointercapture=${this.releaseInput}
									@click=${(event: MouseEvent) => this.clickInput(event, "rotate")}
									><span
										slot="icon"
										class="button-icon"
										aria-hidden="true"
										>${unsafeSVG(rotateArrow)}</span
									></s-button
								>
								<s-button
									label="Move right"
									?disabled=${this.game.lost}
									@pointerdown=${(event: PointerEvent) => this.holdInput(event, "right")}
									@pointerup=${this.releaseInput}
									@pointercancel=${this.releaseInput}
									@lostpointercapture=${this.releaseInput}
									@click=${(event: MouseEvent) => this.clickInput(event, "right")}
									><span
										slot="icon"
										class="button-icon"
										aria-hidden="true"
										>${unsafeSVG(rightArrow)}</span
									></s-button
								>
							</span>`
						: ""
				}
			</div>
			<span
				class="sr-only"
				role="status"
				>${this.game.lost ? "You lose." : ""}</span
			>`;
	}
}
