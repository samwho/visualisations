import { splitFlapColours } from "../../../shared/components/SplitFlapStyles";
import { seasonalPalette } from "../../../shared/core/SeasonalPalette";
import { MediaQueryController } from "../../../shared/core/controllers/MediaQueryController";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { HashingSound } from "./HashingSound";
import "./HashingSound";
import { HeroCanvas } from "./HeroCanvas";
import { ResizeController } from "../../../shared/core/controllers/ResizeController";
import { DPRController } from "../../../shared/core/controllers/DPRController";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import { FrameController } from "../../../shared/core/controllers/FrameController";
import { TimelineController } from "../../../shared/core/controllers/TimelineController";
import { HeroCascade, HERO_BITS } from "../model/HeroCascade";
import { realWorldHashers } from "../model/RealWorldHashers";

const prideStripes = ["red", "orange", "yellow", "green", "blue", "violet"];
const transStripes = ["blue", "pink", "white", "pink", "blue"];
const CYCLE = 5000;
const algorithms = [
	{ name: "murmur3", color: "green" },
	{ name: "xxhash32", color: "orange" },
	{ name: "farmhash32", color: "yellow" },
	{ name: "wyhash32", color: "pink" },
	{ name: "fasthash32", color: "dark-blue" },
] as const;

function hashRows(input: number): number[] {
	// Every algorithm receives the same four input bytes, not the preceding hash.
	const key = String.fromCharCode(
		...[0, 8, 16, 24].map((shift) => (input >>> shift) & 255),
	);
	return [input, ...algorithms.map(({ name }) => realWorldHashers[name](key))];
}

@customElement("s-hashing-hero")
export class HashingHero extends LitElement {
	private offscreen = true;

	@state() private visibleBits = HERO_BITS;

	private readonly palette = seasonalPalette();

	private sound?: HashingSound;

	private readonly model = new HeroCascade(hashRows);

	private readonly seenSequences = this.model.cells.map((row) =>
		row.map((cell) => cell.sequence),
	);

	private renderer?: HeroCanvas;

	private canvasBits = 0;

	private inputButtons: HTMLButtonElement[] = [];

	private rows: HTMLElement[] = [];

	private readonly motion = new MediaQueryController(
		this,
		"(prefers-reduced-motion: reduce)",
	);

	private clock = 0;

	private idleSince = 0;

	private sourceBit = 15;

	private readonly visibility = new VisibilityController(this, {
		rootMargin: "0px",
	});

	private readonly frames = new FrameController(
		this,
		new TimelineController(this, this.visibility),
	);

	constructor() {
		super();
		this.motion.addEventListener("change", this.motionChanged);
		this.frames.addEventListener("update", this.tick);
		this.frames.addEventListener("draw", () =>
			this.renderer?.paint(this.model.cells, this.clock, this.motion.matches),
		);
		const resize = new ResizeController(this);
		resize.addEventListener("resize", () => this.resize());
		const theme = new ThemeController(this);
		theme.addEventListener("change", () =>
			this.frames.requestDrawWith(this.configureCanvas),
		);
		const dpr = new DPRController(this);
		dpr.addEventListener("change", () =>
			this.frames.requestDrawWith(this.configureCanvas),
		);

		this.visibility.addEventListener(
			"first-visible",
			() => {
				this.resize();
				if (!this.motion.matches) {
					this.autoFlip();
				}
			},
			{ once: true },
		);
		this.visibility.addEventListener("visible", () => {
			this.offscreen = false;
			this.sound?.setHeroVisible(true);
			this.start();
		});
		this.visibility.addEventListener("hidden", () => {
			this.offscreen = true;
			this.sound?.setHeroVisible(false);
			this.stop();
			this.sound?.stop();
		});
	}

	static override styles = [
		splitFlapColours,
		css`
			:host {
				--hero-pride-red-surface: oklch(
					var(--_face-lightness) 0.017305 29.1378
				);
				--hero-pride-red-foreground: var(--color-flag-pride-red-foreground);
				--hero-pride-orange-surface: oklch(
					var(--_face-lightness) 0.021181 58.2827
				);
				--hero-pride-orange-foreground: var(
					--color-flag-pride-orange-foreground
				);
				--hero-pride-yellow-surface: oklch(var(--_face-lightness) 0.03 103.967);
				--hero-pride-yellow-foreground: var(
					--color-flag-pride-yellow-foreground
				);
				--hero-pride-green-surface: oklch(var(--_face-lightness) 0.03 145.901);
				--hero-pride-green-foreground: var(--color-flag-pride-green-foreground);
				--hero-pride-blue-surface: oklch(
					var(--_face-lightness) 0.016485 263.209
				);
				--hero-pride-blue-foreground: var(--color-flag-pride-blue-foreground);
				--hero-pride-violet-surface: oklch(
					var(--_face-lightness) 0.027332 320.839
				);
				--hero-pride-violet-foreground: var(
					--color-flag-pride-violet-foreground
				);
				--hero-trans-blue-surface: oklch(
					var(--_face-lightness) 0.021869 226.513
				);
				--hero-trans-blue-foreground: var(--color-flag-trans-blue-foreground);
				--hero-trans-pink-surface: oklch(
					var(--_face-lightness) 0.017883 6.32342
				);
				--hero-trans-pink-foreground: var(--color-flag-trans-pink-foreground);
				--hero-trans-white-surface: var(--_face-surface);
				--hero-trans-white-foreground: var(--color-text-secondary);
				/* Outer sizing lives in static/css/posts/hashing.css to reserve space before upgrade. */
			}
			:host([data-theme="dark"]) {
				--hero-pride-red-surface: oklch(var(--_face-lightness) 0.03 29.1378);
				--hero-pride-red-foreground: var(--color-flag-pride-red-foreground);
				--hero-pride-orange-surface: oklch(var(--_face-lightness) 0.03 58.2827);
				--hero-pride-orange-foreground: var(
					--color-flag-pride-orange-foreground
				);
				--hero-pride-yellow-surface: oklch(var(--_face-lightness) 0.03 103.967);
				--hero-pride-yellow-foreground: var(
					--color-flag-pride-yellow-foreground
				);
				--hero-pride-green-surface: oklch(var(--_face-lightness) 0.03 145.901);
				--hero-pride-green-foreground: var(--color-flag-pride-green-foreground);
				--hero-pride-blue-surface: oklch(var(--_face-lightness) 0.03 263.209);
				--hero-pride-blue-foreground: var(--color-flag-pride-blue-foreground);
				--hero-pride-violet-surface: oklch(var(--_face-lightness) 0.03 320.839);
				--hero-pride-violet-foreground: var(
					--color-flag-pride-violet-foreground
				);
				--hero-trans-blue-surface: oklch(var(--_face-lightness) 0.03 226.513);
				--hero-trans-blue-foreground: var(--color-flag-trans-blue-foreground);
				--hero-trans-pink-surface: oklch(var(--_face-lightness) 0.03 6.32342);
				--hero-trans-pink-foreground: var(--color-flag-trans-pink-foreground);
			}
			.board {
				position: relative;
				display: grid;
				grid-template-rows: repeat(6, minmax(0, 1fr));
				/* Keep the board and pre-upgrade reservation on the same CSS sizing contract. */
				height: var(--hashing-hero-board-height);
				gap: 4px;
				padding: var(--hashing-hero-board-padding) 0;
			}
			.row {
				display: grid;
				grid-template-columns: repeat(var(--visible-bits), minmax(0, 1fr));
				gap: 4px;
				font: bold clamp(16px, 5.5cqw, 28px) / 1
					var(--font-family-code, monospace);
			}
			.row > [hidden] {
				display: none;
			}
			canvas {
				position: absolute;
				inset-block: var(--hashing-hero-board-padding);
				inset-inline: 0;
				width: 100%;
				height: calc(100% - 2 * var(--hashing-hero-board-padding));
				pointer-events: none;
			}
			.row {
				position: relative;
			}
			button {
				min-width: 0;
				padding: 0;
				border: 0;
				border-radius: 3px;
				background: none;
				font: inherit;
				cursor: pointer;
				touch-action: manipulation;
			}
			button:hover {
				outline: var(--border-width-thin) solid var(--color-border-control);
			}
			button:focus-visible {
				outline: var(--focus-ring-width-strong) solid var(--color-border-focus);
				outline-offset: var(--focus-ring-offset);
			}
		`,
	];

	override connectedCallback(): void {
		super.connectedCallback();
		this.sound =
			document.querySelector<HashingSound>("s-hashing-sound") ?? undefined;
		this.sound?.setHeroVisible(!this.visibility.isHidden);
		void document.fonts.ready.then(() => {
			if (this.isConnected) {
				this.frames.requestDrawWith(this.configureCanvas);
			}
		});
		this.start();
	}

	protected override firstUpdated(): void {
		this.resize();
	}

	protected override updated(): void {
		this.rows = Array.from(
			this.renderRoot.querySelectorAll<HTMLElement>(".row"),
		);
		this.inputButtons = Array.from(
			this.rows[0]!.querySelectorAll<HTMLButtonElement>("button"),
		);
		const canvas = this.renderRoot.querySelector("canvas")!;
		this.renderer ??= new HeroCanvas(canvas, this.model.cells);
		for (const [row, cells] of this.model.cells.entries()) {
			for (const [column, cell] of cells.entries()) {
				this.seenSequences[row]![column] = cell.sequence;
			}
		}
		if (this.canvasBits !== this.visibleBits) {
			this.frames.requestDrawWith(this.configureCanvas);
		}
	}

	private readonly configureCanvas = (): void => {
		const canvas = this.renderRoot.querySelector("canvas");
		if (!canvas || !this.renderer || this.rows.length === 0) {
			return;
		}
		const bounds = canvas.getBoundingClientRect();
		const probe = document.createElement("span");
		probe.hidden = true;
		this.renderRoot.append(probe);
		const paint = (background: string, foreground: string) => {
			probe.style.backgroundColor = background;
			probe.style.color = foreground;
			const style = getComputedStyle(probe);
			return { background: style.backgroundColor, foreground: style.color };
		};

		const foreground = "var(--color-text-primary)";
		const plain = paint("var(--_face-surface)", "var(--_face-foreground)");
		const highlights = this.model.cells.map((_, row) => {
			const [background, ink] = this.flagPaint(row);
			const colour = row === 0 ? "grey" : algorithms[row - 1]!.color;
			return paint(
				background || `var(--_highlight-${colour}-surface)`,
				ink || `var(--color-palette-${colour}-foreground)`,
			);
		});
		const page = paint("var(--color-surface-page)", foreground).background;
		const separator = paint(
			"var(--color-border-separator)",
			foreground,
		).background;
		probe.remove();
		const font = getComputedStyle(this.rows[0]!);
		this.renderer.configure({
			width: bounds.width,
			height: bounds.height,
			pixelRatio: devicePixelRatio,
			bits: this.visibleBits,
			font: `${font.fontWeight} ${font.fontSize} ${font.fontFamily}`,
			plain,
			highlights,
			page,
			separator,
		});
		this.canvasBits = this.visibleBits;
	};

	private advance(reduced = this.motion.matches): void {
		const updated = this.model.advance(this.clock, reduced);
		if (updated && this.rows.length === 0) {
			this.requestUpdate();
		} else if (updated) {
			// Native controls and row labels stay in the DOM; only changed cells
			// update accessibility state, not the whole board's template.
			for (const [row, cells] of this.model.cells.entries()) {
				let changed = false;
				for (const [column, cell] of cells.entries()) {
					if (this.seenSequences[row]![column] === cell.sequence) {
						continue;
					}
					this.seenSequences[row]![column] = cell.sequence;
					if (row === 0) {
						this.inputButtons[column]!.ariaPressed = String(
							Boolean(this.model.input & (1 << (HERO_BITS - column - 1))),
						);
					}
					if (HERO_BITS - column - 1 >= this.visibleBits) {
						continue;
					}
					changed = true;
					if (cell.value !== cell.previous && !this.offscreen) {
						this.sound?.play();
					}
				}
				if (changed && row !== 0) {
					this.rows[row]!.ariaLabel = `${algorithms[row - 1]!.name} hash ${cells
						.slice(-this.visibleBits)
						.map((cell) => cell.value)
						.join("")}`;
				}
			}
		}
		this.frames.requestDraw();
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.offscreen = true;
		this.stop();
		this.sound?.stop();
		this.sound?.setHeroVisible(false);
		this.sound = undefined;
	}

	private flagPaint(row: number): [string, string] {
		if (this.palette === "normal" || (this.palette === "trans" && row === 0)) {
			return ["", ""];
		}
		const stripe =
			this.palette === "pride" ? prideStripes[row] : transStripes[row - 1];
		return [
			`var(--hero-${this.palette}-${stripe}-surface)`,
			`var(--hero-${this.palette}-${stripe}-foreground)`,
		];
	}

	private resize(): void {
		// Roughly 28px flaps and 4px gaps, changing one column at a time.
		this.visibleBits = Math.max(
			1,
			Math.min(
				HERO_BITS,
				Math.floor((this.getBoundingClientRect().width + 4) / 32),
			),
		);
		this.frames.requestDrawWith(this.configureCanvas);
	}

	private readonly motionChanged = (): void => {
		this.stop();
		if (this.motion.matches) {
			this.advance(true);
		}
		this.start();
	};

	private flip(bit: number): void {
		this.sourceBit = bit;
		this.idleSince = this.clock;
		this.model.flip(bit, this.clock);
		const button = this.inputButtons[HERO_BITS - bit - 1];
		if (button) {
			button.ariaPressed = String(Boolean(this.model.input & (1 << bit)));
		}
		this.advance();
		this.start();
	}

	private autoFlip(): void {
		this.flip((this.sourceBit + 1) % this.visibleBits);
	}

	private start(): void {
		if (this.visibility.isHidden || this.motion.matches || !this.isConnected) {
			return;
		}
		this.frames.timeline.resume();
	}

	private stop(): void {
		this.frames.timeline.pause();
	}

	private readonly tick = (event: Event): void => {
		// SAFETY: this handler receives only FrameController's update events.
		const { deltaMs } = (event as CustomEvent<{ deltaMs: number }>).detail;
		this.clock += Math.min(deltaMs, 100);
		this.advance(false);
		if (
			this.clock - this.idleSince >= CYCLE &&
			!this.model.isBusy(this.clock)
		) {
			this.autoFlip();
		}
	};

	protected override render() {
		return html`
			<div
				class="board"
				style="--visible-bits: ${this.visibleBits}"
			>
				<canvas aria-hidden="true"></canvas>
				${this.model.cells.map((cells, row) =>
					row === 0
						? html`<div
								class="row"
								role="group"
								aria-label="Hash input bits"
							>
								${cells.map((_, column) => {
									const bit = HERO_BITS - column - 1;
									return html`<button
										?hidden=${bit >= this.visibleBits}
										aria-label="Flip input bit ${bit}"
										aria-pressed=${Boolean(this.model.input & (1 << bit))}
										@click=${() => this.flip(bit)}
									></button>`;
								})}
							</div>`
						: html`<div
								class="row"
								role="img"
								aria-label="${algorithms[row - 1]!.name} hash ${cells
									.slice(-this.visibleBits)
									.map((cell) => cell.value)
									.join("")}"
							></div>`,
				)}
			</div>
		`;
	}
}
