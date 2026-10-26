import { MediaQueryController } from "../../../shared/core/controllers/MediaQueryController";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { seasonalPalette } from "../../../shared/core/SeasonalPalette";
import { seasonBlend, seasonFor } from "../model/Season";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { FrameController } from "../../../shared/core/controllers/FrameController";
import { TimelineController } from "../../../shared/core/controllers/TimelineController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import { BloomHeroCanvas2D } from "./BloomHeroCanvas2D";
import { BloomHeroWebGL } from "./BloomHeroWebGL";
import {
	WIDTH,
	HEIGHT,
	WORLD_WIDTH,
	GROUND_Y,
	SOIL_MATERIAL,
	CELL_WIDTH,
	CELL_HEIGHT,
	SOIL_FADE_DURATION,
	SOIL_BOTTOM_FADE,
	SOIL_OPACITY,
	materials,
	growthAt,
	soilArrival,
	createGlyphs,
	createGrid,
	type BloomHeroRenderer,
} from "./BloomHeroRenderer";

const STEM_DURATION = 1.05;
const BLOOM_START = 0.7;
const BLOOM_DURATION = 0.65;
const INITIAL_PETAL_STAGGER = 0.02;
const HEAD_SCALE = 0.83;
const MAX_BEND = 32;
const MAX_BEND_SPEED = 180;
const WIND_FRONT_SPEED = 1100;
const PHYSICS_STEP = 1 / 120;

const flowers = [
	{ x: 155, height: 165, size: 0.82, lean: -5, material: 2 },
	{ x: 645, height: 165, size: 0.82, lean: 5, material: 8 },
	{ x: 265, height: 195, size: 0.86, lean: -5, material: 3 },
	{ x: 535, height: 195, size: 0.86, lean: 5, material: 7 },
	{ x: 330, height: 140, size: 0.82, lean: -7, material: 4 },
	{ x: 470, height: 140, size: 0.82, lean: 7, material: 6 },
	{ x: 400, height: 222, size: 1, lean: 0, material: 5 },
];
const flowerIndices = flowers.map((_, index) => index);
// The outer pair comes first; omit their entire plants on phones.
const mobileFlowerIndices = flowerIndices.slice(2);
const flowerLeaves = flowers.map((_, flowerIndex) => {
	let seed = Math.imul(flowerIndex + 1, 0x9e3779b1);
	const sample = () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 0x100000000;
	};

	return [0.4, 0.62].map((fraction, leafIndex) => ({
		fraction: fraction + (sample() - 0.5) * 0.12,
		direction: (flowerIndex + leafIndex) % 2 === 0 ? -1 : 1,
		length: 0.8 + sample() * 0.45,
		height: 0.7 + sample() * 0.5,
		tilt: (sample() - 0.5) * 0.4,
		fullness: 0.75 + sample() * 0.5,
	}));
});

// Back to front: ground, foliage, then heads in their existing drawing order.
const materialOrder = [
	SOIL_MATERIAL,
	1,
	...flowers.map((flower) => flower.material),
];
const rosePetals = [
	{ count: 8, radius: 43, width: 27, height: 35, phase: 0 },
	{ count: 6, radius: 27, width: 23, height: 28, phase: 0.45 },
	{ count: 4, radius: 12, width: 15, height: 21, phase: 0.2 },
].flatMap((ring, layer) =>
	Array.from({ length: ring.count }, (_, i) => ({
		angle: (i * Math.PI * 2) / ring.count - Math.PI / 2 + ring.phase,
		radius: ring.radius,
		width: ring.width,
		height: ring.height,
		layer,
	})),
);
const TOTAL_PETAL_AREA = rosePetals.reduce(
	(area, petal) => area + petal.width * petal.height,
	0,
);
const HEAD_RADIUS =
	Math.max(...rosePetals.map((petal) => petal.radius + petal.height)) *
	HEAD_SCALE;
const GROW_DURATION =
	BLOOM_START +
	BLOOM_DURATION +
	(rosePetals.length - 1) * INITIAL_PETAL_STAGGER;
const REGROW_DURATION = 1;
const REGROW_STAGGER = 0.055;
const MAX_FALLEN_PETALS = 160;
const SNOW_START = GROW_DURATION + soilArrival(0, WORLD_WIDTH);
// The artwork occupies 85% of the hero; snow also covers the space above it.
const SNOW_HEIGHT = HEIGHT / 0.85;
const SNOW_TOP = HEIGHT - SNOW_HEIGHT;
const SNOW_FIRST_ROW = Math.ceil(SNOW_TOP / CELL_HEIGHT);
const SNOW_ROWS = Math.floor(GROUND_Y / CELL_HEIGHT) - SNOW_FIRST_ROW;
const SNOW_GROUND = GROUND_Y - CELL_HEIGHT;
const GROUND_SNOW_LIFETIME = 30;

interface SheddingState {
	energy: number;
	direction: number;
	lastDrop: number;
	missing: Set<number>;
	regrowAt?: number;
}

interface FallenPetal {
	x: number;
	y: number;
	vx: number;
	vy: number;
	gravity: number;
	angle: number;
	spin: number;
	phase: number;
	petalIndex: number;
	size: number;
	material: number;
	settled: boolean;
}

interface SnowRest {
	flower: number;
	petal: number;
	x: number;
	y: number;
	until: number;
}

interface Snowflake {
	x: number;
	y: number;
	vx: number;
	vy: number;
	speed: number;
	phase: number;
	radius: number;
	opacity: number;
	spawnAt: number;
	active: boolean;
	canLand: boolean;
	grounded: boolean;
	meltsAt?: number;
	resting?: SnowRest;
}

// Irregular gusts; quintic interpolation keeps acceleration continuous.
function windNoise(time: number, seed: number): number {
	const sample = (index: number) => {
		let value = Math.imul(index ^ seed, 0x45d9f3b);
		value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
		return (((value ^ (value >>> 16)) >>> 0) / 0xffffffff) * 2 - 1;
	};

	const index = Math.floor(time);
	const fraction = time - index;
	const blend = fraction ** 3 * (fraction * (fraction * 6 - 15) + 10);
	const from = sample(index);
	return from + (sample(index + 1) - from) * blend;
}

@customElement("s-bloom-filters-hero")
export class BloomFiltersHero extends LitElement {
	private reduced = false;

	private readonly motion = new MediaQueryController(
		this,
		"(prefers-reduced-motion: reduce)",
	);

	private readonly mobile = new MediaQueryController(
		this,
		"(max-width: 600px)",
	);

	private get flowerIndices(): readonly number[] {
		return this.mobile.matches ? mobileFlowerIndices : flowerIndices;
	}

	private readonly bends = flowers.map(() => ({ angle: 0, velocity: 0 }));

	private readonly shedding = flowers.map<SheddingState>(() => ({
		energy: 0,
		direction: 0,
		lastDrop: -Infinity,
		missing: new Set<number>(),
		regrowAt: undefined,
	}));

	private autumnAmount = 0;

	private winterAmount = 0;

	private readonly snowflakes = Array.from(
		{ length: 160 },
		(_, index): Snowflake => ({
			x: Math.random() * WORLD_WIDTH - (WORLD_WIDTH - WIDTH) / 2,
			y: SNOW_TOP - 8,
			vx: 0,
			vy: 0,
			speed: 14 + Math.random() * 20,
			phase: Math.random() * Math.PI * 2,
			radius: 3 + Math.random() * 3,
			opacity: 0.4 + Math.random() * 0.5,
			spawnAt: SNOW_START + index * 0.12,
			active: false,
			canLand: false,
			grounded: false,
		}),
	);

	private snowCanvas?: HTMLCanvasElement;

	private snowGlyphs?: HTMLCanvasElement;

	private snowColor = "";

	private readonly autumnWait = flowers.map(() => 5 + Math.random() * 10);

	// Bound the trail across repeated shake/regrow cycles.
	private readonly petals: FallenPetal[] = [];

	private readonly settledPetalMasks = new Map<
		number,
		CanvasRenderingContext2D
	>();

	private readonly newlySettled: FallenPetal[] = [];

	private settledPetalsDirty = true;

	private canvas?: HTMLCanvasElement;

	private renderer?: BloomHeroRenderer;

	private rendererBuild?: AbortController;

	private get animated(): boolean {
		return !this.reduced && this.renderer instanceof BloomHeroWebGL;
	}

	private mask(material: number): CanvasRenderingContext2D | undefined {
		return this.renderer?.masks[material];
	}

	private glyphs?: HTMLCanvasElement;

	private readonly petalImages = rosePetals.map((_, index) =>
		this.createPetalImage(index),
	);

	private readonly headImages: (HTMLCanvasElement | undefined)[] = [];

	private readonly headDirty = flowers.map(() => true);

	private readonly grid = createGrid(1, WORLD_WIDTH);

	private readonly snowOpacities = new Float32Array(
		this.grid.columns * SNOW_ROWS,
	);

	private readonly snowCells = document.createElement("canvas");

	private readonly snowPixels = new ImageData(this.grid.columns, SNOW_ROWS);

	private palettePixels = new Uint8ClampedArray(materials.length * 4);

	private floorEdgeOpacity = -1;

	private floorTileUrl?: string;

	private floorTileRevision = 0;

	private readonly visibility = new VisibilityController(this);

	private readonly frames = new FrameController(
		this,
		new TimelineController(this, this.visibility),
	);

	private elapsed = 0;

	private pointer?: { id: number; x: number; y: number; time: number };

	private hover?: PointerEvent;

	private press?: {
		id: number;
		clientX: number;
		clientY: number;
		flower: number | undefined;
		dragged: boolean;
	};

	constructor() {
		super();
		this.motion.addEventListener("change", this.motionChanged);
		this.mobile.addEventListener("change", this.layoutChanged);
		this.frames.addEventListener("update", this.tick);
		this.frames.addEventListener("draw", () => this.draw());
		this.visibility.addEventListener("visible", () => this.start());
		this.visibility.addEventListener("hidden", () => this.stop());
		const theme = new ThemeController(this);
		theme.addEventListener("change", () => {
			if (this.renderer) {
				this.readColors();
			}
		});
	}

	static override styles = css`
		:host {
			--hero-foliage: var(--color-data-fill-green);
			--hero-snow: var(--color-data-neutral);
			--hero-soil: color-mix(
				in oklab,
				var(--color-data-neutral) 70%,
				var(--color-surface-page)
			);
			/* Vivid seasonal reds distinguish summer from the earthy Wong red. */
			--hero-vivid-red: #f43f5e;
			--hero-coral: #ff6b57;
			--hero-spring-pink: color-mix(
				in oklab,
				var(--color-data-fill-pink) 50%,
				var(--hero-vivid-red)
			);
			--hero-petal-1: var(--hero-vivid-red);
			--hero-petal-2: var(--hero-coral);
			--hero-petal-3: var(--hero-vivid-red);
			--hero-petal-4: var(--hero-coral);
			--hero-flower-1: var(--hero-petal-1);
			--hero-flower-2: var(--hero-petal-3);
			--hero-flower-3: var(--hero-petal-4);
			--hero-flower-4: var(--hero-petal-2);
			--hero-flower-5: var(--hero-petal-3);
			--hero-flower-6: var(--hero-petal-1);
			--hero-flower-7: var(--hero-petal-2);
			/* Flag hues are artwork, not categorical Wong colours. White needs a
			   neutral ink on the light band so its petals remain visible. */
			--hero-flag-white: color-mix(
				in oklab,
				var(--color-flag-trans-white) 60%,
				var(--color-data-neutral)
			);
			/* Outer sizing lives in static/css/posts/bloom-filters.css to reserve space before upgrade. */
			overflow: hidden;
		}
		:host([data-theme="dark"]) {
			--hero-soil: var(--color-data-neutral);
			--hero-flag-white: var(--color-flag-trans-white);
		}
		:host([data-season="spring"]) {
			--hero-petal-1: var(--color-data-fill-yellow);
			--hero-petal-2: var(--hero-spring-pink);
			--hero-petal-3: var(--hero-spring-pink);
			--hero-petal-4: var(--color-data-fill-yellow);
		}
		:host([data-season="autumn"]) {
			--hero-petal-1: var(--color-data-fill-orange);
			--hero-petal-2: var(--color-data-fill-red);
			--hero-petal-3: var(--color-data-fill-orange);
			--hero-petal-4: var(--color-data-fill-red);
		}
		:host([data-season="winter"]) {
			--hero-petal-1: var(--color-data-fill-blue);
			--hero-petal-2: var(--color-data-fill-dark-blue);
			--hero-petal-3: var(--color-data-fill-blue);
			--hero-petal-4: var(--color-data-fill-dark-blue);
		}
		/* The middle five match the flag; outer red and violet appear on wider screens. */
		:host([data-palette="pride"]) {
			--hero-flower-1: var(--color-flag-pride-red);
			--hero-flower-2: var(--color-flag-pride-red);
			--hero-flower-3: var(--color-flag-pride-orange);
			--hero-flower-4: var(--color-flag-pride-yellow);
			--hero-flower-5: var(--color-flag-pride-green);
			/* The last visible bloom carries both final rainbow hues on phones. */
			--hero-flower-6: color-mix(
				in oklab,
				var(--color-flag-pride-blue),
				var(--color-flag-pride-violet)
			);
			--hero-flower-7: var(--color-flag-pride-violet);
		}
		:host([data-palette="trans"]) {
			--hero-flower-1: var(--color-flag-trans-blue);
			--hero-flower-2: var(--color-flag-trans-blue);
			--hero-flower-3: var(--color-flag-trans-pink);
			--hero-flower-4: var(--hero-flag-white);
			--hero-flower-5: var(--color-flag-trans-pink);
			--hero-flower-6: var(--color-flag-trans-blue);
			--hero-flower-7: var(--color-flag-trans-blue);
		}
		canvas {
			position: absolute;
			inset: auto auto 0 50%;
			display: block;
			/* Match WORLD_WIDTH / HEIGHT in BloomHeroRenderer. */
			width: calc(var(--bloom-hero-art-height) * 1600 / 350);
			height: var(--bloom-hero-art-height);
			transform: translateX(-50%);
			touch-action: pan-y;
		}
		@media (prefers-reduced-motion: reduce) {
			canvas {
				pointer-events: none;
			}
		}
		.webgl {
			display: none;
			pointer-events: none;
		}
		:host([data-renderer="canvas"]) canvas {
			pointer-events: none;
		}
		canvas.snow {
			height: 100%;
		}
		.floor-edge {
			position: absolute;
			bottom: 0;
			width: max(0px, calc(50% - var(--bloom-hero-art-height) * 800 / 350));
			height: calc(var(--bloom-hero-art-height) * 21 / 350);
			pointer-events: none;
			opacity: var(--floor-edge-opacity, 0);
			background-image: var(--floor-tile);
			background-size: calc(var(--bloom-hero-art-height) * 1600 / 350) 100%;
			background-repeat: repeat-x;
		}
		.floor-edge.left {
			left: 0;
			background-position: right bottom;
		}
		.floor-edge.right {
			right: 0;
			background-position: left bottom;
		}
	`;

	protected override render() {
		return html`
			<canvas
				aria-hidden="true"
				@pointerdown=${this.pointerDown}
				@pointermove=${this.pointerMove}
				@pointerup=${this.pointerUp}
				@pointercancel=${this.pointerEnd}
				@pointerleave=${this.pointerEnd}
				@lostpointercapture=${this.pointerEnd}
			></canvas>
			<canvas
				class="webgl"
				aria-hidden="true"
			></canvas>
			<div
				class="floor-edge left"
				aria-hidden="true"
			></div>
			<div
				class="floor-edge right"
				aria-hidden="true"
			></div>
			<canvas
				class="snow"
				aria-hidden="true"
				@pointerdown=${this.pointerDown}
				@pointermove=${this.pointerMove}
				@pointerup=${this.pointerUp}
				@pointercancel=${this.pointerEnd}
				@pointerleave=${this.pointerEnd}
				@lostpointercapture=${this.pointerEnd}
			></canvas>
		`;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		// Local-only hemisphere estimate: no geolocation permission, lookup or storage.
		this.dataset.season = seasonFor(
			new Date().getMonth(),
			Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
		);
		this.reduced = this.motion.matches;
		if (this.canvas) {
			this.frames.requestDrawWith(this.createRenderer);
			this.readColors();
		}
		this.start();
	}

	protected override firstUpdated(): void {
		this.canvas = this.renderRoot.querySelector<HTMLCanvasElement>("canvas")!;
		this.snowCanvas =
			this.renderRoot.querySelector<HTMLCanvasElement>(".snow")!;
		this.snowCanvas.width = WORLD_WIDTH * 2;
		this.snowCanvas.height = Math.ceil(SNOW_HEIGHT * 2);
		this.snowCells.width = this.grid.columns;
		this.snowCells.height = SNOW_ROWS;
		this.snowPixels.data.fill(255);
		this.frames.requestDrawWith(this.initialize);
		this.readColors();
		this.start();
	}

	private readonly initialize = (): void => {
		// Viewport changes crop this fixed bitmap without rebuilding the garden.
		void createGlyphs(WORLD_WIDTH * 2, HEIGHT * 2, this.grid).then((glyphs) => {
			this.glyphs = glyphs;
			if (!this.isConnected) {
				return;
			}
			this.frames.requestDrawWith(() => {
				this.updateSnowGlyphs();
				this.updateFloorTile();
				this.createRenderer();
				this.start();
			});
		});
	};

	private readonly createRenderer = (): void => {
		this.stop();
		this.rendererBuild?.abort();
		if (this.renderer instanceof BloomHeroWebGL) {
			this.renderer.dispose();
			this.renderer = undefined;
		}
		if (
			this.reduced ||
			new URLSearchParams(location.search).get("renderer") === "canvas"
		) {
			this.useCanvas();
			return;
		}
		const build = new AbortController();
		this.rendererBuild = build;
		void BloomHeroWebGL.create(
			this.renderRoot.querySelector<HTMLCanvasElement>(".webgl")!,
			() => this.frames.requestDrawWith(this.useCanvas),
			this.grid,
			materialOrder,
			build.signal,
		)
			.then((renderer) => {
				if (build.signal.aborted || !this.isConnected) {
					renderer.dispose();
					return;
				}
				this.frames.requestDrawWith(() => {
					if (build.signal.aborted || !this.isConnected) {
						renderer.dispose();
						return;
					}
					this.renderer?.dispose();
					this.renderer = renderer;
					this.settledPetalMasks.clear();
					this.settledPetalsDirty = true;
					this.dataset.renderer = "webgl";
					if (this.glyphs) {
						renderer.setGlyphs(this.glyphs);
					}
					this.start();
				});
			})
			.catch(() => {
				if (!build.signal.aborted && this.isConnected) {
					this.frames.requestDrawWith(this.useCanvas);
				}
			});
	};

	private readonly useCanvas = (): void => {
		this.stop();
		this.rendererBuild?.abort();
		this.rendererBuild = undefined;
		this.settledPetalMasks.clear();
		this.settledPetalsDirty = true;
		this.renderer?.dispose();
		this.prepareStill();
		this.renderer = new BloomHeroCanvas2D(
			this.canvas!,
			this.grid,
			materialOrder,
		);
		this.dataset.renderer = "canvas";
		if (this.glyphs) {
			this.renderer.setGlyphs(this.glyphs);
		}
	};

	private readColors(): void {
		this.dataset.palette = seasonalPalette();
		const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
		const blend = seasonBlend(new Date(), timeZone);
		this.winterAmount =
			(blend.from === "winter" ? 1 - blend.amount : 0) +
			(blend.to === "winter" ? blend.amount : 0);
		this.autumnAmount =
			(blend.from === "autumn" ? 1 - blend.amount : 0) +
			(blend.to === "autumn" ? blend.amount : 0);
		const selected = this.dataset.season;
		const palette = () => {
			const style = getComputedStyle(this);
			return materials.map(({ token }) =>
				token ? style.getPropertyValue(token).trim() : "",
			);
		};

		this.dataset.season = blend.from;
		const from = palette();
		let colors = from;
		if (blend.from !== blend.to && blend.amount > 0) {
			this.dataset.season = blend.to;
			const to = palette();
			colors = from.map((color, i) =>
				!color || color === to[i]
					? color
					: `color-mix(in oklab, ${color} ${((1 - blend.amount) * 100).toFixed(3)}%, ${to[i]})`,
			);
		}
		this.dataset.season = selected;
		const swatches = document.createElement("canvas");
		swatches.width = materials.length;
		swatches.height = 1;
		const sample = swatches.getContext("2d", { willReadFrequently: true })!;
		for (let i = 0; i < materials.length; i += 1) {
			sample.fillStyle = colors[i]!;
			sample.fillRect(i, 0, 1, 1);
		}
		this.palettePixels = sample.getImageData(0, 0, materials.length, 1).data;
		this.snowColor = getComputedStyle(this)
			.getPropertyValue("--hero-snow")
			.trim();
		this.updateSnowGlyphs();
		this.updateFloorTile();
		this.frames.requestDraw();
	}

	private updateFloorTile(): void {
		if (!this.glyphs) {
			return;
		}
		// Repeat the glyphs beside the fixed canvas without stretching the flowers.
		const rowHeight = (this.glyphs.height * CELL_HEIGHT) / HEIGHT;
		const tile = document.createElement("canvas");
		tile.width = this.glyphs.width;
		tile.height = rowHeight * 3;
		const tileContext = tile.getContext("2d")!;
		const row = document.createElement("canvas");
		row.width = tile.width;
		row.height = rowHeight;
		const rowContext = row.getContext("2d")!;
		for (let index = 0; index < 3; index += 1) {
			rowContext.clearRect(0, 0, row.width, row.height);
			rowContext.globalCompositeOperation = "source-over";
			rowContext.globalAlpha = 1;
			rowContext.drawImage(
				this.glyphs,
				0,
				this.glyphs.height - tile.height + index * rowHeight,
				row.width,
				row.height,
				0,
				0,
				row.width,
				row.height,
			);
			const material = index === 0 ? 1 : SOIL_MATERIAL;
			const y = HEIGHT - (2.5 - index) * CELL_HEIGHT;
			const fade =
				1 - SOIL_BOTTOM_FADE * growthAt((y - GROUND_Y) / (HEIGHT - GROUND_Y));
			rowContext.globalCompositeOperation = "source-in";
			rowContext.globalAlpha = (index === 0 ? 2 / 3 : SOIL_OPACITY) * fade;
			rowContext.fillStyle = `rgb(${this.palettePixels[material * 4]} ${this.palettePixels[material * 4 + 1]} ${this.palettePixels[material * 4 + 2]})`;
			rowContext.fillRect(0, 0, row.width, row.height);
			tileContext.drawImage(row, 0, index * rowHeight);
		}
		const revision = ++this.floorTileRevision;
		// PNG encoding must not block the first animation frame.
		tile.toBlob((blob) => {
			if (!blob || !this.isConnected || revision !== this.floorTileRevision) {
				return;
			}
			const previous = this.floorTileUrl;
			this.floorTileUrl = URL.createObjectURL(blob);
			this.style.setProperty("--floor-tile", `url("${this.floorTileUrl}")`);
			if (previous !== undefined) {
				URL.revokeObjectURL(previous);
			}
		});
	}

	private finishGrowth(): void {
		this.elapsed = Math.max(
			this.elapsed,
			GROW_DURATION + soilArrival(0, this.grid.width),
		);
	}

	private prepareStill(): void {
		this.finishGrowth();
		for (const bend of this.bends) {
			bend.angle = 0;
			bend.velocity = 0;
		}
		for (const shed of this.shedding) {
			shed.missing.clear();
			shed.regrowAt = undefined;
			shed.energy = 0;
			shed.direction = 0;
			shed.lastDrop = -Infinity;
		}
		this.headDirty.fill(true);
		this.petals.length = 0;
		this.newlySettled.length = 0;
		for (const [index, flake] of this.snowflakes.entries()) {
			flake.active = false;
			flake.resting = undefined;
			flake.grounded = false;
			flake.meltsAt = undefined;
			flake.spawnAt = this.elapsed + index * 0.12;
		}
		this.snowCanvas
			?.getContext("2d")!
			.clearRect(0, 0, this.snowCanvas.width, this.snowCanvas.height);
	}

	private readonly motionChanged = (): void => {
		this.reduced = this.motion.matches;
		this.stop();
		if (this.glyphs) {
			this.frames.requestDrawWith(this.createRenderer);
		}
	};

	private readonly layoutChanged = (): void => {
		this.frames.requestDrawWith(() => {
			this.pointerEnd();
			const visible = new Set(this.flowerIndices);
			const hiddenMaterials = new Set(
				flowers
					.filter((_, index) => !visible.has(index))
					.map((flower) => flower.material),
			);
			for (let i = this.petals.length - 1; i >= 0; i -= 1) {
				if (hiddenMaterials.has(this.petals[i]!.material)) {
					this.petals.splice(i, 1);
				}
			}
			this.newlySettled.length = 0;
			this.settledPetalsDirty = true;
			for (const flake of this.snowflakes) {
				if (flake.resting && !visible.has(flake.resting.flower)) {
					flake.resting = undefined;
					flake.vy = flake.speed;
				}
			}
		});
	};

	private start(): void {
		if (
			this.visibility?.isHidden ||
			!this.animated ||
			!this.isConnected ||
			!this.glyphs
		) {
			return;
		}
		this.frames.timeline.resume();
	}

	private stop(): void {
		this.frames.timeline.pause();
		this.pointerEnd();
	}

	private flowerState(index: number) {
		const flower = flowers[index]!;
		const time = this.elapsed - soilArrival(flower.x);
		const growth = growthAt(time / STEM_DURATION);
		const angle = ((flower.lean + this.bends[index]!.angle) * Math.PI) / 180;
		const height = flower.height * growth;
		return {
			growth,
			time,
			angle,
			x: flower.x + Math.sin(angle) * height,
			y: GROUND_Y - Math.cos(angle) * height,
		};
	}

	private windAt(x: number, y: number): number {
		// One advected field, not an oscillator per flower: neighbours share each gust.
		const time = this.elapsed - x / WIND_FRONT_SPEED;
		// A shared swell prevents long, imperceptible lulls; noise varies its strength
		// and timing without making neighbouring flowers sway independently.
		const swell =
			Math.sin(time * 0.9 + windNoise(time * 0.1, 11) * 0.8) *
			(27 + windNoise(time * 0.18, 79) * 6);
		const gust =
			swell + windNoise(time * 0.42, 127) * 8 + windNoise(time * 0.9, 47) * 2;
		const exposure = 0.45 + 0.55 * Math.sqrt(Math.max(0, (GROUND_Y - y) / 222));
		const turbulence = windNoise(this.elapsed * 0.65 + x / 450, 163) * 1.2;
		// Keep a light breeze even when several gust bands reinforce one another.
		return 42 * Math.tanh(((gust + turbulence) * 2.2) / 42) * exposure;
	}

	private petalGrowth(index: number, petalIndex: number, time: number): number {
		const shed = this.shedding[index]!;
		const order = rosePetals.length - 1 - petalIndex;
		if (shed.missing.has(petalIndex)) {
			return shed.regrowAt === undefined
				? 0
				: growthAt(
						(this.elapsed - shed.regrowAt - order * REGROW_STAGGER) /
							REGROW_DURATION,
					);
		}
		return growthAt(
			(time - BLOOM_START - order * INITIAL_PETAL_STAGGER) / BLOOM_DURATION,
		);
	}

	private flowerDynamics(index: number) {
		const flower = flowers[index]!;
		const plant = this.flowerState(index);
		const petalArea = rosePetals.reduce(
			(area, petal, i) =>
				area +
				petal.width *
					petal.height *
					this.petalGrowth(index, i, plant.time) ** 2,
			0,
		);
		const load = petalArea / TOTAL_PETAL_AREA;
		const length = (flower.height / 180) * (0.6 + 0.4 * plant.growth);
		// A cantilever's restoring stiffness decreases with length, while its head's
		// angular inertia increases with mass × length². Retain stem/receptacle mass.
		const stiffness = 26 / length ** 1.2;
		const inertia = Math.max(
			0.2,
			length ** 2 * (0.45 + 0.65 * flower.size ** 3 * (0.25 + 0.75 * load)),
		);
		const damping = 2 * 0.32 * Math.sqrt(stiffness * inertia);
		const wind = this.windAt(plant.x, plant.y);
		const area = 0.9 * plant.growth + 0.95 * flower.size ** 2 * load;
		const windTorque = wind * Math.abs(wind) * 0.028 * length * area;
		return { stiffness, inertia, damping, windTorque };
	}

	private shade(
		material: number,
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		bright: number,
		dim: number,
		mask = this.mask(material)!,
	): CanvasGradient {
		const gradient = mask.createLinearGradient(x0, y0, x1, y1);
		// Alpha carries broad shading; RGB crease contrast retains material coverage.
		gradient.addColorStop(0, `rgb(255 255 255 / ${bright})`);
		gradient.addColorStop(1, `rgb(255 255 255 / ${dim})`);
		return gradient;
	}

	private drawFlower(index: number): void {
		const mask = this.mask(1)!;
		const flower = flowers[index]!;
		const plant = this.flowerState(index);
		if (plant.growth === 0) {
			return;
		}
		const offset = plant.x - flower.x;
		const height = GROUND_Y - plant.y;
		const stemPoint = (fraction: number) => ({
			x: flower.x + offset * fraction * fraction,
			y: GROUND_Y - height * fraction,
		});

		mask.strokeStyle = this.shade(
			1,
			flower.x - 10,
			plant.y,
			flower.x + 20,
			GROUND_Y,
			0.95,
			0.6,
		);
		mask.fillStyle = "white";
		mask.lineWidth = 9;
		mask.lineCap = "round";
		mask.beginPath();
		mask.moveTo(flower.x, GROUND_Y);
		mask.bezierCurveTo(
			flower.x,
			GROUND_Y - height * 0.35,
			flower.x + offset * 0.45,
			plant.y + height * 0.25,
			plant.x,
			plant.y,
		);
		mask.stroke();

		for (const leaf of flowerLeaves[index]!) {
			const { fraction, direction } = leaf;
			const unfold = growthAt((plant.time - fraction * STEM_DURATION) / 0.45);
			if (unfold === 0) {
				continue;
			}
			const point = stemPoint(fraction);
			mask.save();
			mask.translate(point.x, point.y);
			mask.rotate(plant.angle * fraction + leaf.tilt);
			mask.scale(
				flower.size * unfold * leaf.length,
				flower.size * unfold * leaf.height,
			);
			mask.fillStyle = this.shade(1, 0, -40, direction * 47, 5, 0.95, 0.45);
			mask.beginPath();
			mask.moveTo(0, 0);
			mask.bezierCurveTo(
				direction * 4,
				-29 * leaf.fullness,
				direction * 29,
				-41,
				direction * 47,
				-38,
			);
			mask.bezierCurveTo(
				direction * 44,
				-13,
				direction * 22,
				4 * leaf.fullness,
				0,
				0,
			);
			mask.fill();
			mask.restore();
		}

		const bloom = growthAt((plant.time - BLOOM_START) / BLOOM_DURATION);
		if (bloom === 0) {
			return;
		}
		mask.save();
		mask.translate(plant.x, plant.y);
		mask.rotate(plant.angle * 0.7);
		mask.scale(
			flower.size * HEAD_SCALE * bloom,
			flower.size * HEAD_SCALE * bloom,
		);
		// The receptacle belongs to foliage, even after its petals have fallen.
		mask.fillStyle = "white";
		mask.beginPath();
		mask.ellipse(0, 4, 8, 10, 0, 0, Math.PI * 2);
		mask.fill();
		const petals = this.mask(flower.material)!;
		petals.save();
		petals.setTransform(mask.getTransform());
		this.drawFlowerHead(index, plant.time, petals);
		petals.restore();
		mask.restore();
	}

	private drawFlowerHead(
		index: number,
		time: number,
		mask: CanvasRenderingContext2D,
	): void {
		if (time < GROW_DURATION || this.shedding[index]!.regrowAt !== undefined) {
			this.drawHead(index, time, mask);
			return;
		}
		const radius = Math.ceil(HEAD_RADIUS / HEAD_SCALE) + 2;
		const resolution =
			this.dataset.renderer === "canvas"
				? (this.grid.columns / this.grid.width) *
					flowers[index]!.size *
					HEAD_SCALE
				: 2;
		const size = Math.ceil(radius * 2 * resolution);
		let image = this.headImages[index];
		if (!image) {
			image = document.createElement("canvas");
			this.headImages[index] = image;
		}
		if (image.width !== size || image.height !== size) {
			image.width = size;
			image.height = size;
			this.headDirty[index] = true;
		}
		if (this.headDirty[index]) {
			const context = image.getContext("2d", { willReadFrequently: true })!;
			context.resetTransform();
			context.clearRect(0, 0, image.width, image.height);
			const scale = size / (radius * 2);
			context.setTransform(scale, 0, 0, scale, size / 2, size / 2);
			context.imageSmoothingQuality = "high";
			this.drawHead(index, time, context);
			this.headDirty[index] = false;
		}
		mask.drawImage(image, -radius, -radius, radius * 2, radius * 2);
	}

	private drawHead(
		index: number,
		time: number,
		mask: CanvasRenderingContext2D,
	): void {
		for (const [petalIndex, petal] of rosePetals.entries()) {
			const growth = this.petalGrowth(index, petalIndex, time);
			if (growth === 0) {
				continue;
			}
			const radius = petal.radius * (0.35 + 0.65 * growth);
			mask.save();
			mask.translate(
				Math.cos(petal.angle) * radius,
				Math.sin(petal.angle) * radius,
			);
			mask.rotate(petal.angle + Math.PI / 2);
			mask.scale(growth, growth);
			mask.globalAlpha = 0.5 + 0.5 * growth;
			this.drawPetal(mask, petalIndex);
			mask.restore();
		}
	}

	private createPetalImage(index: number): HTMLCanvasElement {
		const petal = rosePetals[index]!;
		const image = document.createElement("canvas");
		// Cache each petal in its own frame, including its share of the head's seams.
		image.width = petal.width * 4;
		image.height = petal.height * 4;
		const mask = image.getContext("2d")!;
		mask.scale(2, 2);
		mask.translate(petal.width, petal.height);
		mask.rotate(-petal.angle - Math.PI / 2);
		mask.translate(
			-Math.cos(petal.angle) * petal.radius,
			-Math.sin(petal.angle) * petal.radius,
		);
		mask.fillStyle = this.shade(0, -65, -65, 65, 65, 1, 0.45, mask);
		mask.globalAlpha =
			0.7 + 0.3 * Math.max(0, Math.cos(petal.angle + Math.PI * 0.75));
		mask.beginPath();
		mask.ellipse(
			Math.cos(petal.angle) * petal.radius,
			Math.sin(petal.angle) * petal.radius,
			petal.width,
			petal.height,
			petal.angle + Math.PI / 2,
			0,
			Math.PI * 2,
		);
		mask.fill();
		// RGB carries crease shading; alpha retains the petal's coverage.
		mask.globalAlpha = 0.9;
		mask.globalCompositeOperation = "source-atop";
		this.drawSeams(mask);
		return image;
	}

	private drawPetal(mask: CanvasRenderingContext2D, index: number): void {
		const petal = rosePetals[index]!;
		mask.drawImage(
			this.petalImages[index]!,
			-petal.width,
			-petal.height,
			petal.width * 2,
			petal.height * 2,
		);
	}

	private drawSeams(mask: CanvasRenderingContext2D): void {
		mask.lineCap = "round";
		// Black encodes a crease; renderers blend it toward the hero's background.
		mask.strokeStyle = "black";
		mask.lineWidth = 5;
		for (const [ring, radius] of [45, 28, 14].entries()) {
			const start = ring * 1.9;
			mask.beginPath();
			mask.arc(0, 0, radius, start, start + Math.PI * 1.45);
			mask.stroke();
		}
	}

	private draw(): void {
		if (!this.renderer || !this.glyphs) {
			return;
		}
		const floorEdgeOpacity = growthAt(
			(this.elapsed - soilArrival(0, this.grid.width)) / SOIL_FADE_DURATION,
		);
		if (floorEdgeOpacity !== this.floorEdgeOpacity) {
			this.floorEdgeOpacity = floorEdgeOpacity;
			this.style.setProperty("--floor-edge-opacity", String(floorEdgeOpacity));
		}
		const offset = (this.grid.width - WIDTH) / 2;
		for (const mask of this.renderer.masks) {
			mask.resetTransform();
			mask.clearRect(0, 0, mask.canvas.width, mask.canvas.height);
			mask.save();
			mask.scale(
				mask.canvas.width / this.grid.width,
				mask.canvas.height / HEIGHT,
			);
			mask.translate(offset, 0);
		}
		for (const i of this.flowerIndices) {
			this.drawFlower(i);
		}
		const soil = this.mask(SOIL_MATERIAL)!;
		soil.fillStyle = "white";
		soil.fillRect(-offset, GROUND_Y, this.grid.width, HEIGHT - GROUND_Y);
		const foliage = this.mask(1)!;
		foliage.fillStyle = "white";
		for (
			let column = Math.floor(-offset / CELL_WIDTH);
			column < (WIDTH + offset) / CELL_WIDTH;
			column += 1
		) {
			foliage.fillRect(
				column * CELL_WIDTH + 1,
				GROUND_Y - 3.5 - (column % 3),
				3,
				4,
			);
		}
		this.drawSettledPetals();
		for (const petal of this.petals) {
			if (!petal.settled) {
				this.drawFallenPetal(this.mask(petal.material)!, petal);
			}
		}
		if (this.animated) {
			this.drawSnow();
		}
		for (const mask of this.renderer.masks) {
			mask.restore();
		}

		this.renderer.draw(this.palettePixels, this.elapsed);
		this.updateCursor();
	}

	private drawFallenPetal(
		mask: CanvasRenderingContext2D,
		petal: FallenPetal,
	): void {
		mask.save();
		mask.translate(petal.x, petal.y);
		mask.rotate(petal.angle);
		mask.scale(petal.size, petal.size);
		this.drawPetal(mask, petal.petalIndex);
		mask.restore();
	}

	private drawSettledPetals(): void {
		if (this.settledPetalsDirty) {
			for (const mask of this.settledPetalMasks.values()) {
				mask.resetTransform();
				mask.clearRect(0, 0, mask.canvas.width, mask.canvas.height);
			}
		}
		// Settled petals only need rasterizing when they land or leave the ground.
		for (const petal of this.settledPetalsDirty
			? this.petals
			: this.newlySettled) {
			if (!petal.settled) {
				continue;
			}
			let cached = this.settledPetalMasks.get(petal.material);
			const target = this.mask(petal.material)!;
			if (!cached) {
				const canvas = document.createElement("canvas");
				canvas.width = target.canvas.width;
				canvas.height = target.canvas.height;
				cached = canvas.getContext("2d", {
					willReadFrequently: this.dataset.renderer === "canvas",
				})!;
				this.settledPetalMasks.set(petal.material, cached);
			}
			cached.setTransform(target.getTransform());
			this.drawFallenPetal(cached, petal);
		}
		this.newlySettled.length = 0;
		this.settledPetalsDirty = false;
		for (const [material, cached] of this.settledPetalMasks) {
			const target = this.mask(material)!;
			target.save();
			target.resetTransform();
			target.drawImage(cached.canvas, 0, 0);
			target.restore();
		}
	}

	private updateSnow(dt: number): void {
		if (this.winterAmount === 0 || this.elapsed < SNOW_START) {
			return;
		}
		for (const flake of this.snowflakes) {
			if (!flake.active) {
				if (this.elapsed < flake.spawnAt) {
					continue;
				}
				flake.active = true;
				flake.y = SNOW_TOP - flake.radius;
				flake.vx = 0;
				flake.vy = flake.speed;
				flake.canLand = Math.random() < 0.5;
			}
			if (flake.meltsAt !== undefined && this.elapsed >= flake.meltsAt) {
				this.recycleSnow(flake);
				continue;
			}
			if (flake.grounded) {
				continue;
			}
			if (flake.resting) {
				const rest = flake.resting;
				const plant = this.flowerState(rest.flower);
				const scale = flowers[rest.flower]!.size * HEAD_SCALE;
				const angle = plant.angle * 0.7;
				flake.x =
					plant.x +
					(rest.x * Math.cos(angle) - rest.y * Math.sin(angle)) * scale;
				flake.y =
					plant.y +
					(rest.x * Math.sin(angle) + rest.y * Math.cos(angle)) * scale;
				if (this.petalGrowth(rest.flower, rest.petal, plant.time) === 0) {
					flake.resting = undefined;
					flake.vy = flake.speed;
				} else if (this.elapsed >= rest.until) {
					this.recycleSnow(flake);
					continue;
				} else {
					continue;
				}
			}
			const previousX = flake.x;
			const previousY = flake.y;
			const breeze =
				this.windAt(flake.x, flake.y) * 0.35 +
				Math.sin(this.elapsed * 0.55 + flake.phase) * 8;
			const drag = -Math.expm1(-dt * 1.5);
			flake.vx += (breeze - flake.vx) * drag;
			flake.vy += (flake.speed - flake.vy) * drag;
			flake.x += flake.vx * dt;
			flake.y += flake.vy * dt;
			if (flake.canLand && flake.vy > 0) {
				this.landSnow(flake, previousX, previousY);
			}
			if (flake.vy > 0 && flake.y + flake.radius >= SNOW_GROUND) {
				flake.y = SNOW_GROUND - flake.radius;
				flake.vx = 0;
				flake.vy = 0;
				flake.grounded = true;
				flake.canLand = false;
				// Brushing and relanding must not restart the melting clock.
				flake.meltsAt ??=
					this.elapsed + GROUND_SNOW_LIFETIME * (0.8 + Math.random() * 0.4);
			}
		}
	}

	private recycleSnow(flake: Snowflake): void {
		flake.active = false;
		flake.resting = undefined;
		flake.grounded = false;
		flake.meltsAt = undefined;
		flake.spawnAt = this.elapsed + Math.random() * 0.5;
		flake.x = Math.random() * WORLD_WIDTH - (WORLD_WIDTH - WIDTH) / 2;
	}

	private landSnow(
		flake: Snowflake,
		previousX: number,
		previousY: number,
	): void {
		let firstHit = Infinity;
		let resting: SnowRest | undefined;
		for (const flowerIndex of this.flowerIndices) {
			const flower = flowers[flowerIndex]!;
			const plant = this.flowerState(flowerIndex);
			const reach = HEAD_RADIUS * flower.size + flake.radius;
			if (
				Math.min(previousX, flake.x) > plant.x + reach ||
				Math.max(previousX, flake.x) < plant.x - reach ||
				previousY > plant.y + reach ||
				flake.y < plant.y - reach
			) {
				continue;
			}
			const scale = flower.size * HEAD_SCALE;
			const cos = Math.cos(plant.angle * 0.7);
			const sin = Math.sin(plant.angle * 0.7);
			const startX =
				((previousX - plant.x) * cos + (previousY - plant.y) * sin) / scale;
			const startY =
				(-(previousX - plant.x) * sin + (previousY - plant.y) * cos) / scale;
			const deltaX =
				((flake.x - previousX) * cos + (flake.y - previousY) * sin) / scale;
			const deltaY =
				(-(flake.x - previousX) * sin + (flake.y - previousY) * cos) / scale;
			for (const [petalIndex, petal] of rosePetals.entries()) {
				const growth = this.petalGrowth(flowerIndex, petalIndex, plant.time);
				if (growth === 0) {
					continue;
				}
				const radius = petal.radius * (0.35 + 0.65 * growth);
				const x = startX - Math.cos(petal.angle) * radius;
				const y = startY - Math.sin(petal.angle) * radius;
				const petalCos = Math.cos(petal.angle + Math.PI / 2);
				const petalSin = Math.sin(petal.angle + Math.PI / 2);
				const width = petal.width * growth + flake.radius / scale;
				const height = petal.height * growth + flake.radius / scale;
				const sx = (x * petalCos + y * petalSin) / width;
				const sy = (-x * petalSin + y * petalCos) / height;
				const dx = (deltaX * petalCos + deltaY * petalSin) / width;
				const dy = (-deltaX * petalSin + deltaY * petalCos) / height;
				// Sweep against the actual petal ellipses, including gaps left by shedding.
				const a = dx * dx + dy * dy;
				const b = 2 * (sx * dx + sy * dy);
				const c = sx * sx + sy * sy - 1;
				const discriminant = b * b - 4 * a * c;
				if (a === 0 || discriminant < 0) {
					continue;
				}
				const hit = (-b - Math.sqrt(discriminant)) / (2 * a);
				if (hit < 0 || hit > 1 || hit >= firstHit) {
					continue;
				}
				firstHit = hit;
				resting = {
					flower: flowerIndex,
					petal: petalIndex,
					x: startX + deltaX * hit,
					y: startY + deltaY * hit,
					until: this.elapsed + 8 + Math.random() * 8,
				};
			}
		}
		if (resting) {
			flake.resting = resting;
			flake.canLand = false;
			flake.x = previousX + (flake.x - previousX) * firstHit;
			flake.y = previousY + (flake.y - previousY) * firstHit;
			flake.vx = 0;
			flake.vy = 0;
		}
	}

	private updateSnowGlyphs(): void {
		if (!this.glyphs) {
			return;
		}
		const canvas = document.createElement("canvas");
		canvas.width = this.glyphs.width;
		canvas.height = SNOW_ROWS * CELL_HEIGHT * 2;
		const context = canvas.getContext("2d")!;
		const top = -SNOW_FIRST_ROW * CELL_HEIGHT * 2;
		context.drawImage(this.glyphs, 0, top);
		context.drawImage(this.glyphs, 0, top - this.glyphs.height);
		context.globalCompositeOperation = "source-in";
		context.fillStyle = this.snowColor;
		context.fillRect(0, 0, canvas.width, canvas.height);
		this.snowGlyphs = canvas;
	}

	private drawSnow(): void {
		if (!this.snowCanvas || !this.snowGlyphs) {
			return;
		}
		const context = this.snowCanvas.getContext("2d")!;
		context.clearRect(0, 0, this.snowCanvas.width, this.snowCanvas.height);
		if (this.winterAmount === 0) {
			return;
		}
		const { columns, cellWidth, cellHeight } = this.grid;
		const offset = (WORLD_WIDTH - WIDTH) / 2;
		this.snowOpacities.fill(0);
		for (const flake of this.snowflakes) {
			if (!flake.active) {
				continue;
			}
			const melt = Math.min(
				1,
				flake.resting ? (flake.resting.until - this.elapsed) / 2 : 1,
				flake.meltsAt === undefined
					? 1
					: (flake.meltsAt - this.elapsed) / GROUND_SNOW_LIFETIME,
			);
			const opacity = flake.opacity * this.winterAmount * Math.max(0, melt);
			const reach = flake.radius + cellHeight / 2;
			const firstColumn = Math.max(
				0,
				Math.floor((flake.x + offset - reach) / cellWidth),
			);
			const lastColumn = Math.min(
				columns - 1,
				Math.floor((flake.x + offset + reach) / cellWidth),
			);
			const firstRow = Math.max(
				SNOW_FIRST_ROW,
				Math.floor((flake.y - reach) / cellHeight),
			);
			const lastRow = Math.min(
				SNOW_FIRST_ROW + SNOW_ROWS - 1,
				Math.floor((flake.y + reach) / cellHeight),
			);
			for (let row = firstRow; row <= lastRow; row += 1) {
				for (let column = firstColumn; column <= lastColumn; column += 1) {
					const distance = Math.hypot(
						(column + 0.5) * cellWidth - offset - flake.x,
						(row + 0.5) * cellHeight - flake.y,
					);
					const alpha =
						opacity * Math.max(0, Math.min(1, (reach - distance) / cellHeight));
					const index = (row - SNOW_FIRST_ROW) * columns + column;
					this.snowOpacities[index]! +=
						(1 - this.snowOpacities[index]!) * alpha;
				}
			}
		}
		for (let index = 0; index < this.snowOpacities.length; index += 1) {
			this.snowPixels.data[index * 4 + 3] = this.snowOpacities[index]! * 255;
		}
		this.snowCells.getContext("2d")!.putImageData(this.snowPixels, 0, 0);
		context.save();
		context.imageSmoothingEnabled = false;
		const top = (SNOW_FIRST_ROW * cellHeight - SNOW_TOP) * 2;
		// One opacity per complete glyph, expanded without interpolation.
		context.drawImage(
			this.snowCells,
			0,
			top,
			this.snowGlyphs.width,
			this.snowGlyphs.height,
		);
		context.globalCompositeOperation = "source-in";
		context.drawImage(this.snowGlyphs, 0, top);
		context.restore();
	}

	private updateCursor(): void {
		if (!this.canvas) {
			return;
		}
		// Recheck during drawing too: the head can move beneath a stationary mouse.
		const index =
			this.animated && this.hover
				? this.flowerAt(this.point(this.hover))
				: undefined;
		const shed = index === undefined ? undefined : this.shedding[index];
		const cursor =
			shed && shed.missing.size > 0 && shed.regrowAt === undefined
				? "pointer"
				: "";
		for (const canvas of [this.canvas, this.snowCanvas]) {
			if (canvas && canvas.style.cursor !== cursor) {
				canvas.style.cursor = cursor;
			}
		}
	}

	private regrowFlower(index: number): void {
		const shed = this.shedding[index]!;
		if (
			!this.animated ||
			shed.missing.size === 0 ||
			shed.regrowAt !== undefined
		) {
			return;
		}
		shed.energy = 0;
		this.headDirty[index] = true;
		this.autumnWait[index] = 12 + Math.random() * 12;
		shed.regrowAt = this.elapsed;
		this.frames.requestDraw();
	}

	private flowerAt(point: { x: number; y: number }): number | undefined {
		let closest: number | undefined;
		let distance = Infinity;
		for (const i of this.flowerIndices) {
			const flower = flowers[i]!;
			const plant = this.flowerState(i);
			const fromHead = Math.hypot(point.x - plant.x, point.y - plant.y);
			if (
				plant.time >= GROW_DURATION &&
				fromHead < HEAD_RADIUS * flower.size + 10 &&
				fromHead < distance
			) {
				closest = i;
				distance = fromHead;
			}
		}
		return closest;
	}

	private shedPetal(index: number, impulse = 1): void {
		const shed = this.shedding[index]!;
		const available = rosePetals
			.map((_, i) => i)
			.filter((i) => !shed.missing.has(i));
		if (available.length === 0) {
			return;
		}
		const layer = rosePetals[available[0]!]!.layer;
		const candidates = available.filter((i) => rosePetals[i]!.layer === layer);
		const petalIndex =
			candidates[Math.floor(Math.random() * candidates.length)]!;
		shed.missing.add(petalIndex);
		this.headDirty[index] = true;
		shed.lastDrop = this.elapsed;
		shed.energy = 0;
		const flower = flowers[index]!;
		const plant = this.flowerState(index);
		const attachedPetal = rosePetals[petalIndex]!;
		const angle = attachedPetal.angle + plant.angle * 0.7;
		const radius = attachedPetal.radius * flower.size * HEAD_SCALE;
		if (this.petals.length >= MAX_FALLEN_PETALS) {
			const oldestSettled = this.petals.findIndex((petal) => petal.settled);
			this.petals.splice(Math.max(0, oldestSettled), 1);
			this.settledPetalsDirty = true;
		}
		this.petals.push({
			x: plant.x + Math.cos(angle) * radius,
			y: plant.y + Math.sin(angle) * radius,
			vx:
				(this.bends[index]!.velocity * 1.6 + (Math.random() - 0.5) * 40) *
				impulse,
			vy: (-25 - Math.random() * 40) * impulse,
			gravity: 70 + 120 * impulse,
			angle: angle + Math.PI / 2,
			spin: (Math.random() - 0.5) * 5 * impulse,
			phase: Math.random() * Math.PI * 2,
			petalIndex,
			size: flower.size * HEAD_SCALE,
			material: flower.material,
			settled: false,
		});
	}

	private shedAutumnPetals(dt: number): void {
		if (
			this.reduced ||
			this.dataset.palette === "pride" ||
			this.autumnAmount === 0 ||
			dt === 0
		) {
			return;
		}
		for (const i of this.flowerIndices) {
			const shed = this.shedding[i]!;
			if (
				shed.regrowAt !== undefined ||
				shed.missing.size === rosePetals.length ||
				this.flowerState(i).time < GROW_DURATION ||
				this.elapsed - shed.lastDrop < 2
			) {
				continue;
			}
			// Simulation-time countdowns pause offscreen; seasonal blending eases the rate.
			this.autumnWait[i]! -= dt * this.autumnAmount;
			if (this.autumnWait[i]! <= 0) {
				this.shedPetal(i, 0.12);
				this.autumnWait[i] = 18 + Math.random() * 18;
			}
		}
	}

	private landPetal(petal: FallenPetal): void {
		if (!petal.settled) {
			this.newlySettled.push(petal);
		}
		petal.vx = 0;
		petal.vy = 0;
		petal.settled = true;
	}

	private updatePetals(dt: number): void {
		for (const petal of this.petals) {
			if (petal.settled) {
				continue;
			}
			const wind = this.windAt(petal.x, petal.y);
			petal.vx +=
				((wind * 2 - petal.vx) * 1.1 +
					Math.sin(this.elapsed * 5 + petal.phase) * 20) *
				dt;
			petal.vy += (petal.gravity - petal.vy * 0.45) * dt;
			petal.x += petal.vx * dt;
			petal.y += petal.vy * dt;
			petal.angle +=
				(petal.spin +
					Math.sin(this.elapsed * 4 + petal.phase) * 0.8 +
					wind * 0.01) *
				dt;
			if (petal.vy >= 0 && petal.y >= GROUND_Y - 7) {
				this.landPetal(petal);
			}
		}
	}

	private readonly tick = (event: Event): void => {
		if (!this.animated || !this.isConnected) {
			this.stop();
			return;
		}
		// Preserve the existing physics cap after a stalled frame.
		// SAFETY: this handler receives only FrameController's update events.
		const { deltaMs } = (event as CustomEvent<{ deltaMs: number }>).detail;
		const dt = Math.min(deltaMs / 1000, 0.05);
		this.elapsed += dt;
		const steps = Math.max(1, Math.ceil(dt / PHYSICS_STEP));
		const step = dt / steps;
		for (const i of this.flowerIndices) {
			const bend = this.bends[i]!;
			const response = this.flowerDynamics(i);
			for (let substep = 0; substep < steps; substep += 1) {
				const torque =
					response.windTorque -
					response.stiffness * bend.angle -
					response.damping * bend.velocity;
				bend.velocity += (torque / response.inertia) * step;
				const nextAngle = bend.angle + bend.velocity * step;
				bend.angle = Math.max(-MAX_BEND, Math.min(MAX_BEND, nextAngle));
				if (Math.abs(nextAngle) > MAX_BEND) {
					bend.velocity *= -0.2;
				}
			}
			const shed = this.shedding[i]!;
			shed.energy *= Math.exp(-dt * 2);
			if (
				shed.regrowAt !== undefined &&
				this.elapsed - shed.regrowAt >=
					REGROW_DURATION + (rosePetals.length - 1) * REGROW_STAGGER
			) {
				shed.missing.clear();
				shed.regrowAt = undefined;
			}
		}
		this.shedAutumnPetals(dt);
		this.updatePetals(dt);
		this.updateSnow(dt);
	};

	private point(event: PointerEvent) {
		const rect = this.renderRoot
			.querySelector<HTMLCanvasElement>(
				this.dataset.renderer === "webgl" ? ".webgl" : "canvas",
			)!
			.getBoundingClientRect();
		return {
			id: event.pointerId,
			time: event.timeStamp,
			x:
				((event.clientX - rect.left) * this.grid.width) / rect.width -
				(this.grid.width - WIDTH) / 2,
			y: ((event.clientY - rect.top) * HEIGHT) / rect.height,
		};
	}

	private readonly pointerDown = (event: PointerEvent): void => {
		if (
			!this.animated ||
			!event.isPrimary ||
			event.button !== 0 ||
			this.press
		) {
			return;
		}
		const point = this.point(event);
		this.pointer = point;
		this.press = {
			id: event.pointerId,
			clientX: event.clientX,
			clientY: event.clientY,
			flower: this.flowerAt(point),
			dragged: false,
		};
		if (event.currentTarget instanceof HTMLCanvasElement) {
			event.currentTarget.setPointerCapture(event.pointerId);
		}
	};

	private readonly pointerMove = (event: PointerEvent): void => {
		if (
			!this.animated ||
			!event.isPrimary ||
			(this.press && this.press.id !== event.pointerId)
		) {
			return;
		}
		if (event.pointerType !== "touch") {
			this.hover = event;
			this.updateCursor();
		}
		if (
			this.press &&
			Math.hypot(
				event.clientX - this.press.clientX,
				event.clientY - this.press.clientY,
			) > 8
		) {
			this.press.dragged = true;
		}
		const point = this.point(event);
		const previous = this.pointer;
		this.pointer = point;
		// Mouse hover brushes the flowers too; touch requires an active swipe.
		if (
			!previous ||
			previous.id !== event.pointerId ||
			(event.pointerType !== "mouse" && event.buttons === 0)
		) {
			return;
		}
		const sweepX = point.x - previous.x;
		const sweepY = point.y - previous.y;
		const lengthSquared = sweepX * sweepX + sweepY * sweepY;
		if (lengthSquared === 0) {
			return;
		}
		const dx = Math.max(-45, Math.min(45, sweepX));
		const speed =
			(Math.hypot(sweepX, sweepY) * 1000) /
			Math.max(1, point.time - previous.time);
		// No minimum kick: a slow brush should approach zero force, not a fixed hit.
		const impact = Math.min(3.5, speed / 600);
		// Test the whole swept path, so a quick hand movement cannot skip a flower.
		const distanceFromSweep = (x: number, y: number) => {
			const along = Math.max(
				0,
				Math.min(
					1,
					((x - previous.x) * sweepX + (y - previous.y) * sweepY) /
						lengthSquared,
				),
			);
			return Math.hypot(
				x - previous.x - along * sweepX,
				y - previous.y - along * sweepY,
			);
		};

		const sweepLength = Math.sqrt(lengthSquared);
		const airflowX = Math.max(
			-300,
			Math.min(300, (sweepX / sweepLength) * speed * 0.65),
		);
		const brush = (
			particle: { x: number; y: number; vx: number; vy: number },
			reach: number,
			settled = false,
		) => {
			const contact = Math.max(
				0,
				1 - distanceFromSweep(particle.x, particle.y) / reach,
			);
			const lift = Math.min(220, (speed * speed) / 3000) * contact;
			if (contact === 0 || (settled && lift < 8)) {
				return 0;
			}
			// Drag approaches passing airflow; distance weighting avoids per-event kicks.
			const coupling = -Math.expm1((-sweepLength * contact) / reach);
			particle.vx += (airflowX - particle.vx) * coupling;
			particle.vy += (-lift - particle.vy) * coupling;
			return coupling;
		};

		for (const petal of this.petals) {
			const petalOutline = rosePetals[petal.petalIndex]!;
			const reach =
				Math.max(petalOutline.width, petalOutline.height) * petal.size + 20;
			const coupling = brush(petal, reach, petal.settled);
			if (coupling > 0) {
				if (petal.settled) {
					this.settledPetalsDirty = true;
				}
				petal.settled = false;
				petal.spin += (airflowX * 0.02 - petal.spin) * coupling;
			}
		}
		for (const flake of this.snowflakes) {
			if (flake.active) {
				const coupling = brush(
					flake,
					flake.radius + 20,
					flake.grounded || flake.resting !== undefined,
				);
				if (coupling > 0) {
					flake.resting = undefined;
					flake.grounded = false;
				}
			}
		}

		for (const i of this.flowerIndices) {
			const bend = this.bends[i]!;
			const plant = this.flowerState(i);
			const flower = flowers[i]!;
			const headContact = Math.max(
				0,
				1 -
					distanceFromSweep(plant.x, plant.y) /
						(HEAD_RADIUS * flower.size + 45),
			);
			const stemContact =
				Math.max(
					0,
					1 -
						distanceFromSweep(
							flower.x + (plant.x - flower.x) * 0.36,
							GROUND_Y - (GROUND_Y - plant.y) * 0.6,
						) /
							55,
				) * 0.55;
			const strength = Math.max(headContact, stemContact) * plant.growth;
			const inertia = this.flowerDynamics(i).inertia;
			const impulse = dx * strength * impact * Math.min(1.8, 1.1 / inertia);
			bend.velocity = Math.max(
				-MAX_BEND_SPEED,
				Math.min(MAX_BEND_SPEED, bend.velocity + impulse),
			);
			const shed = this.shedding[i]!;
			const direction = Math.sign(dx);
			const reversal =
				direction !== 0 && direction !== shed.direction ? 1.5 : 1;
			shed.energy = Math.min(
				90,
				shed.energy + Math.abs(dx) * strength * reversal * impact,
			);
			if (strength > 0.2 && direction !== 0) {
				shed.direction = direction;
			}
			if (
				shed.regrowAt === undefined &&
				shed.energy > 45 &&
				Math.abs(bend.velocity) > 20 &&
				this.elapsed - shed.lastDrop > 0.2 &&
				plant.time >= GROW_DURATION
			) {
				this.shedPetal(i);
			}
		}
	};

	private readonly pointerUp = (event: PointerEvent): void => {
		const press = this.press;
		if (!this.animated || !press || event.pointerId !== press.id) {
			return;
		}
		const tap =
			!press.dragged &&
			Math.hypot(
				event.clientX - press.clientX,
				event.clientY - press.clientY,
			) <= 8;
		if (
			tap &&
			press.flower !== undefined &&
			this.flowerAt(this.point(event)) === press.flower
		) {
			this.regrowFlower(press.flower);
		}
		this.pointerEnd(event);
	};

	private readonly pointerEnd = (event?: PointerEvent): void => {
		const id = this.press?.id;
		this.pointer = undefined;
		this.press = undefined;
		for (const canvas of [this.canvas, this.snowCanvas]) {
			if (id !== undefined && canvas?.hasPointerCapture(id)) {
				canvas.releasePointerCapture(id);
			}
		}
		if (
			!event ||
			event.type === "pointerleave" ||
			event.type === "pointercancel"
		) {
			this.hover = undefined;
		}
		this.updateCursor();
	};

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.stop();
		this.rendererBuild?.abort();
		this.rendererBuild = undefined;
		this.renderer?.dispose();
		this.renderer = undefined;
		if (this.floorTileUrl !== undefined) {
			URL.revokeObjectURL(this.floorTileUrl);
			this.floorTileUrl = undefined;
		}
	}
}
