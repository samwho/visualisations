import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import "../../../shared/components/Card";
import "../../../shared/components/Slider";
import type { Slider } from "../../../shared/components/Slider";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import type { Values } from "../model/Hashers";
import type { HashSource } from "../runtime/HeatMapProtocol";
import xxhash32 from "../examples/xxhash32.js.txt";
import wyhash32 from "../examples/wyhash32.js.txt";
import fasthash32 from "../examples/fasthash32.js.txt";
import "./HeatMap";
import "./Term";

// Reuse the playground's authored implementations; stable source identities
// let each heat-map worker compile once rather than on every seed change.
const experiments: readonly {
	name: string;
	values: Values;
	color: "green" | "orange" | "pink" | "dark-blue";
	source?: HashSource;
}[] = [
	{ name: "murmur3", values: "murmur3Collisions", color: "green" },
	{
		name: "xxHash32",
		values: "xxhash32Collisions",
		color: "orange",
		source: { id: 1, code: xxhash32 },
	},
	{
		name: "wyhash32",
		values: "wyhash32Collisions",
		color: "pink",
		source: { id: 1, code: wyhash32 },
	},
	{
		name: "fasthash32",
		values: "fasthash32Collisions",
		color: "dark-blue",
		source: { id: 1, code: fasthash32 },
	},
];

@customElement("s-seed-comparison")
export class SeedComparison extends LitElement {
	@state() private seed = 0;

	@state() private activated = false;

	private pendingSeed?: number;

	private seedFrame?: number;

	constructor() {
		super();
		// Source-backed heat maps can compile offscreen. Don't create them until
		// this comparison is visible, so none of its datasets load with the page.
		const visibility = new VisibilityController(this, { rootMargin: "0px" });
		visibility.addEventListener("visible", () => {
			this.activated = true;
		});
	}

	override disconnectedCallback(): void {
		if (this.seedFrame !== undefined) {
			cancelAnimationFrame(this.seedFrame);
			this.seedFrame = undefined;
		}
		this.pendingSeed = undefined;
		super.disconnectedCallback();
		this.activated = false;
	}

	private updateSeed(seed: number): void {
		this.pendingSeed = seed;
		if (this.seedFrame !== undefined) {
			return;
		}
		this.seedFrame = requestAnimationFrame(() => {
			this.seedFrame = undefined;
			this.seed = this.pendingSeed!;
			this.pendingSeed = undefined;
		});
	}

	static override styles = css`
		:host {
			display: block;
		}
		.grids {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		figure {
			margin: 0;
			min-width: 0;
		}
		figure:nth-child(odd) {
			border-inline-end: var(--border-width-thin) dotted
				var(--color-border-separator);
		}
		figure:nth-child(-n + 2) {
			border-bottom: var(--border-width-thin) dotted
				var(--color-border-separator);
		}
		h3 {
			--inline-code-background: var(--color-surface-page);
			margin: 0;
			padding: var(--space-3);
			text-align: center;
			background: var(--color-surface-panel);
			border-bottom: var(--border-width-thin) dotted
				var(--color-border-separator);
			font: var(--font-weight-bold) var(--type-caption-size)
				var(--font-family-code, monospace);
		}
		.map {
			position: relative;
			aspect-ratio: 36 / 31;
		}
		s-heat-map {
			position: absolute;
			inset: 0;
		}
		.footer {
			display: flex;
			align-items: center;
			gap: var(--space-3);
		}
		s-slider {
			flex: 1;
			min-width: 0;
		}
		.footer-label {
			white-space: nowrap;
			font: var(--font-size-small) var(--font-family-code, monospace);
		}
	`;

	protected override render() {
		return html`
			<s-card full-width>
				<div class="grids">
					${experiments.map(
						({ name, values, color, source }) => html`
							<figure aria-labelledby=${values}>
								<figcaption>
									<h3 id=${values}><t->${name}</t-></h3>
								</figcaption>
								<div class="map">
									${
										this.activated
											? html`
													<s-heat-map
														.valueFn=${values}
														.source=${source}
														.seed=${this.seed}
														.color=${color}
														.iterations=${10000}
														.columns=${36}
														.rows=${31}
														.seedCacheLimit=${101}
													></s-heat-map>
												`
											: nothing
									}
								</div>
							</figure>
						`,
					)}
				</div>
				<div
					slot="footer"
					class="footer"
				>
					<span class="footer-label">Seed</span>
					<s-slider
						min="0"
						max="100"
						step="1"
						label="Collision seed"
						show-tooltip
						immediate
						.value=${String(this.seed)}
						.valueText=${`Seed ${this.seed}`}
						@input=${(event: Event) => {
							// SAFETY: this listener is attached directly to s-slider.
							this.updateSeed(Number((event.currentTarget as Slider).value));
						}}
					></s-slider>
				</div>
			</s-card>
		`;
	}
}
