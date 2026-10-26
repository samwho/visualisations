import { css, html, LitElement, svg, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";

/** Keep colour slots in stable order, toggling active rather than removing them. */
export interface RingSegment {
	colour: string;
	active: boolean;
}

export type RingLineCap = "butt" | "round" | "square";

interface RingLayer {
	segments: readonly RingSegment[];
	visible: boolean;
}

function segmentStyle(
	segment: RingSegment,
	rank: number,
	count: number,
	lineCap: RingLineCap,
): string {
	const sector = 360 / count;
	const length = count === 1 ? 360 : sector - 14;
	const offset = -rank * sector - 7;
	return `stroke: ${segment.colour}; stroke-dasharray: ${length} ${360 - length}; stroke-dashoffset: ${offset}; stroke-linecap: ${count === 1 ? "butt" : lineCap}`;
}

@customElement("s-segmented-ring")
export class SegmentedRing extends LitElement {
	/** Stroke width in CSS pixels. */
	@property({ type: Number, attribute: "stroke-width" }) strokeWidth = 2;

	/** Caps for partial arcs; a complete circle uses butt to avoid a seam. */
	@property({ attribute: "line-cap" }) lineCap: RingLineCap = "round";

	@property({ attribute: false }) segments: readonly RingSegment[] = [];

	private readonly layers: [RingLayer, RingLayer] = [
		{ segments: [], visible: false },
		{ segments: [], visible: false },
	];

	private activeLayer: 0 | 1 = 0;

	static override styles = css`
		:host {
			display: block;
			position: relative;
			pointer-events: none;
		}
		svg {
			display: block;
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			overflow: visible;
			opacity: 0;
			transition: opacity 180ms ease;
		}
		svg.visible {
			opacity: 1;
		}
		circle {
			cx: 50%;
			cy: 50%;
			r: calc(50% - var(--ring-half-width));
			fill: none;
			stroke-width: var(--ring-stroke-width);
			transform: rotate(-90deg);
			transform-origin: center;
		}
		@media (prefers-reduced-motion: reduce) {
			svg {
				transition: none;
			}
		}
	`;

	protected override willUpdate(changed: PropertyValues<this>): void {
		if (!changed.has("segments")) {
			return;
		}
		const previousColours = (changed.get("segments") ?? [])
			.filter((segment) => segment.active)
			.map((segment) => segment.colour);
		const nextColours = this.segments
			.filter((segment) => segment.active)
			.map((segment) => segment.colour);
		if (
			previousColours.length === nextColours.length &&
			previousColours.every((colour, index) => colour === nextColours[index])
		) {
			return;
		}
		const current = this.layers[this.activeLayer];
		current.visible = false;
		if (nextColours.length === 0) {
			return;
		}
		this.activeLayer = this.activeLayer === 0 ? 1 : 0;
		const incoming = this.layers[this.activeLayer];
		incoming.segments = this.segments;
		incoming.visible = true;
	}

	private renderLayer(layer: RingLayer) {
		const activeSegments = layer.segments.filter((segment) => segment.active);
		const circles = activeSegments.map((segment, rank) => {
			return svg`<circle
				pathLength="360"
				style=${segmentStyle(segment, rank, activeSegments.length, this.lineCap)}
			></circle>`;
		});
		return html`<svg
			class=${layer.visible ? "visible" : ""}
			style=${`--ring-half-width: ${this.strokeWidth / 2}px; --ring-stroke-width: ${this.strokeWidth}px`}
			aria-hidden="true"
		>
			${circles}
		</svg>`;
	}

	protected override render() {
		return html`${this.layers.map((layer) => this.renderLayer(layer))}`;
	}
}
