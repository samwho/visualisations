import { PageResizeController } from "../../../shared/core/controllers/PageResizeController";
import Bodies from "matter-js/src/factory/Bodies";
import Composite from "matter-js/src/body/Composite";
import Engine from "matter-js/src/core/Engine";
import Constraint from "matter-js/src/constraint/Constraint";
import Sleeping from "matter-js/src/core/Sleeping";
import type { Body, Vector } from "matter-js";
import { css, html, LitElement, svg, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { FrameController } from "../../../shared/core/controllers/FrameController";
import { ResizeController } from "../../../shared/core/controllers/ResizeController";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { DPRController } from "../../../shared/core/controllers/DPRController";

import {
	seasonalPalette,
	seasonalPaletteColours,
	type SeasonalPalette,
} from "../../../shared/core/SeasonalPalette";

const HERO_HEIGHT = 360;
const BUCKET_TOP = 250;
const MAX_FRAME_DELTA_MS = 1000 / 30;

const designs = [
	{
		name: "Hashkie",
		dog: "haskie",
		hue: "orange",
		faceX: 320,
		faceY: 315,
		cropSize: 480,
	},
	{
		name: "Doe",
		dog: "doe",
		hue: "blue",
		faceX: 320,
		faceY: 320,
		cropSize: 450,
	},
	{
		name: "Sage",
		dog: "sage",
		hue: "pink",
		faceX: 320,
		faceY: 320,
		cropSize: 400,
	},
];
interface Coin {
	body: Body;
	design: number;
	colour: number;
}

@customElement("s-load-balancing-hero")
export class LoadBalancingHero extends LitElement {
	@property({ reflect: true, attribute: "data-palette" })
	palette: SeasonalPalette = seasonalPalette();

	private get coloursPerDesign(): number {
		return this.palette === "normal"
			? 1
			: seasonalPaletteColours[this.palette].length;
	}

	private coinColours(design: number): readonly string[] {
		return this.palette === "normal"
			? [`var(--color-data-fill-${designs[design]!.hue})`]
			: seasonalPaletteColours[this.palette];
	}

	private coins: Coin[] = [];

	private held?: {
		coin: Coin;
		constraint: Constraint;
		target: Vector;
		pointerId?: number;
	};

	private keyboardCoin = -1;

	@state() private announcement = "";

	@state() private width = 800;

	private worldLeft = 0;

	private worldWidth = 800;

	private readonly windowBlurred = (): void => this.releaseCoin();

	private get binCount(): number {
		return Math.max(5, Math.floor(this.width / 56));
	}

	private get binWidth(): number {
		return this.width / this.binCount;
	}

	private get dividers(): number[] {
		return Array.from(
			{ length: this.binCount + 1 },
			(_, i) => i * this.binWidth,
		);
	}

	private get pegs(): { x: number; y: number }[] {
		return Array.from({ length: 5 }, (_, row) =>
			Array.from({ length: this.binCount - (row % 2) }, (_value, col) => ({
				x: (col + 0.5 + (row % 2) / 2) * this.binWidth,
				y: 66 + row * 36,
			})),
		)
			.flat()
			.filter(({ x }) => {
				// Leave room for coins to escape past the outer pegs.
				return x - 3.5 > 26 && this.width - x - 3.5 > 26;
			});
	}

	private engine?: Engine;

	private elapsed = 0;

	private nextDrop = 0;

	private context?: CanvasRenderingContext2D;

	private readonly sprites: HTMLCanvasElement[] = [];

	private images: HTMLImageElement[] = [];

	private readonly reducedMotion = matchMedia(
		"(prefers-reduced-motion: reduce)",
	);

	private readonly frames = new FrameController(this);

	readonly timeline = this.frames.timeline;

	constructor() {
		super();
		const page = new PageResizeController(this);
		page.addEventListener("resize", () =>
			this.frames.requestDrawWith(this.resize),
		);
		this.timeline.addEventListener("pause", () => this.releaseCoin());
		const resize = new ResizeController(this);
		resize.addEventListener("resize", () =>
			this.frames.requestDrawWith(this.resize),
		);
		const dpr = new DPRController(this);
		dpr.addEventListener("change", () =>
			this.frames.requestDrawWith(this.resize),
		);
		const theme = new ThemeController(this);
		theme.addEventListener("change", () => {
			this.cacheCoins();
			this.frames.requestDraw();
		});

		this.frames.addEventListener("update", (event) => {
			// SAFETY: FrameController emits update with this payload.
			const delta = (event as CustomEvent<{ nowMs: number; deltaMs: number }>)
				.detail.deltaMs;
			this.step(delta);
		});
		this.frames.addEventListener("draw", () => this.draw());
	}

	static override styles = css`
		:host {
			/* Outer sizing lives in static/css/posts/load-balancing.css to reserve space before upgrade. */
			position: relative;
		}
		svg {
			display: block;
			width: 100%;
			height: 100%;
		}
		canvas {
			position: absolute;
			inset-block: 0;
			left: 0;
			width: 100%;
			height: 100%;
			touch-action: none;
			-webkit-user-select: none;
			user-select: none;
		}
		canvas:focus-visible {
			outline: 2px solid var(--color-border-focus);
			outline-offset: -2px;
		}
		.coin-status {
			position: absolute;
			width: 1px;
			height: 1px;
			clip-path: inset(50%);
			overflow: hidden;
		}
		.peg {
			fill: color-mix(
				in oklab,
				var(--color-data-neutral) 45%,
				var(--color-surface-band)
			);
		}
		.rail {
			fill: none;
			stroke: var(--color-border-subtle);
			stroke-width: 1;
			vector-effect: non-scaling-stroke;
		}
	`;

	protected override firstUpdated(): void {
		this.context = this.renderRoot.querySelector("canvas")!.getContext("2d")!;
		this.images = designs.map((design) => {
			const image = new Image();
			image.addEventListener(
				"load",
				() => {
					this.cacheCoins();
					this.frames.requestDraw();
				},
				{ once: true },
			);
			image.src = `/images/dogs/${design.dog}/regal.svg`;
			return image;
		});
		this.frames.requestDrawWith(this.resize);
	}

	protected override updated(changed: PropertyValues<this>): void {
		if (changed.has("palette")) {
			for (const coin of this.coins) {
				coin.colour = Math.floor(Math.random() * this.coloursPerDesign);
			}
			this.cacheCoins();
			this.frames.requestDraw();
		}
	}

	private readonly resize = (): void => {
		if (!this.context) {
			return;
		}
		const scale = HERO_HEIGHT / this.clientHeight;
		const width = this.clientWidth * scale;
		const viewportWidth = document.documentElement.clientWidth;
		const left = -this.getBoundingClientRect().left;
		const worldLeft = left * scale;
		const worldWidth = viewportWidth * scale;
		const canvas = this.context.canvas;
		const pixelWidth = Math.round(viewportWidth * window.devicePixelRatio);
		const pixelHeight = Math.round(this.clientHeight * window.devicePixelRatio);
		const rebuildWorld =
			!this.engine ||
			Math.abs(width - this.width) >= 1 ||
			Math.abs(worldLeft - this.worldLeft) >= 1 ||
			Math.abs(worldWidth - this.worldWidth) >= 1;
		if (
			!rebuildWorld &&
			canvas.width === pixelWidth &&
			canvas.height === pixelHeight
		) {
			return;
		}
		if (rebuildWorld) {
			this.releaseCoin();
			this.timeline.pause();
			if (this.engine) {
				Composite.clear(this.engine.world, false);
				Engine.clear(this.engine);
			}
			this.width = width;
			this.worldLeft = worldLeft;
			this.worldWidth = worldWidth;
			this.coins = [];
			this.elapsed = 0;
			this.nextDrop = 0;
			this.setup();
		}
		canvas.style.left = `${left}px`;
		canvas.style.width = `${viewportWidth}px`;
		canvas.width = pixelWidth;
		canvas.height = pixelHeight;
		this.context.setTransform(
			pixelWidth / this.worldWidth,
			0,
			0,
			pixelHeight / HERO_HEIGHT,
			(-this.worldLeft * pixelWidth) / this.worldWidth,
			0,
		);
		this.cacheCoins();
		this.start();
	};

	private cacheCoins(): void {
		if (!this.context) {
			return;
		}
		// Cache at twice the display density so rotation keeps the SVG details sharp.
		const size = Math.ceil((52 * this.context.canvas.width) / this.worldWidth);
		this.sprites.length = designs.length * this.coloursPerDesign;
		for (const [i, design] of designs.entries()) {
			for (let colour = 0; colour < this.coloursPerDesign; colour++) {
				const index = i * this.coloursPerDesign + colour;
				const sprite = (this.sprites[index] ??=
					document.createElement("canvas"));
				sprite.width = size;
				sprite.height = size;
				const context = sprite.getContext("2d")!;
				context.scale(size / 26, size / 26);
				context.translate(13, 13);
				context.beginPath();
				context.arc(0, 0, 13, 0, Math.PI * 2);
				// SVG resolves the CSS paint variables that canvas cannot read directly.
				const palette = getComputedStyle(
					this.renderRoot.querySelector(`#coin-${i}-${colour}`)!,
				);
				context.fillStyle = palette.fill;
				context.fill();
				context.save();
				context.clip();
				context.globalAlpha = 0.22;
				const image = this.images[i];
				if (image?.complete && image.naturalWidth > 0) {
					context.drawImage(
						image,
						(-design.faceX * 26) / design.cropSize,
						(-design.faceY * 26) / design.cropSize,
						(640 * 26) / design.cropSize,
						(720 * 26) / design.cropSize,
					);
				}
				context.restore();
				context.beginPath();
				context.arc(0, 0, 12.6, 0, Math.PI * 2);
				context.lineWidth = 0.8;
				context.strokeStyle = palette.stroke;
				context.stroke();
				if (document.documentElement.dataset.theme === "dark") {
					// Match the memory hero’s 85% brightness, baked in rather than filtered each frame.
					context.globalCompositeOperation = "source-atop";
					context.globalAlpha = 0.15;
					context.fillStyle = "black";
					context.fillRect(-13, -13, 26, 26);
				}
			}
		}
	}

	private draw(): void {
		const context = this.context;
		if (!context) {
			return;
		}
		context.clearRect(this.worldLeft, 0, this.worldWidth, HERO_HEIGHT);
		for (const coin of this.coins) {
			context.save();
			context.translate(coin.body.position.x, coin.body.position.y);
			context.rotate(coin.body.angle);
			context.drawImage(
				this.sprites[coin.design * this.coloursPerDesign + coin.colour]!,
				-13,
				-13,
				26,
				26,
			);
			context.restore();
		}
	}

	private setup(): void {
		this.engine = Engine.create({ enableSleeping: true });
		Composite.add(this.engine.world, [
			...this.pegs.map(({ x, y }) =>
				Bodies.circle(x, y, 3.5, { isStatic: true }),
			),
			...this.dividers
				.slice(1, -1)
				.map((x) =>
					Bodies.rectangle(
						x,
						(BUCKET_TOP + HERO_HEIGHT) / 2,
						1,
						HERO_HEIGHT - BUCKET_TOP,
						{ isStatic: true },
					),
				),
			Bodies.rectangle(
				this.worldLeft + this.worldWidth / 2,
				HERO_HEIGHT + 6,
				this.worldWidth,
				12,
				{
					isStatic: true,
				},
			),
			Bodies.rectangle(this.worldLeft - 10, HERO_HEIGHT / 2, 20, HERO_HEIGHT, {
				isStatic: true,
			}),
			Bodies.rectangle(
				this.worldLeft + this.worldWidth + 10,
				HERO_HEIGHT / 2,
				20,
				HERO_HEIGHT,
				{
					isStatic: true,
				},
			),
		]);
	}

	private createCoin(x: number, y: number): Coin {
		const coin = {
			body: Bodies.circle(x, y, 13, {
				restitution: 0.55,
				friction: 0.08,
				frictionAir: 0.001,
			}),
			design: this.coins.length % designs.length,
			colour:
				this.palette === "normal"
					? 0
					: Math.floor(Math.random() * this.coloursPerDesign),
		};
		this.coins.push(coin);
		Composite.add(this.engine!.world, coin.body);
		return coin;
	}

	private pointerPoint(event: PointerEvent): Vector {
		const rect = this.context!.canvas.getBoundingClientRect();
		return this.clampPoint({
			x:
				this.worldLeft +
				((event.clientX - rect.left) * this.worldWidth) / rect.width,
			y: ((event.clientY - rect.top) * HERO_HEIGHT) / rect.height,
		});
	}

	private clampPoint(point: Vector): Vector {
		return {
			x: Math.max(
				this.worldLeft + 13,
				Math.min(this.worldLeft + this.worldWidth - 13, point.x),
			),
			y: Math.max(13, Math.min(HERO_HEIGHT - 13, point.y)),
		};
	}

	private coinAt(point: Vector, touch: boolean): Coin | undefined {
		let nearest: Coin | undefined;
		let distance = touch
			? Math.max(13, (24 * HERO_HEIGHT) / this.clientHeight)
			: 13;
		for (let i = this.coins.length - 1; i >= 0; i--) {
			const coin = this.coins[i]!;
			const gap = Math.hypot(
				point.x - coin.body.position.x,
				point.y - coin.body.position.y,
			);
			if (gap <= 13) {
				return coin;
			}
			if (gap < distance) {
				nearest = coin;
				distance = gap;
			}
		}
		return nearest;
	}

	private pointerDown(event: PointerEvent): void {
		if (event.button !== 0 || !event.isPrimary || this.held) {
			return;
		}
		const point = this.pointerPoint(event);
		const coin = this.coinAt(point, event.pointerType === "touch");
		if (!coin) {
			return;
		}
		event.preventDefault();
		this.context!.canvas.focus({ preventScroll: true });
		this.context!.canvas.setPointerCapture(event.pointerId);
		this.grabCoin(coin, point, event.pointerId);
	}

	private pointerMove(event: PointerEvent): void {
		const point = this.pointerPoint(event);
		if (this.held?.pointerId === event.pointerId) {
			this.held.target = point;
		} else if (!this.held && event.pointerType === "mouse") {
			this.context!.canvas.style.cursor = this.coinAt(point, false)
				? "grab"
				: "";
		}
	}

	private pointerEnded(event: PointerEvent): void {
		if (this.held?.pointerId === event.pointerId) {
			this.releaseCoin();
		}
	}

	private grabCoin(coin: Coin, point: Vector, pointerId?: number): void {
		const constraint = Constraint.create({
			bodyB: coin.body,
			pointA: { x: point.x, y: point.y },
			pointB: {
				x: point.x - coin.body.position.x,
				y: point.y - coin.body.position.y,
			},
			length: 0.01,
			stiffness: 0.025,
			damping: 0.15,
		});
		this.held = { coin, constraint, target: point, pointerId };
		Sleeping.set(coin.body, false);
		Composite.add(this.engine!.world, constraint);
		this.context!.canvas.style.cursor = "grabbing";
		this.announcement = `Picked up ${designs[coin.design]!.name}.`;
		this.start();
	}

	private releaseCoin(): void {
		const held = this.held;
		if (!held) {
			return;
		}
		this.held = undefined;
		if (this.engine) {
			Composite.remove(this.engine.world, held.constraint);
		}
		const canvas = this.context!.canvas;
		if (
			held.pointerId !== undefined &&
			canvas.hasPointerCapture(held.pointerId)
		) {
			canvas.releasePointerCapture(held.pointerId);
		}
		canvas.style.cursor = "";
		this.announcement = `Released ${designs[held.coin.design]!.name}.`;
	}

	private pullCoin(): void {
		const held = this.held;
		if (!held) {
			return;
		}
		const { body } = held.coin;
		Sleeping.set(body, false);
		const x = body.position.x + held.constraint.pointB.x;
		const y = body.position.y + held.constraint.pointB.y;
		const dx = held.target.x - x;
		const dy = held.target.y - y;
		// Bound the spring's reach so a fast swipe cannot pull through an obstacle in one step.
		const scale = Math.min(1, 32 / Math.hypot(dx, dy));
		held.constraint.pointA.x = x + dx * scale;
		held.constraint.pointA.y = y + dy * scale;
	}

	private keyDown(event: KeyboardEvent): void {
		if ((event.key === "Escape" || event.key === " ") && this.held) {
			event.preventDefault();
			this.releaseCoin();
			return;
		}
		if (this.held?.pointerId !== undefined) {
			return;
		}
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			if (event.repeat) {
				return;
			}
			this.releaseCoin();
			if (this.coins.length === 0) {
				this.createCoin(this.width / 2, 34);
			}
			this.keyboardCoin = (this.keyboardCoin + 1) % this.coins.length;
			const coin = this.coins[this.keyboardCoin]!;
			this.grabCoin(coin, this.clampPoint(coin.body.position));
			return;
		}
		const move = [
			{ key: "ArrowLeft", x: -20, y: 0 },
			{ key: "ArrowRight", x: 20, y: 0 },
			{ key: "ArrowUp", x: 0, y: -20 },
			{ key: "ArrowDown", x: 0, y: 20 },
		].find(({ key }) => key === event.key);
		if (move && this.held) {
			event.preventDefault();
			this.held.target = this.clampPoint({
				x: this.held.target.x + move.x,
				y: this.held.target.y + move.y,
			});
		}
	}

	private start(): void {
		if (!this.engine || (this.reducedMotion.matches && !this.held)) {
			return;
		}
		this.timeline.resume();
	}

	private step(delta: number): void {
		if (!this.engine) {
			return;
		}
		// Decorative physics discards stalled time instead of doing unbounded catch-up.
		const frameDelta = Math.min(delta, MAX_FRAME_DELTA_MS);
		this.elapsed += frameDelta;
		this.nextDrop += frameDelta;
		if (
			!this.reducedMotion.matches &&
			this.nextDrop >= 650 &&
			this.coins.length < 75
		) {
			this.nextDrop = 0;
			// Keep drops inside the peg field, away from the clear side corridors.
			const inset = this.binWidth * 1.5;
			this.createCoin(inset + Math.random() * (this.width - inset * 2), -14);
		}
		// Fixed steps keep peg collisions consistent across display refresh rates.
		while (this.elapsed >= 1000 / 120) {
			this.pullCoin();
			Engine.update(this.engine, 1000 / 120);
			this.elapsed -= 1000 / 120;
		}
		if (
			!this.held &&
			(this.coins.length >= 75 || this.reducedMotion.matches) &&
			this.coins.every((coin) => coin.body.isSleeping)
		) {
			this.timeline.pause();
		}
	}

	protected override render() {
		return html`
			<svg
				viewBox=${`0 0 ${this.width} ${HERO_HEIGHT}`}
				role="img"
				aria-label="An arcade coin-drop machine. Coins featuring Hashkie, Doe and Sage fall from random positions through a grid of pegs into initially empty buckets."
			>
				<defs>
					${designs.map((_design, i) =>
						this.coinColours(i).map(
							(colour, j) => svg`
						<circle id=${`coin-${i}-${j}`} r="13"
							fill=${colour}
							stroke=${`color-mix(in oklab, ${colour} 80%, var(--color-data-neutral))`}/>
					`,
						),
					)}
				</defs>
				${this.dividers.slice(1, -1).map((x) => svg`<path class="rail" d=${`M${x} ${BUCKET_TOP} V${HERO_HEIGHT}`}/>`)}
				${this.pegs.map(({ x, y }) => svg`<circle class="peg" cx=${x} cy=${y} r="3.5"/>`)}
			</svg>
			<canvas
				tabindex="0"
				role="group"
				aria-label="Move coins: drag a coin, or press Enter to pick the next coin, arrow keys to move it, and Space or Escape to release it."
				@pointerdown=${this.pointerDown}
				@pointermove=${this.pointerMove}
				@pointerup=${this.pointerEnded}
				@pointercancel=${this.pointerEnded}
				@lostpointercapture=${this.pointerEnded}
				@keydown=${this.keyDown}
				@blur=${this.releaseCoin}
			></canvas>
			<span
				class="coin-status"
				role="status"
				aria-live="polite"
				>${this.announcement}</span
			>
		`;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		window.addEventListener("blur", this.windowBlurred);
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		window.removeEventListener("blur", this.windowBlurred);
		this.releaseCoin();
		if (this.engine) {
			Composite.clear(this.engine.world, false);
			Engine.clear(this.engine);
		}
		this.engine = undefined;
		this.coins = [];
	}
}
