import {
	HEIGHT,
	GROUND_Y,
	SOIL_BOTTOM_FADE,
	SOIL_OPACITY,
	SOIL_MATERIAL,
	createMasks,
	growthAt,
	type BloomHeroRenderer,
	type BloomHeroGrid,
} from "./BloomHeroRenderer";

export class BloomHeroCanvas2D implements BloomHeroRenderer {
	readonly masks: readonly CanvasRenderingContext2D[];

	private readonly context: CanvasRenderingContext2D;

	private readonly cells = document.createElement("canvas");

	private readonly cellContext: CanvasRenderingContext2D;

	private readonly cellPixels: ImageData;

	private readonly coverage: Float32Array;

	private readonly ownership: Uint8Array;

	private readonly shading: Float32Array;

	private glyphs?: HTMLCanvasElement;

	constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly grid: BloomHeroGrid,
		private readonly materialOrder: readonly number[],
	) {
		const { columns, rows } = grid;
		// Canvas antialiasing integrates coverage directly into each glyph cell.
		// The GPU renderer supersamples; doing that in JS costs nine times the reads.
		this.masks = createMasks(grid, true, 1);
		this.cellPixels = new ImageData(columns, rows);
		this.coverage = new Float32Array(columns * rows);
		this.ownership = new Uint8Array(columns * rows);
		this.shading = new Float32Array(columns * rows);
		this.context = canvas.getContext("2d")!;
		this.cells.width = columns;
		this.cells.height = rows;
		this.cellContext = this.cells.getContext("2d")!;
	}

	setGlyphs(glyphs: HTMLCanvasElement): void {
		this.glyphs = glyphs;
		this.canvas.width = glyphs.width;
		this.canvas.height = glyphs.height;
		this.context.setTransform(
			glyphs.width / this.grid.width,
			0,
			0,
			glyphs.height / HEIGHT,
			0,
			0,
		);
	}

	draw(palette: Uint8ClampedArray): void {
		if (!this.glyphs) {
			return;
		}
		const { columns, rows, cellHeight } = this.grid;
		this.coverage.fill(0);
		this.ownership.fill(0);
		for (const candidate of this.materialOrder) {
			const pixels = this.masks[candidate]!.getImageData(
				0,
				0,
				columns,
				rows,
			).data;
			for (let i = 0; i < this.coverage.length; i += 1) {
				const alpha = pixels[i * 4 + 3]!;
				if (alpha === 0) {
					continue;
				}
				this.coverage[i]! += (1 - this.coverage[i]!) * (alpha / 255);
				// Keep frontmost material ownership separate from alpha compositing.
				this.ownership[i] = candidate;
				this.shading[i] = pixels[i * 4]! / 255;
			}
		}
		for (let i = 0; i < columns * rows; i += 1) {
			const material = this.ownership[i]!;
			const cell = i * 4;
			const paint = material * 4;
			const y = (Math.floor(i / columns) + 0.5) * cellHeight;
			const floorFade =
				y >= GROUND_Y - cellHeight
					? 1 -
						SOIL_BOTTOM_FADE * growthAt((y - GROUND_Y) / (HEIGHT - GROUND_Y))
					: 1;
			const opacity =
				material === 0
					? 0
					: this.coverage[i]! *
						floorFade *
						(material === SOIL_MATERIAL ? SOIL_OPACITY : 1);
			const shade = this.shading[i]!;
			this.cellPixels.data[cell] =
				palette[0]! + (palette[paint]! - palette[0]!) * shade;
			this.cellPixels.data[cell + 1] =
				palette[1]! + (palette[paint + 1]! - palette[1]!) * shade;
			this.cellPixels.data[cell + 2] =
				palette[2]! + (palette[paint + 2]! - palette[2]!) * shade;
			this.cellPixels.data[cell + 3] = opacity * 255;
		}
		this.cellContext.putImageData(this.cellPixels, 0, 0);
		this.context.clearRect(0, 0, this.grid.width, HEIGHT);
		this.context.imageSmoothingEnabled = false;
		this.context.drawImage(this.cells, 0, 0, this.grid.width, HEIGHT);
		// Coverage changes whole-cell opacity, never the outline of a glyph.
		this.context.save();
		this.context.resetTransform();
		this.context.globalCompositeOperation = "destination-in";
		this.context.drawImage(this.glyphs, 0, 0);
		this.context.restore();
	}

	dispose(): void {
		this.context.clearRect(0, 0, this.grid.width, HEIGHT);
	}
}
