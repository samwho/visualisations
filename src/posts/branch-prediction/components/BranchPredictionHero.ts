import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { prefersReducedMotion } from "../../../shared/Accessibility";
import { ResizeController } from "../../../shared/core/controllers/ResizeController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import { AnimationController } from "../../../shared/core/controllers/AnimationController";
import { TimelineController } from "../../../shared/core/controllers/TimelineController";

interface Branch {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	depth: number;
	isTerminal: boolean; // true if this branch ends at the edge
	parentIndex?: number;
}

@customElement("s-branch-prediction-hero")
export class BranchPredictionHero extends LitElement {
	private readonly visibility = new VisibilityController(this);

	private readonly timeline = new TimelineController(this, this.visibility);

	private readonly animations = new AnimationController(this, this.timeline);

	private generation = 0;

	constructor() {
		super();
		this.timeline.resume();
		const resize = new ResizeController(this);
		resize.addEventListener("resize", () => this.updateViewBox());

		this.visibility.addEventListener("visible", () => {
			this.updateViewBox();
		});
	}

	@property({ type: Boolean, reflect: true })
	debug = false;

	@query("svg")
	private svgElement?: SVGSVGElement;

	private circleLayer?: SVGGElement;

	private lineLayer?: SVGGElement;

	private hasInitialized = false;

	private branches: Branch[] = [];

	// Intersection checks are quadratic; cap decorative tree generation.
	private readonly maxBranches = 512;

	// Tree generation parameters
	private readonly viewBoxWidth = 1600;

	private viewBoxHeight = 900;

	private readonly branchLength = 120;

	private readonly branchLengthVariance = 0.3; // 0-1, how much length can vary

	private readonly branchAngle = Math.PI / 11;

	private readonly branchAngleVariance = 0.5; // 0-1, how much angle can vary

	private readonly maxDepth = 30;

	private readonly lineDrawSpeed = 200; // viewBox units per second

	private readonly circleRadius = 15;

	private readonly lineWidth = 2;

	private readonly childAngleAttempts = 6;

	private readonly earlyTerminationChance = 0.1;

	private readonly paletteColors = [
		"var(--color-data-fill-red)",
		"var(--color-data-fill-orange)",
		"var(--color-data-fill-yellow)",
		"var(--color-data-fill-green)",
		"var(--color-data-fill-blue)",
		"var(--color-data-fill-dark-blue)",
		"var(--color-data-fill-pink)",
	];

	static override styles = css`
		:host {
			/* Outer sizing lives in static/css/posts/branch-prediction.css to reserve space before upgrade. */
			overflow: hidden;
		}

		svg {
			width: 100%;
			height: 100%;
			display: block;
		}

		line {
			stroke: var(--color-border-chart);
			stroke-linecap: round;
		}
	`;

	override render() {
		return html`<svg
			xmlns="http://www.w3.org/2000/svg"
			preserveAspectRatio="xMinYMid meet"
			part="svg"
			aria-hidden="true"
		></svg>`;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.timeline.resume();
	}

	protected override firstUpdated(): void {
		this.updateViewBox();
	}

	override disconnectedCallback(): void {
		this.generation++;
		this.hasInitialized = false;
		super.disconnectedCallback();
	}

	private updateViewBox() {
		if (!this.svgElement || this.visibility.isHidden) {
			return;
		}
		const rect = this.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) {
			return;
		}

		const newHeight = (this.viewBoxWidth * rect.height) / rect.width;
		const viewBoxChanged = Math.abs(newHeight - this.viewBoxHeight) >= 0.01;
		const viewBoxMissing = !this.svgElement.hasAttribute("viewBox");

		if (!this.hasInitialized || viewBoxChanged || viewBoxMissing) {
			this.viewBoxHeight = newHeight;
			this.svgElement.setAttribute(
				"viewBox",
				`0 0 ${this.viewBoxWidth} ${this.viewBoxHeight}`,
			);
			this.generation++;
			this.animations.cancelAnimations();
			this.svgElement.replaceChildren();
			this.circleLayer = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"g",
			);
			this.lineLayer = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"g",
			);
			this.svgElement.append(this.lineLayer, this.circleLayer);
			this.generateTree();
			this.startAnimation();
			this.hasInitialized = true;
		}
	}

	private generateTree() {
		this.branches = [];

		// Start from the left middle
		const startX = this.circleRadius;
		const startY = this.viewBoxHeight / 2;

		// Generate all branches breadth-first, storing them for animation.
		this.growTreeBreadthFirst(startX, startY);
	}

	private randomize(value: number, variance: number): number {
		const delta = value * variance;
		return value + (Math.random() * 2 - 1) * delta;
	}

	// Check if two line segments intersect (excluding shared endpoints)
	private segmentsIntersect(
		ax1: number,
		ay1: number,
		ax2: number,
		ay2: number,
		bx1: number,
		by1: number,
		bx2: number,
		by2: number,
	): boolean {
		// Skip if segments share an endpoint
		const eps = 0.001;
		if (
			(Math.abs(ax1 - bx1) < eps && Math.abs(ay1 - by1) < eps) ||
			(Math.abs(ax1 - bx2) < eps && Math.abs(ay1 - by2) < eps) ||
			(Math.abs(ax2 - bx1) < eps && Math.abs(ay2 - by1) < eps) ||
			(Math.abs(ax2 - bx2) < eps && Math.abs(ay2 - by2) < eps)
		) {
			return false;
		}

		const d1x = ax2 - ax1;
		const d1y = ay2 - ay1;
		const d2x = bx2 - bx1;
		const d2y = by2 - by1;

		const cross = d1x * d2y - d1y * d2x;
		if (Math.abs(cross) < eps) {
			// Parallel: only intersect if collinear and overlapping.
			const collinear = Math.abs((bx1 - ax1) * d1y - (by1 - ay1) * d1x) < eps;
			if (!collinear) {
				return false;
			}

			const d1Len2 = d1x * d1x + d1y * d1y;
			if (d1Len2 < eps) {
				return false;
			}

			const t0 = ((bx1 - ax1) * d1x + (by1 - ay1) * d1y) / d1Len2;
			const t1 = ((bx2 - ax1) * d1x + (by2 - ay1) * d1y) / d1Len2;
			const tMin = Math.min(t0, t1);
			const tMax = Math.max(t0, t1);

			return tMax > eps && tMin < 1 - eps;
		}

		const dx = bx1 - ax1;
		const dy = by1 - ay1;

		const t = (dx * d2y - dy * d2x) / cross;
		const u = (dx * d1y - dy * d1x) / cross;

		// Check if intersection point is within both segments (exclusive of endpoints)
		return t > eps && t < 1 - eps && u > eps && u < 1 - eps;
	}

	private findIntersectingBranch(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
	): Branch | null {
		for (const branch of this.branches) {
			if (
				this.segmentsIntersect(
					x1,
					y1,
					x2,
					y2,
					branch.x1,
					branch.y1,
					branch.x2,
					branch.y2,
				)
			) {
				return branch;
			}
		}
		return null;
	}

	private intersectsAnySegment(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		segments: Array<{ x1: number; y1: number; x2: number; y2: number }>,
	): boolean {
		for (const segment of segments) {
			if (
				this.segmentsIntersect(
					x1,
					y1,
					x2,
					y2,
					segment.x1,
					segment.y1,
					segment.x2,
					segment.y2,
				)
			) {
				return true;
			}
		}
		return false;
	}

	private isOutOfBounds(x: number, y: number): boolean {
		const padding = this.circleRadius;
		return (
			x > this.viewBoxWidth - padding ||
			x < padding ||
			y > this.viewBoxHeight - padding ||
			y < padding
		);
	}

	private growTreeBreadthFirst(startX: number, startY: number) {
		type GrowNode = {
			x: number;
			y: number;
			angle: number;
			depth: number;
			lengthOverride?: number;
			parentIndex?: number;
		};

		let queue: GrowNode[] = [{ x: startX, y: startY, angle: 0, depth: 0 }];

		while (queue.length > 0 && this.branches.length < this.maxBranches) {
			const depth = queue[0]!.depth;
			const nextQueue: GrowNode[] = [];
			const nextDepthSegments: Array<{
				x1: number;
				y1: number;
				x2: number;
				y2: number;
			}> = [];

			while (
				queue.length > 0 &&
				queue[0]!.depth === depth &&
				this.branches.length < this.maxBranches
			) {
				const node = queue.shift()!;
				if (node.depth > this.maxDepth) {
					continue;
				}

				const length =
					node.lengthOverride ??
					this.randomize(this.branchLength, this.branchLengthVariance);

				const rawEndX = node.x + Math.cos(node.angle) * length;
				const rawEndY = node.y + Math.sin(node.angle) * length;
				let endX = rawEndX;
				let endY = rawEndY;

				const padding = this.circleRadius;
				endX = Math.max(padding, Math.min(this.viewBoxWidth - padding, endX));
				endY = Math.max(padding, Math.min(this.viewBoxHeight - padding, endY));
				const wasClamped = rawEndX !== endX || rawEndY !== endY;

				const isAtMaxDepth = node.depth >= this.maxDepth;
				const allowEarlyTermination = !isAtMaxDepth && node.depth > 0;
				const pickChild = (direction: "up" | "down") => {
					for (let i = 0; i < this.childAngleAttempts; i++) {
						const angleOffset = this.randomize(
							this.branchAngle,
							this.branchAngleVariance,
						);
						const childAngle =
							direction === "up"
								? node.angle - angleOffset
								: node.angle + angleOffset;
						const childLength = this.randomize(
							this.branchLength,
							this.branchLengthVariance,
						);
						const childEndX = endX + Math.cos(childAngle) * childLength;
						const childEndY = endY + Math.sin(childAngle) * childLength;
						const offEdge = this.isOutOfBounds(childEndX, childEndY);
						const intersectingBranch = this.findIntersectingBranch(
							endX,
							endY,
							childEndX,
							childEndY,
						);
						const intersectsPlanned = this.intersectsAnySegment(
							endX,
							endY,
							childEndX,
							childEndY,
							nextDepthSegments,
						);
						if (!offEdge && !intersectingBranch && !intersectsPlanned) {
							return {
								angle: childAngle,
								length: childLength,
								endX: childEndX,
								endY: childEndY,
								offEdge,
								intersect: false,
								intersectingBranch: null,
							};
						}
					}
					return null;
				};

				let upCandidate = isAtMaxDepth ? null : pickChild("up");
				let downCandidate = isAtMaxDepth ? null : pickChild("down");

				if (
					allowEarlyTermination &&
					upCandidate &&
					downCandidate &&
					Math.random() < this.earlyTerminationChance
				) {
					if (Math.random() < 0.5) {
						upCandidate = null;
					} else {
						downCandidate = null;
					}
				}

				const upWouldFail = isAtMaxDepth || upCandidate === null;
				const downWouldFail = isAtMaxDepth || downCandidate === null;
				const isTerminal = upWouldFail && downWouldFail;

				const branchIndex = this.branches.length;
				this.branches.push({
					x1: node.x,
					y1: node.y,
					x2: endX,
					y2: endY,
					depth: node.depth,
					isTerminal,
					parentIndex: node.parentIndex,
				});

				if (this.debug && isTerminal) {
					const payload = {
						depth: node.depth,
						start: { x: node.x, y: node.y },
						end: { x: endX, y: endY },
						rawEnd: { x: rawEndX, y: rawEndY },
						length,
						wasClamped,
						maxDepthReached: isAtMaxDepth,
						up: upCandidate,
						down: downCandidate,
					};
					console.debug(
						"[BranchPredictionHero] terminal branch",
						JSON.stringify(payload),
					);
				}

				if (!isTerminal) {
					const children: Array<{
						angle: number;
						length: number;
						endX: number;
						endY: number;
					}> = [];
					if (upCandidate) {
						children.push({
							angle: upCandidate.angle,
							length: upCandidate.length,
							endX: upCandidate.endX,
							endY: upCandidate.endY,
						});
					}
					if (downCandidate) {
						children.push({
							angle: downCandidate.angle,
							length: downCandidate.length,
							endX: downCandidate.endX,
							endY: downCandidate.endY,
						});
					}
					if (children.length === 2 && Math.random() < 0.5) {
						children.reverse();
					}
					for (const child of children) {
						nextDepthSegments.push({
							x1: endX,
							y1: endY,
							x2: child.endX,
							y2: child.endY,
						});
						nextQueue.push({
							x: endX,
							y: endY,
							angle: child.angle,
							depth: node.depth + 1,
							lengthOverride: child.length,
							parentIndex: branchIndex,
						});
					}
				}
			}

			queue = nextQueue;
		}
	}

	private colorForX(x: number): string {
		const clampedX = Math.max(0, Math.min(this.viewBoxWidth, x));
		const segmentWidth = this.viewBoxWidth / this.paletteColors.length;
		const index = Math.min(
			this.paletteColors.length - 1,
			Math.floor(clampedX / segmentWidth),
		);
		return this.paletteColors[index]!;
	}

	private drawCircle(
		x: number,
		y: number,
		opts: { animate?: boolean } = {},
	): SVGCircleElement {
		const { animate = true } = opts;
		const circle = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"circle",
		);
		circle.setAttribute("cx", x.toString());
		circle.setAttribute("cy", y.toString());
		circle.setAttribute("r", this.circleRadius.toString());
		circle.style.fill = this.colorForX(x);
		circle.style.transformBox = "fill-box";
		circle.style.transformOrigin = "center";
		circle.style.transform = animate ? "scale(0)" : "scale(1)";

		this.circleLayer?.append(circle);

		if (animate) {
			this.trackAnimation(
				circle.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], {
					duration: 1000,
					easing: "cubic-bezier(0.16, 1, 0.3, 1)",
					fill: "forwards",
				}),
			);
		}

		return circle;
	}

	private startAnimation() {
		const reduceMotion = prefersReducedMotion();
		// Draw initial circle at the start point
		const startX = this.circleRadius;
		const startY = this.viewBoxHeight / 2;
		this.drawCircle(startX, startY, { animate: !reduceMotion });

		if (reduceMotion) {
			for (const branch of this.branches) {
				this.drawBranchStatic(branch);
			}
			return;
		}

		const childrenMap = new Map<number, number[]>();
		const rootBranches: number[] = [];

		this.branches.forEach((branch, index) => {
			if (branch.parentIndex === undefined) {
				rootBranches.push(index);
				return;
			}
			const children = childrenMap.get(branch.parentIndex);
			if (children) {
				children.push(index);
			} else {
				childrenMap.set(branch.parentIndex, [index]);
			}
		});

		for (const rootIndex of rootBranches) {
			this.animateBranch(rootIndex, childrenMap);
		}
	}

	private animateBranch(
		branchIndex: number,
		childrenMap: Map<number, number[]>,
	) {
		const branch = this.branches[branchIndex]!;
		const generation = this.generation;
		const lineAnimation = this.drawBranch(branch);

		void lineAnimation.finished.then(
			() => {
				if (generation !== this.generation || !this.isConnected) {
					return;
				}
				const children = childrenMap.get(branchIndex) ?? [];
				for (const childIndex of children) {
					this.animateBranch(childIndex, childrenMap);
				}
			},
			() => {},
		);
	}

	private drawBranch(branch: Branch): Animation {
		const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
		line.setAttribute("x1", branch.x1.toString());
		line.setAttribute("y1", branch.y1.toString());
		line.setAttribute("x2", branch.x2.toString());
		line.setAttribute("y2", branch.y2.toString());
		line.style.strokeWidth = `${this.lineWidth}`;

		// Calculate line length for stroke-dasharray animation
		const length = Math.sqrt(
			Math.pow(branch.x2 - branch.x1, 2) + Math.pow(branch.y2 - branch.y1, 2),
		);

		line.style.strokeDasharray = `${length}`;
		line.style.strokeDashoffset = `${length}`;

		this.lineLayer?.append(line);

		// Animate the line drawing in with variance
		const duration = (length / this.lineDrawSpeed) * 1000;
		const lineAnimation = line.animate(
			[{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
			{
				duration,
				easing: "linear",
				fill: "forwards",
			},
		);

		// If terminal branch, add a circle at the end after line finishes
		if (branch.isTerminal) {
			const generation = this.generation;
			void lineAnimation.finished.then(
				() => {
					if (generation === this.generation && this.isConnected) {
						this.drawCircle(branch.x2, branch.y2);
					}
				},
				() => {},
			);
		}

		return this.trackAnimation(lineAnimation);
	}

	private trackAnimation(animation: Animation): Animation {
		this.animations.trackAnimation(animation);
		return animation;
	}

	private drawBranchStatic(branch: Branch) {
		const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
		line.setAttribute("x1", branch.x1.toString());
		line.setAttribute("y1", branch.y1.toString());
		line.setAttribute("x2", branch.x2.toString());
		line.setAttribute("y2", branch.y2.toString());
		line.style.strokeWidth = `${this.lineWidth}`;

		this.lineLayer?.append(line);

		if (branch.isTerminal) {
			this.drawCircle(branch.x2, branch.y2, { animate: false });
		}
	}
}
