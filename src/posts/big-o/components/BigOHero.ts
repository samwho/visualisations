import { LitElement, html, css, svg } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
	seasonalPalette,
	type SeasonalPalette,
} from "../../../shared/core/SeasonalPalette";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { prefersReducedMotion } from "../../../shared/Accessibility";
import { AnimationController } from "../../../shared/core/controllers/AnimationController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";

const CURVE_STROKE_WIDTH = 4.8;
const CAP_RADIUS = CURVE_STROKE_WIDTH / 2;

// Lanczos approximation of Γ(n + 1), extending factorial to fractional inputs.
function factorial(n: number): number {
	const coefficients = [
		676.5203681218851, -1259.1392167224028, 771.3234287776531,
		-176.6150291621406, 12.507343278686905, -0.13857109526572012,
		9.984369578019572e-6, 1.5056327351493116e-7,
	];
	let sum = 0.9999999999998099;
	for (const [index, coefficient] of coefficients.entries()) {
		sum += coefficient / (n + index + 1);
	}
	const t = n + 7.5;
	return Math.sqrt(2 * Math.PI) * t ** (n + 0.5) * Math.exp(-t) * sum;
}

const curves = [
	{ color: "var(--_curve-constant)", y: (_x: number) => 0 },
	{ color: "var(--_curve-log)", y: (x: number) => Math.log(x + 1) },
	{ color: "var(--_curve-linear)", y: (x: number) => x },
	{
		color: "var(--_curve-linearithmic)",
		y: (x: number) => x * Math.log(x + 1),
	},
	{ color: "var(--_curve-quadratic)", y: (x: number) => x * x },
	{ color: "var(--_curve-cubic)", y: (x: number) => x * x * x },
	// Widen and normalise these inputs to show their growth in the small hero.
	{
		color: "var(--_curve-exponential)",
		y: (x: number) => (2 ** (4 * x) - 1) / 16,
	},
	{
		color: "var(--_curve-factorial)",
		y: (x: number) => (factorial(4 * x + 1) - 1) / 120,
	},
];

@customElement("s-big-o-hero")
export class BigOHero extends LitElement {
	@property({ reflect: true, attribute: "data-palette" })
	palette: SeasonalPalette = seasonalPalette();

	constructor() {
		super();
		new ThemeController(this);
		this.visibility.addEventListener(
			"first-visible",
			() => {
				void this.reveal();
			},
			{ once: true },
		);
		this.visibility.addEventListener("hidden", () => this.finishReveal());
	}

	private readonly animations = new AnimationController(this);

	private readonly visibility = new VisibilityController(this);

	// Outer sizing lives in static/css/posts/big-o.css; keep it available before upgrade.
	static override styles = css`
		:host {
			--_curve-constant: var(--color-data-fill-grey);
			--_curve-log: var(--color-data-fill-blue);
			--_curve-linear: var(--color-data-fill-green);
			--_curve-linearithmic: var(--color-data-fill-orange);
			--_curve-quadratic: var(--color-data-fill-red);
			--_curve-cubic: var(--color-data-fill-pink);
			--_curve-exponential: var(--color-data-fill-yellow);
			--_curve-factorial: var(--color-data-fill-dark-blue);
			/* Tint flag white with neutral ink so it remains visible on the light band. */
			--_flag-white: color-mix(
				in oklab,
				var(--color-flag-trans-white) 75%,
				var(--color-data-neutral)
			);
		}
		:host([data-theme="dark"]) {
			--_flag-white: var(--color-flag-trans-white);
		}
		:host([data-palette="pride"]) {
			--_curve-constant: var(--color-flag-pride-violet);
			--_curve-log: var(--color-flag-pride-blue);
			--_curve-linear: var(--color-flag-pride-green);
			--_curve-linearithmic: var(--color-flag-pride-yellow);
			--_curve-quadratic: var(--color-flag-pride-orange);
			--_curve-cubic: var(--color-flag-pride-red);
			/* Supplement the six flag colours without repeating a curve colour. */
			--_curve-exponential: var(--color-data-fill-grey);
			--_curve-factorial: var(--color-data-fill-pink);
		}
		:host([data-palette="trans"]) {
			--_curve-constant: var(--color-flag-trans-blue);
			--_curve-log: var(--color-flag-trans-pink);
			--_curve-linear: var(--_flag-white);
			--_curve-linearithmic: var(--_flag-white);
			--_curve-quadratic: var(--color-flag-trans-pink);
			--_curve-cubic: var(--color-flag-trans-blue);
		}
		svg {
			display: block;
			width: 100%;
			height: 100%;
			overflow: hidden;
		}
		svg > g > path {
			opacity: 0;
		}
		@media (max-width: 600px) {
			:host {
				box-sizing: border-box;
				padding-bottom: var(--space-2);
			}
		}
		path {
			fill: none;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
	`;

	protected override render() {
		return html`<svg
			viewBox=${`${-CAP_RADIUS} ${-CAP_RADIUS} ${760 + CURVE_STROKE_WIDTH} ${450 + CURVE_STROKE_WIDTH}`}
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<defs>
				<linearGradient
					id="origin-fade"
					gradientUnits="userSpaceOnUse"
					x1="0"
					x2="100"
				>
					<stop
						offset="0"
						stop-color="white"
						stop-opacity="0"
					></stop>
					<stop
						offset="1"
						stop-color="white"
					></stop>
				</linearGradient>
				<!-- White supplies mask alpha, not visible paint. -->
				<mask
					id="curve-fade"
					maskUnits="userSpaceOnUse"
					x=${-CAP_RADIUS}
					y=${-CAP_RADIUS}
					width=${760 + CURVE_STROKE_WIDTH}
					height=${450 + CURVE_STROKE_WIDTH}
				>
					<rect
						x=${-CAP_RADIUS}
						y=${-CAP_RADIUS}
						width=${760 + CURVE_STROKE_WIDTH}
						height=${450 + CURVE_STROKE_WIDTH}
						fill="url(#origin-fade)"
					></rect>
				</mask>
			</defs>
			<g mask="url(#curve-fade)">
				${curves.map((curve) => {
					// Measure only the visible curve: an offscreen tail would finish early
					// at the top edge even though its dash animation was still running.
					const points: string[] = [];
					for (let i = 0; i <= 100; i += 1) {
						let x = (i * 1.9) / 100;
						let y = 0.1 + curve.y(x);
						if (y > 5) {
							let low = x - 1.9 / 100;
							let high = x;
							for (let j = 0; j < 20; j += 1) {
								const mid = (low + high) / 2;
								if (0.1 + curve.y(mid) > 5) {
									high = mid;
								} else {
									low = mid;
								}
							}
							x = (low + high) / 2;
							y = 5;
						}
						points.push(`${i === 0 ? "M" : "L"} ${x * 400} ${450 - y * 90}`);
						if (y === 5) {
							break;
						}
					}
					const path = points.join(" ");
					return svg`
					<path
						d=${path}
						stroke=${curve.color}
						stroke-width=${CURVE_STROKE_WIDTH}
					></path>
				`;
				})}
			</g>
		</svg>`;
	}

	private async reveal(): Promise<void> {
		await this.updateComplete;
		if (prefersReducedMotion() || this.visibility.isHidden) {
			this.finishReveal();
			return;
		}
		const paths = [
			...this.renderRoot.querySelectorAll<SVGPathElement>("svg > g > path"),
		];
		const lengths = paths.map((path) => path.getTotalLength());
		for (const [index, path] of paths.entries()) {
			path.style.opacity = "1";
			// Keep the next dash and its rounded cap beyond the endpoint.
			const length = lengths[index]! + CURVE_STROKE_WIDTH;
			this.animations.trackAnimation(
				path.animate(
					[
						{ strokeDasharray: String(length), strokeDashoffset: length },
						{ strokeDasharray: String(length), strokeDashoffset: 0 },
					],
					{
						duration: 2500 - index * 150,
						delay: index * 150,
						easing: "cubic-bezier(0.215, 0.61, 0.355, 1)",
						fill: "backwards",
					},
				),
			);
		}
	}

	private finishReveal(): void {
		this.animations.cancelAnimations();
		for (const path of this.renderRoot.querySelectorAll<SVGPathElement>(
			"svg > g > path",
		)) {
			path.style.opacity = "1";
		}
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.finishReveal();
	}
}
