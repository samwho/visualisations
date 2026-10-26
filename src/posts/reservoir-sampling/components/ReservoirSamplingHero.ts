// Direct module imports avoid Matter's prebundled renderer and other utilities.
import Bodies from "matter-js/src/factory/Bodies";
import Composite from "matter-js/src/body/Composite";
import Constraint from "matter-js/src/constraint/Constraint";
import Engine from "matter-js/src/core/Engine";
import Sleeping from "matter-js/src/core/Sleeping";
import type { Body } from "matter-js";
import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { FrameController } from "../../../shared/core/controllers/FrameController";
import { ResizeController } from "../../../shared/core/controllers/ResizeController";
import { prefersReducedMotion } from "../../../shared/Accessibility";
import { SimpleReservoir } from "../core/Samplers";
import { suits } from "../core/Cards";
import { SUITS_BY_NAME } from "../core/CardDeck";

import {
	seasonalPalette,
	seasonalPaletteColours,
	type SeasonalPalette,
} from "../../../shared/core/SeasonalPalette";

const PHYSICS_STEP_MS = 1000 / 60;
const MAX_FRAME_DELTA_MS = 1000 / 30;

interface Particle {
	body: Body;
	color: string;
	seasonalColour: number;
	path: string;
}

@customElement("s-reservoir-sampling-hero")
export class ReservoirSamplingHero extends LitElement {
	@property({ reflect: true, attribute: "data-palette" })
	palette: SeasonalPalette = seasonalPalette();

	@state() private particles: Particle[] = [];

	@state() private width = 800;

	@state() private height = 300;

	@state() private selected: Particle[] = [];

	private elements: SVGGElement[] = [];

	private engine?: Engine;

	private elapsed = 0;

	private walls: Body[] = [];

	private reservoir = new SimpleReservoir<Particle>(3);

	private timer?: number;

	private dragging?: Constraint;

	private pointer?: { id: number; element: SVGPathElement };

	private readonly frames = new FrameController(this);

	private readonly timeline = this.frames.timeline;

	constructor() {
		super();
		const resize = new ResizeController(this);
		resize.addEventListener("resize", () => this.resize());

		this.timeline.addEventListener("resume", () => this.initialize());
		this.timeline.addEventListener("pause", () => this.pointerUp());
		this.frames.addEventListener("update", (event) => {
			// SAFETY: FrameController emits update with this timeline delta.
			const { deltaMs } = (event as CustomEvent<{ deltaMs: number }>).detail;
			if (!this.engine) {
				return;
			}
			// Matter needs fixed steps; discard stalled time but carry fractional steps forward.
			this.elapsed += Math.min(deltaMs, MAX_FRAME_DELTA_MS);
			while (this.elapsed >= PHYSICS_STEP_MS) {
				Engine.update(this.engine, PHYSICS_STEP_MS);
				this.elapsed -= PHYSICS_STEP_MS;
			}
		});
		this.frames.addEventListener("draw", this.draw);
	}

	// Outer sizing lives in static/css/posts/reservoir-sampling.css; resize() reads that reserved box.
	static override styles = css`
		:host {
			overflow: hidden;
		}
		svg {
			display: block;
			width: 100%;
			height: 100%;
			touch-action: pan-y;
		}
		.particle {
			touch-action: none;
		}
		[data-particle] {
			cursor: pointer;
		}
		.selection-mark {
			color: color-mix(in srgb, currentColor 55%, var(--color-surface-band));
			pointer-events: none;
		}
		.selection-border {
			fill: none;
			stroke: currentColor;
			stroke-width: 4;
			stroke-linejoin: round;
		}
		.selection-dot {
			fill: currentColor;
		}
	`;

	protected override firstUpdated(): void {
		this.resize();
		this.start();
	}

	protected override updated(): void {
		this.elements = [
			...this.renderRoot.querySelectorAll<SVGGElement>(".particle-body"),
		];
	}

	private resize(): void {
		this.width = this.clientWidth || 800;
		this.height = this.clientHeight || 300;
		if (!this.engine) {
			return;
		}
		for (const wall of this.walls) {
			Composite.remove(this.engine.world, wall);
		}
		this.walls = [
			Bodies.rectangle(this.width / 2, this.height + 150, this.width, 300, {
				isStatic: true,
			}),
			Bodies.rectangle(-150, this.height / 2, 300, 100000, { isStatic: true }),
			Bodies.rectangle(this.width + 150, this.height / 2, 300, 100000, {
				isStatic: true,
			}),
		];
		Composite.add(this.engine.world, this.walls);
		this.frames.requestDraw();
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.start();
	}

	private start(): void {
		if (this.isConnected) {
			this.timeline.resume();
		}
	}

	private initialize(): void {
		if (!this.engine) {
			this.engine = Engine.create({
				enableSleeping: true,
				velocityIterations: 1,
				positionIterations: 1,
				constraintIterations: 1,
			});
			this.resize();
		}
		if (prefersReducedMotion()) {
			// Show a settled sample without continually dropping or moving artwork.
			if (this.particles.length === 0) {
				for (let i = 0; i < 50; i += 1) {
					this.addParticle(true);
				}
			}
			this.timeline.pause();
			this.frames.requestDraw();
			return;
		}
		if (this.particles.length < 50 && this.timer === undefined) {
			this.addParticle(false);
			this.timer = this.timeline.setInterval(
				() => this.addParticle(false),
				200,
			);
		}
	}

	private readonly draw = (): void => {
		for (const [index, particle] of this.particles.entries()) {
			if (particle.body.isSleeping) {
				continue;
			}
			this.elements[index]?.setAttribute(
				"transform",
				`translate(${particle.body.position.x} ${particle.body.position.y}) rotate(${(particle.body.angle * 180) / Math.PI})`,
			);
		}
	};

	private addParticle(settled: boolean): void {
		if (!this.engine || this.particles.length >= 50) {
			if (this.timer !== undefined) {
				this.timeline.clearInterval(this.timer);
				this.timer = undefined;
			}
			return;
		}
		const suit =
			SUITS_BY_NAME[suits[Math.floor(Math.random() * suits.length)]!];
		const size = 38 + Math.random() * 6;
		const half = size / 2;
		const index = this.particles.length;
		const x = settled
			? this.width / 2 + ((index % 10) - 4.5) * Math.min(50, this.width / 11)
			: this.width / 2 + Math.random() * 200 - 100;
		const y = settled ? this.height - 25 - Math.floor(index / 10) * 35 : -50;
		const opts = { restitution: 0.2, friction: 0.1, density: 0.001 };
		const body =
			suit.symbol === "circle"
				? Bodies.circle(x, y, half, opts)
				: suit.symbol === "square"
					? Bodies.rectangle(x, y, size, size, opts)
					: Bodies.fromVertices(
							x,
							y,
							[
								suit.symbol === "triangle"
									? [
											{ x: 0, y: -half },
											{ x: half, y: half },
											{ x: -half, y: half },
										]
									: [
											{ x: 0, y: -half },
											{ x: half, y: 0 },
											{ x: 0, y: half },
											{ x: -half, y: 0 },
										],
							],
							opts,
						);
		const path =
			suit.symbol === "circle"
				? `M${-half} 0 A${half} ${half} 0 1 0 ${half} 0 A${half} ${half} 0 1 0 ${-half} 0 Z`
				: body.vertices
						.map((v, i) => `${i === 0 ? "M" : "L"}${v.x - x} ${v.y - y}`)
						.join(" ") + " Z";
		const particle = {
			body,
			path,
			color: suit.color,
			seasonalColour:
				this.palette === "normal"
					? index % 6
					: Math.floor(
							Math.random() * seasonalPaletteColours[this.palette].length,
						),
		};
		this.particles = [...this.particles, particle];
		this.reservoir.sample(particle);
		this.selected = [...this.reservoir.items];
		Composite.add(this.engine.world, body);
	}

	private readonly pointerDown = (event: PointerEvent): void => {
		if (
			!event.isPrimary ||
			this.pointer !== undefined ||
			event.button !== 0 ||
			prefersReducedMotion() ||
			!this.engine
		) {
			return;
		}
		const element = event.target;
		if (!(element instanceof SVGPathElement)) {
			return;
		}
		const { body } = this.particles[Number(element.dataset.particle)]!;
		const rect = this.getBoundingClientRect();
		const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
		const options = {
			pointA: point,
			bodyB: body,
			pointB: { x: point.x - body.position.x, y: point.y - body.position.y },
			length: 0,
			stiffness: 0.2,
			angularStiffness: 1,
		};
		this.dragging = Constraint.create(options);
		Sleeping.set(body, false);
		Composite.add(this.engine.world, this.dragging);
		this.pointer = { id: event.pointerId, element };
		element.setPointerCapture(event.pointerId);
	};

	private readonly pointerMove = (event: PointerEvent): void => {
		if (!this.dragging || event.pointerId !== this.pointer?.id) {
			return;
		}
		const rect = this.getBoundingClientRect();
		this.dragging.pointA = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
		Sleeping.set(this.dragging.bodyB!, false);
	};

	private readonly pointerUp = (event?: PointerEvent): void => {
		if (event && event.pointerId !== this.pointer?.id) {
			return;
		}
		const pointer = this.pointer;
		this.pointer = undefined;
		if (pointer?.element.hasPointerCapture(pointer.id)) {
			pointer.element.releasePointerCapture(pointer.id);
		}
		if (this.dragging && this.engine) {
			Composite.remove(this.engine.world, this.dragging);
		}
		this.dragging = undefined;
	};

	private particleColour(particle: Particle): string {
		if (this.palette === "normal") {
			return particle.color;
		}
		const colours = seasonalPaletteColours[this.palette];
		return colours[particle.seasonalColour % colours.length]!;
	}

	protected override render() {
		return html`<svg
			viewBox=${`0 0 ${this.width} ${this.height}`}
			aria-hidden="true"
			@pointerdown=${this.pointerDown}
			@pointermove=${this.pointerMove}
			@pointerup=${this.pointerUp}
			@pointercancel=${this.pointerUp}
			@lostpointercapture=${this.pointerUp}
		>
			${this.particles.map(
				(particle, i) => svg`<g class="particle">
					<g class="particle-body" color=${this.particleColour(particle)}
						transform=${`translate(${particle.body.position.x} ${particle.body.position.y}) rotate(${(particle.body.angle * 180) / Math.PI})`}>
						<path data-particle=${i} d=${particle.path} fill=${this.particleColour(particle)}></path>
						${
							this.selected.includes(particle)
								? svg`
							<defs><clipPath id=${`particle-clip-${particle.body.id}`} clipPathUnits="userSpaceOnUse">
								<path d=${particle.path}></path>
							</clipPath></defs>
							<g class="selection-mark" clip-path=${`url(#particle-clip-${particle.body.id})`}>
								<!-- Clip away the outer half of the centred stroke to preserve the silhouette. -->
								<path class="selection-border" d=${particle.path}></path>
								<circle class="selection-dot" cx="0" cy="0" r="2.5"></circle>
							</g>`
								: nothing
						}
					</g>
				</g>`,
			)}
		</svg>`;
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.pointerUp();
		this.timer = undefined;
		if (this.engine) {
			Composite.clear(this.engine.world, false);
			Engine.clear(this.engine);
		}
		this.engine = undefined;
		this.elapsed = 0;
		this.particles = [];
		this.elements = [];
		this.selected = [];
		this.reservoir.reset();
	}
}
