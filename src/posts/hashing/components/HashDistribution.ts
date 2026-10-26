import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../../../shared/components/Button";
import "../../../shared/components/Card";
import "../../../shared/components/Slider";
import type { Slider } from "../../../shared/components/Slider";
import { FrameController } from "../../../shared/core/controllers/FrameController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import type { Hasher, Values } from "../model/Hashers";
import { inputSource, type InputSource } from "../model/HeatMapModel";
import { HeatMapWorker } from "../runtime/HeatMapWorker";
import "./HeatMap";
import "./Term";
import "./Icon";

/** A single experiment: comparison grids always receive the same inputs and count. */
@customElement("s-hash-distribution")
export class HashDistribution extends LitElement {
	@property({ attribute: "hashfn" }) hashFn: Hasher = "murmur3";

	@property({ attribute: "valuefn" }) valueFn: Values = "randomUUID";

	@property({ type: Boolean }) compare = false;

	@property({ type: Boolean, attribute: "compare-seeds" }) compareSeeds = false;

	@property({ type: Boolean, attribute: "hide-randomize" }) hideRandomize =
		false;

	@state() private inputs: InputSource = inputSource(this.valueFn);

	@state() private progress = 10000;

	@state() private playing = false;

	private readonly frames = new FrameController(this);

	private started = 0;

	private readonly workerGroup = new HeatMapWorker();

	private readonly iterations = 10000;

	constructor() {
		super();
		this.frames.addEventListener("update", this.tick);
		const visibility = new VisibilityController(this, { rootMargin: "0px" });
		visibility.addEventListener("hidden", () => this.stopPlayback());
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.stopPlayback();
	}

	static override styles = css`
		:host {
			display: block;
		}
		.grids {
			display: grid;
		}
		.comparison {
			position: relative;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		/* Overlay the divider to keep both grids identical in size. */
		.comparison::after {
			content: "";
			position: absolute;
			inset: 0 auto 0 50%;
			border-left: var(--border-width-thin) dotted var(--color-border-separator);
			pointer-events: none;
		}
		s-heat-map {
			aspect-ratio: 36 / 17;
		}
		.comparison s-heat-map {
			aspect-ratio: 36 / 31;
		}
		figure {
			margin: 0;
			min-width: 0;
		}
		figcaption {
			--inline-code-background: var(--color-surface-page);
			background: var(--color-surface-panel);
			border-bottom: var(--border-width-thin) dotted
				var(--color-border-separator);
		}
		.name {
			margin: 0;
			padding-block: var(--space-3);
			text-align: center;
			font: var(--font-weight-bold) var(--type-caption-size)
				var(--font-family-code, monospace);
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
		.count {
			display: block;
			text-align: center;
			font: var(--font-size-small) var(--font-family-code, monospace);
			flex: 0 0 13ch;
			min-width: 0;
			white-space: nowrap;
		}
	`;

	protected override willUpdate(changed: PropertyValues): void {
		if (changed.has("valueFn")) {
			this.generateInputs();
			this.progress = this.iterations;
		}
	}

	private generateInputs(): void {
		// Sequential inputs start at one; word lists start at zero.
		this.inputs = inputSource(
			this.valueFn,
			this.valueFn === "intToStr" ? 1 : 0,
		);
	}

	private reset(): void {
		this.stopPlayback();
		this.generateInputs();
	}

	private stopPlayback(): void {
		this.frames.timeline.pause();
		this.playing = false;
	}

	private play(): void {
		this.stopPlayback();
		this.playing = true;
		this.progress = 0;
		this.frames.timeline.resume();
		this.started = this.frames.timeline.nowMs();
	}

	// Keep the final value unanimated for one frame before restoring keyboard easing.
	private readonly tick = (event: Event): void => {
		if (this.progress >= this.iterations) {
			this.stopPlayback();
			return;
		}
		// SAFETY: this handler receives only FrameController's update events.
		const now = (event as CustomEvent<{ nowMs: number }>).detail.nowMs;
		this.progress = Math.min(
			this.iterations,
			Math.floor(((now - this.started) / 3000) * this.iterations),
		);
	};

	protected override render() {
		const comparison = this.compare || this.compareSeeds;
		const hashers: Hasher[] = this.compareSeeds
			? [this.hashFn, this.hashFn]
			: this.compare
				? ["murmur3", "stringSum"]
				: [this.hashFn];
		return html`
			<s-card full-width>
				<div class="grids ${comparison ? "comparison" : ""}">
					${hashers.map(
						(hashFn, index) => html`
							<figure>
								${comparison ? html`<figcaption class="name"><t->${hashFn}</t->${this.compareSeeds ? ` (seed ${index})` : ""}</figcaption>` : null}
								<s-heat-map
									.hashFn=${hashFn}
									.seed=${this.compareSeeds ? index : 0}
									.iterations=${this.iterations}
									.workerGroup=${this.workerGroup}
									.inputs=${this.inputs}
									.progress=${this.progress}
									.columns=${36}
									.rows=${comparison ? 31 : 17}
									.color=${hashFn === "stringSum" ? "red" : "green"}
								></s-heat-map>
							</figure>
						`,
					)}
				</div>
				<div
					slot="footer"
					class="footer"
				>
					${
						!this.hideRandomize &&
						this.valueFn !== "intToStr" &&
						this.valueFn !== "commonWords"
							? html`
									<s-button
										@click=${this.reset}
										label="Reset inputs"
										><s-icon
											slot="icon"
											name="shuffle"
											aria-hidden="true"
										></s-icon
									></s-button>
								`
							: null
					}
					<s-button
						@click=${this.play}
						label="Play distribution"
					>
						<s-icon
							slot="icon"
							name="play"
							aria-hidden="true"
						></s-icon>
					</s-button>
					<s-slider
						min="0"
						.max=${String(this.iterations)}
						step="1"
						label="Inputs placed"
						.immediate=${this.playing}
						.value=${String(this.progress)}
						.valueText=${`${this.progress} of ${this.iterations} inputs placed`}
						@input=${(event: Event) => {
							this.stopPlayback();
							// SAFETY: this input listener is attached directly to s-slider.
							this.progress = Number((event.currentTarget as Slider).value);
						}}
					></s-slider>
					<output class="count">${this.progress} / ${this.iterations}</output>
				</div>
			</s-card>
		`;
	}
}
