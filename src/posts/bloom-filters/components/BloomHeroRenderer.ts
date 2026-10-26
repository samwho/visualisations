// The canvas scales this world uniformly by height and crops its sides on narrow screens.
export const WIDTH = 800;
export const HEIGHT = 350;
export const WORLD_WIDTH = 1600;
export const GROUND_Y = 335;
export const CELL_WIDTH = 5;
export const CELL_HEIGHT = 7;
export const COLUMNS = WIDTH / CELL_WIDTH;
export const ROWS = HEIGHT / CELL_HEIGHT;
export const MASK_SCALE = 3;
export const SOIL_SPEED = 250;
export const SOIL_DELAY = 0.1;
export const SOIL_FADE_DURATION = 0.32;
export const SOIL_BOTTOM_FADE = 0.7;
export const SOIL_OPACITY = 0.8;
export const SOIL_MATERIAL = 9;

// Each material owns a separate mask; overlapping shapes cannot blend material IDs.
export const materials = [
	// Geometry reserves slot zero for empty cells; its colour is the crease backdrop.
	{ token: "--color-surface-band" },
	{ token: "--hero-foliage" },
	{ token: "--hero-flower-1" },
	{ token: "--hero-flower-2" },
	{ token: "--hero-flower-3" },
	{ token: "--hero-flower-4" },
	{ token: "--hero-flower-5" },
	{ token: "--hero-flower-6" },
	{ token: "--hero-flower-7" },
	{ token: "--hero-soil" },
];

export interface BloomHeroRenderer {
	readonly masks: readonly CanvasRenderingContext2D[];
	setGlyphs(glyphs: HTMLCanvasElement): void;
	draw(palette: Uint8ClampedArray, elapsed: number): void;
	dispose(): void;
}

export function growthAt(time: number): number {
	const progress = Math.max(0, Math.min(1, time));
	return progress * progress * (3 - 2 * progress);
}

export function soilArrival(x: number, width = WIDTH): number {
	return SOIL_DELAY + Math.abs(x - width / 2) / SOIL_SPEED;
}

export interface BloomHeroGrid {
	readonly width: number;
	readonly scale: number;
	readonly columns: number;
	readonly rows: number;
	readonly cellWidth: number;
	readonly cellHeight: number;
}

// Every render pass uses these same cell boundaries, including rounded row counts.
export function createGrid(scale: number, width = WIDTH): BloomHeroGrid {
	const columns = Math.ceil(width / CELL_WIDTH / scale);
	const rows = Math.ceil(ROWS / scale);
	return {
		width,
		scale,
		columns,
		rows,
		cellWidth: width / columns,
		cellHeight: HEIGHT / rows,
	};
}

export function createMask(
	grid: BloomHeroGrid,
	willReadFrequently: boolean,
	sampleSide = MASK_SCALE,
): CanvasRenderingContext2D {
	const canvas = document.createElement("canvas");
	canvas.width = grid.columns * sampleSide;
	canvas.height = grid.rows * sampleSide;
	return canvas.getContext("2d", { willReadFrequently })!;
}

export function createMasks(
	grid: BloomHeroGrid,
	willReadFrequently: boolean,
	sampleSide = MASK_SCALE,
): CanvasRenderingContext2D[] {
	return materials.map(() => createMask(grid, willReadFrequently, sampleSide));
}

function createGlyphAtlas(
	grid: BloomHeroGrid,
	scaleX: number,
	scaleY: number,
): HTMLCanvasElement {
	const { cellWidth, cellHeight } = grid;
	const glyphWidth = Math.ceil(cellWidth * scaleX);
	const glyphHeight = Math.ceil(cellHeight * scaleY);
	const atlas = document.createElement("canvas");
	atlas.width = glyphWidth * 2;
	atlas.height = glyphHeight;
	const ink = atlas.getContext("2d")!;
	ink.setTransform(scaleX, 0, 0, scaleY, 0, 0);
	ink.font = `900 ${cellHeight * 0.93}px system-ui`;
	ink.textAlign = "center";
	ink.textBaseline = "alphabetic";
	const zero = ink.measureText("0");
	const one = ink.measureText("1");
	// Centre actual ink; some monospace fonts spill across a colour row.
	const baseline =
		(Math.max(zero.actualBoundingBoxAscent, one.actualBoundingBoxAscent) -
			Math.max(zero.actualBoundingBoxDescent, one.actualBoundingBoxDescent)) /
		2;
	ink.fillStyle = "white";
	for (let digit = 0; digit < 2; digit += 1) {
		ink.save();
		ink.beginPath();
		ink.rect(digit * cellWidth, 0, cellWidth, cellHeight);
		ink.clip();
		ink.fillText(
			String(digit),
			(digit + 0.5) * cellWidth,
			cellHeight / 2 + baseline,
		);
		ink.restore();
	}
	return atlas;
}

export async function createGlyphs(
	width: number,
	height: number,
	grid: BloomHeroGrid,
): Promise<HTMLCanvasElement> {
	const { columns, rows } = grid;
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d")!;
	const atlas = createGlyphAtlas(grid, width / grid.width, height / HEIGHT);
	const glyphWidth = atlas.width / 2;
	const glyphHeight = atlas.height;
	// Rasterize each digit once, rather than clipping and shaping text in every cell.
	let sliceStart = performance.now();
	for (let i = 0; i < columns * rows; i += 1) {
		const column = i % columns;
		const row = Math.floor(i / columns);
		// Integer backing-pixel clips keep antialiasing inside each glyph cell.
		const left = Math.ceil((column * width) / columns - 0.5);
		const top = Math.ceil((row * height) / rows - 0.5);
		const right = Math.ceil(((column + 1) * width) / columns - 0.5);
		const bottom = Math.ceil(((row + 1) * height) / rows - 0.5);
		const digit = (Math.imul(i + 1, 2654435761) >>> 16) & 1;
		context.drawImage(
			atlas,
			digit * glyphWidth,
			0,
			glyphWidth,
			glyphHeight,
			left,
			top,
			right - left,
			bottom - top,
		);
		if (
			i + 1 < columns * rows &&
			(i + 1) % columns === 0 &&
			performance.now() - sliceStart >= 4
		) {
			// eslint-disable-next-line no-await-in-loop -- Yield between drawing slices, not after all rasterization.
			await new Promise<void>((resolve) => {
				requestAnimationFrame(() => resolve());
			});
			sliceStart = performance.now();
		}
	}
	return canvas;
}
