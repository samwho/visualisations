import {
	FLAP_DURATION as TURN_DURATION,
	CLEAR_DURATION,
	type HeroBit,
} from "../model/HeroCascade";

interface Paint {
	background: string;
	foreground: string;
}

export interface HeroCanvasStyle {
	width: number;
	height: number;
	pixelRatio: number;
	bits: number;
	font: string;
	plain: Paint;
	highlights: Paint[];
	page: string;
	separator: string;
}

interface Turn {
	sequence: number;
	started: number;
}

function easing(x1: number, y1: number, x2: number, y2: number) {
	const values = new Float32Array(257);
	const cubic = (t: number, a: number, b: number) =>
		3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;

	for (let i = 0; i <= 256; i++) {
		let low = 0;
		let high = 1;
		for (let j = 0; j < 16; j++) {
			const t = (low + high) / 2;
			if (cubic(t, x1, x2) < i / 256) {
				low = t;
			} else {
				high = t;
			}
		}
		values[i] = cubic((low + high) / 2, y1, y2);
	}
	return (progress: number) => {
		const position = Math.max(0, Math.min(1, progress)) * 256;
		const index = Math.floor(position);
		return (
			values[index]! +
			(values[Math.min(256, index + 1)]! - values[index]!) * (position - index)
		);
	};
}

const fold = easing(0.45, 0, 0.8, 0.5);
const unfold = easing(0.2, 0.5, 0.4, 1);
const clear = easing(0, 0, 0.58, 1);
const GAP = 4;

/** Rasterise glyphs once per size/theme, not once per frame or per leaf. */
export class HeroCanvas {
	private readonly context: CanvasRenderingContext2D;

	private style?: HeroCanvasStyle;

	private styleKey = "";

	private plain: HTMLCanvasElement[] = [];

	private highlights: HTMLCanvasElement[][] = [];

	private readonly turns: Turn[][];

	private dirty = true;

	private animating = false;

	constructor(
		private readonly canvas: HTMLCanvasElement,
		cells: HeroBit[][],
	) {
		this.context = canvas.getContext("2d")!;
		this.turns = cells.map((row) =>
			row.map(() => ({ sequence: -1, started: 0 })),
		);
	}

	configure(style: HeroCanvasStyle): void {
		const key = JSON.stringify(style);
		if (key === this.styleKey || style.width <= 0 || style.height <= 0) {
			return;
		}
		this.styleKey = key;
		this.style = style;
		this.canvas.width = Math.round(style.width * style.pixelRatio);
		this.canvas.height = Math.round(style.height * style.pixelRatio);
		this.context.setTransform(style.pixelRatio, 0, 0, style.pixelRatio, 0, 0);
		const width = (style.width - GAP * (style.bits - 1)) / style.bits;
		const height = (style.height - GAP * 5) / 6;
		const card = (value: number, paint: Paint) => {
			const image = document.createElement("canvas");
			image.width = Math.ceil(width * style.pixelRatio);
			image.height = Math.ceil(height * style.pixelRatio);
			const context = image.getContext("2d")!;
			context.scale(style.pixelRatio, style.pixelRatio);
			context.fillStyle = paint.background;
			context.beginPath();
			context.roundRect(0, 0, width, height, 3);
			context.fill();
			context.font = style.font;
			context.fillStyle = paint.foreground;
			context.textAlign = "center";
			const metrics = context.measureText("0");
			context.fillText(
				String(value),
				width / 2,
				(height +
					metrics.fontBoundingBoxAscent -
					metrics.fontBoundingBoxDescent) /
					2,
			);
			context.fillStyle = style.page;
			context.fillRect(0, height / 2 - 0.5, width, 1);
			context.fillStyle = style.separator;
			context.fillRect(0, height / 2 - 0.5, width, 1);
			return image;
		};

		this.plain = [card(0, style.plain), card(1, style.plain)];
		this.highlights = style.highlights.map((paint) => [
			card(0, paint),
			card(1, paint),
		]);
		this.dirty = true;
	}

	paint(cells: HeroBit[][], time: number, reduced: boolean): void {
		const style = this.style;
		if (!style) {
			return;
		}
		const first = cells[0]!.length - style.bits;
		for (const [row, bits] of cells.entries()) {
			for (let column = first; column < bits.length; column++) {
				const cell = bits[column]!;
				const turn = this.turns[row]![column]!;
				if (reduced) {
					turn.started = time - TURN_DURATION;
				}
				if (turn.sequence !== cell.sequence) {
					turn.started =
						reduced || turn.sequence === -1 ? time - TURN_DURATION : time;
					turn.sequence = cell.sequence;
					this.dirty = true;
				}
			}
		}
		if (!this.dirty && !this.animating) {
			return;
		}
		this.dirty = this.animating = false;
		const ctx = this.context;
		const width = (style.width - GAP * (style.bits - 1)) / style.bits;
		const height = (style.height - GAP * 5) / 6;
		const half = height / 2;
		const sourceWidth = width * style.pixelRatio;
		const sourceHeight = height * style.pixelRatio;
		ctx.clearRect(0, 0, style.width, style.height);
		const face = (row: number, value: number, highlighted: boolean) =>
			(highlighted ? this.highlights[row]! : this.plain)[value]!;

		const drawHalf = (
			image: HTMLCanvasElement,
			bottom: boolean,
			x: number,
			y: number,
			scale = 1,
		) => {
			if (scale <= 0.0001) {
				return;
			}
			if (scale >= 0.9999) {
				ctx.drawImage(
					image,
					0,
					bottom ? sourceHeight / 2 : 0,
					sourceWidth,
					sourceHeight / 2,
					x,
					bottom ? y + half : y,
					width,
					half,
				);
				return;
			}
			// Four strips approximate the original 150px perspective without
			// maintaining a separate composited DOM layer for every rotating leaf.
			const sine = Math.sqrt(1 - scale * scale);
			for (let strip = 0; strip < 4; strip++) {
				const from = strip / 4;
				const to = (strip + 1) / 4;
				const distance1 = half * (bottom ? from : from - 1);
				const distance2 = half * (bottom ? to : to - 1);
				const factor1 = 150 / (150 - Math.abs(distance1) * sine);
				const factor2 = 150 / (150 - Math.abs(distance2) * sine);
				const factor = (factor1 + factor2) / 2;
				const top = distance1 * scale * factor1;
				const end = distance2 * scale * factor2;
				ctx.drawImage(
					image,
					0,
					(bottom ? sourceHeight / 2 : 0) + (from * sourceHeight) / 2,
					sourceWidth,
					sourceHeight / 8,
					x + (width * (1 - factor)) / 2,
					y + half + top,
					width * factor,
					end - top,
				);
			}
		};

		const paintCell = (
			cell: HeroBit,
			row: number,
			x: number,
			y: number,
			elapsed: number,
		) => {
			const duration =
				cell.previous === cell.value ? CLEAR_DURATION : TURN_DURATION;
			const next = face(row, cell.value, cell.highlighted);
			if (elapsed >= duration) {
				ctx.drawImage(
					next,
					0,
					0,
					sourceWidth,
					sourceHeight,
					x,
					y,
					width,
					height,
				);
				return false;
			}
			this.animating = true;
			const previous = face(row, cell.previous, cell.previousHighlighted);
			if (cell.previous === cell.value) {
				ctx.drawImage(
					next,
					0,
					0,
					sourceWidth,
					sourceHeight,
					x,
					y,
					width,
					height,
				);
				ctx.globalAlpha = 1 - clear(elapsed / CLEAR_DURATION);
				ctx.drawImage(
					previous,
					0,
					0,
					sourceWidth,
					sourceHeight,
					x,
					y,
					width,
					height,
				);
				ctx.globalAlpha = 1;
				return false;
			}
			drawHalf(next, false, x, y);
			drawHalf(previous, true, x, y);
			const topScale = Math.cos(
				(fold(elapsed / (TURN_DURATION / 2)) * Math.PI) / 2,
			);
			drawHalf(previous, false, x, y, topScale);
			const bottomScale = Math.sin(
				(unfold((elapsed - TURN_DURATION / 2) / (TURN_DURATION / 2)) *
					Math.PI) /
					2,
			);
			drawHalf(next, true, x, y, bottomScale);
			return true;
		};

		for (const [row, bits] of cells.entries()) {
			for (let column = first; column < bits.length; column++) {
				const cell = bits[column]!;
				const x = (column - first) * (width + GAP);
				const y = row * (height + GAP);
				const elapsed = reduced
					? TURN_DURATION
					: time - this.turns[row]![column]!.started;
				if (paintCell(cell, row, x, y, elapsed)) {
					// The hinge stays above rotating leaves; settled cards already cache it.
					ctx.fillStyle = style.page;
					ctx.fillRect(x, y + half - 0.5, width, 1);
					ctx.fillStyle = style.separator;
					ctx.fillRect(x, y + half - 0.5, width, 1);
				}
			}
		}
	}
}
