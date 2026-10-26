import { css, html, LitElement, nothing, type PropertyValues, svg } from "lit";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { ResizeController } from "../../../shared/core/controllers/ResizeController";
import "../../../shared/components/Button";
import "../../../shared/components/Card";
import "./Icon";
import {
	bucketIndex,
	getHashFunction,
	getValuesFunction,
	type Hasher,
	type Values,
} from "../model/Hashers";

interface Entry {
	id: number;
	key: string;
	hash: number;
	bucket: number;
	origin: { x: number; y: number };
}

@customElement("s-hash-map")
export class HashMap extends LitElement {
	@property({ attribute: "hashfn", reflect: true }) hashFn: Hasher = "murmur3";

	@property({ attribute: "valuefn" }) valueFn: Values = "random";

	@property({ type: Number }) seed = 0;

	@property({ type: Number, attribute: "bucketwidth" }) bucketWidth = 50;

	@property({ type: Number, attribute: "itemsperbucket" }) itemsPerBucket = 4;

	@state() private width = 750;

	@state() private entries: Entry[][] = [];

	@state() private latest?: Entry;

	@state() private inputError = "";

	private generation = 0;

	private counter = 0;

	private nextId = 0;

	constructor() {
		super();
		new ThemeController(this);
		const resize = new ResizeController(this);
		resize.addEventListener("resize", () => {
			if (this.clientWidth > 0) {
				this.width = this.clientWidth;
			}
		});
	}

	static override styles = css`
		:host {
			--color-border-hash-bucket: var(--stone-400);
			--bucket-label-color: var(--color-palette-green-solid);
			--bucket-label-text-color: var(--color-palette-green-on-solid);
			--bucket-text-color: var(--hashing-bucket-color);
			--bucket-fill-color: var(--color-data-fill-green);
			display: block;
			min-width: 0;
		}
		:host([hashfn="stringSum"]) {
			--bucket-label-color: var(--color-palette-red-solid);
			--bucket-label-text-color: var(--color-palette-red-on-solid);
			--bucket-text-color: var(--color-text-data-red);
			--bucket-fill-color: var(--color-data-fill-red);
		}
		:host([data-theme="dark"]) {
			--color-border-hash-bucket: var(--stone-600);
		}
		.summary {
			margin: 0;
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: var(--space-2);
			padding: var(--space-3);
			font: var(--font-size-small) var(--font-family-code, monospace);
		}
		.value {
			display: flex;
			min-width: 0;
			height: var(--control-min-height-small);
			border: var(--border-width-thin) solid var(--color-border-subtle);
			border-radius: var(--radius-medium);
			background: var(--color-surface-default);
			overflow: hidden;
		}
		.value dt {
			font-weight: var(--font-weight-bold);
			display: grid;
			place-items: center;
			flex: 0 0 6ch;
			min-width: var(--control-min-width);
			padding-inline: var(--space-1);
			color: var(--label-text-color);
			background: var(--label-color);
		}
		.key {
			grid-column: 1 / -1;
			--label-color: var(--color-palette-dark-blue-solid);
			--label-text-color: var(--color-palette-dark-blue-on-solid);
		}
		.hash {
			--label-color: var(--color-palette-pink-solid);
			--label-text-color: var(--color-palette-pink-on-solid);
		}
		.bucket {
			--label-color: var(--bucket-label-color);
			--label-text-color: var(--bucket-label-text-color);
		}
		.key-text,
		.hash-text,
		.bucket-text {
			font-weight: var(--font-weight-bold);
		}
		.key-text {
			color: var(--hashing-key-color);
		}
		.hash-text {
			color: var(--hashing-hash-color);
		}
		.bucket-text {
			color: var(--bucket-text-color);
		}
		dd {
			flex: 1;
			min-width: 0;
			margin: 0;
		}
		output {
			box-sizing: border-box;
			width: 100%;
			display: block;
			flex: 1;
			min-width: 0;
			padding-inline: var(--space-2);
			line-height: var(--control-min-height-small);
			white-space: nowrap;
			overflow-x: auto;
			scrollbar-width: none;
		}
		.drawing {
			padding: var(--space-2);
		}
		@media (max-width: 600px) {
			.summary {
				grid-template-columns: minmax(0, 1fr);
			}
		}
		svg {
			position: relative;
			z-index: 1;
			pointer-events: none;
			width: 100%;
			display: block;
			overflow: visible;
		}
		.bucket-shape {
			fill: none;
			stroke: currentColor;
			stroke-width: 2;
		}
		.bucket-group {
			color: var(--color-border-hash-bucket);
			transition: color var(--motion-duration-press) ease-out;
		}
		.bucket-group.selected {
			color: var(--bucket-fill-color);
		}
		.bucket-group.selected text {
			fill: var(--bucket-text-color);
			font-weight: var(--font-weight-bold);
		}
		.item.latest {
			fill: var(--bucket-fill-color);
		}
		.item {
			fill: var(--color-data-fill-orange);
		}
		.latest-dot {
			fill: var(--color-surface-default);
		}
		text {
			fill: var(--color-text-primary);
			font: var(--type-chart-axis-size) var(--font-family-code, monospace);
			text-anchor: middle;
			transition: fill var(--motion-duration-press) ease-out;
		}
		@keyframes insert {
			from {
				transform: translate(var(--dx), var(--dy));
			}
			to {
				transform: translate(0, 0);
			}
		}
		@media (prefers-reduced-motion: reduce) {
			.bucket-group,
			text {
				transition: none;
			}
		}
		@media (prefers-reduced-motion: no-preference) {
			.item {
				animation: insert 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
			}
		}
		.controls {
			display: flex;
			justify-content: space-between;
			gap: var(--space-2);
		}
	`;

	protected override willUpdate(changed: PropertyValues): void {
		if (
			[
				"width",
				"bucketWidth",
				"itemsPerBucket",
				"hashFn",
				"valueFn",
				"seed",
			].some((key) => changed.has(key))
		) {
			this.reset();
		}
	}

	reset(): void {
		this.generation++;
		this.inputError = "";
		this.entries = Array.from(
			{ length: Math.max(1, Math.floor(this.width / this.bucketWidth)) },
			() => [],
		);
		this.latest = undefined;
		this.counter = 0;
	}

	async add(): Promise<void> {
		const generation = this.generation;
		const index = ++this.counter;
		let key: string;
		try {
			const generate = await getValuesFunction(this.valueFn);
			if (generation !== this.generation || !this.isConnected) {
				return;
			}
			key = generate(index);
			this.inputError = "";
		} catch (error) {
			if (generation === this.generation) {
				this.inputError = `Unable to load inputs: ${String(error)}`;
			}
			return;
		}
		const hash = getHashFunction(this.hashFn)(key, this.seed);
		const bucket = bucketIndex(hash, this.entries.length);
		if (this.entries[bucket]!.length >= this.itemsPerBucket) {
			this.entries = this.entries.map(() => []);
		}
		// Store the launch point per item so later insertions never redirect it.
		const diagram = this.renderRoot.querySelector("svg")!;
		const button = this.renderRoot
			.querySelector('s-button[label="Add pair"]')!
			.getBoundingClientRect();
		const origin = new DOMPoint(
			button.x + button.width / 2,
			button.y + button.height / 2,
		).matrixTransform(diagram.getScreenCTM()!.inverse());
		const entry = { id: ++this.nextId, key, hash, bucket, origin };
		this.entries[bucket]!.push(entry);
		this.latest = entry;
	}

	protected override render() {
		const itemSize = this.bucketWidth * 0.75 - 8;
		const bucketTop = 23;
		const inset = 4;
		// Item pitch includes a two-unit gap; there is no gap after the last item.
		const bucketHeight = itemSize * this.itemsPerBucket - 2 + inset * 2;
		const height = bucketTop + bucketHeight + 2;
		const spacing = this.width / Math.max(1, this.entries.length);
		const latest = this.latest;
		// Newer entries paint last, above every bucket and older item. A single
		// keyed layer also keeps concurrent animations intact across insertions.
		const items = this.entries
			.flatMap((entries, bucket) =>
				entries.map((entry, i) => ({
					entry,
					x: bucket * spacing + (spacing - itemSize) / 2,
					y: bucketTop + inset + itemSize * (this.itemsPerBucket - i - 1),
				})),
			)
			.sort((a, b) => a.entry.id - b.entry.id);
		return html`
			<s-card full-width>
				<dl
					slot="header"
					class="summary"
					aria-live="polite"
				>
					<div class="value key">
						<dt>Key</dt>
						<dd>
							<output
								tabindex="0"
								aria-label="Key expression"
								>${this.inputError || (latest ? html`set(<span class="key-text">${JSON.stringify(latest.key)}</span>, "value")` : "")}</output
							>
						</dd>
					</div>
					<div class="value hash">
						<dt>Hash</dt>
						<dd>
							<output
								tabindex="0"
								aria-label="Hash expression"
								>${latest ? html`${this.hashFn}(<span class="key-text">${JSON.stringify(latest.key)}</span>${this.seed ? `, ${this.seed}` : ""}) == <span class="hash-text">${latest.hash}</span>` : ""}</output
							>
						</dd>
					</div>
					<div class="value bucket">
						<dt>Bucket</dt>
						<dd>
							<output
								tabindex="0"
								aria-label="Bucket expression"
								>${latest ? html`<span class="hash-text">${latest.hash}</span> % ${this.entries.length} == <span class="bucket-text">${latest.bucket}</span>` : ""}</output
							>
						</dd>
					</div>
				</dl>
				<div class="drawing">
					<svg
						viewBox="0 0 ${this.width} ${height}"
						role="img"
						aria-label="Hash map using ${this.hashFn} with seed ${this.seed}"
					>
						${this.entries.map((_, bucket) => {
							const x = bucket * spacing + (spacing - itemSize) / 2;
							return svg`
								<g
									class=${latest?.bucket === bucket ? "bucket-group selected" : "bucket-group"}
								>
									<text
										x=${x + itemSize / 2}
										y="14"
									>${bucket}</text>
									<rect
										class="bucket-shape"
										x=${x - inset}
										y=${bucketTop}
										width=${itemSize + inset * 2}
										height=${bucketHeight}
										rx="8"
									/>
								</g>
							`;
						})}
						<g class="items">
							${repeat(
								items,
								({ entry }) => entry.id,
								({ entry, x, y }) => svg`
												<g
													class="item ${entry === latest ? "latest" : ""}"
													style="--dx: ${entry.origin.x - x - itemSize / 2}px; --dy: ${entry.origin.y - y - (itemSize - 2) / 2}px"
												>
													<rect
														x=${x}
														y=${y}
														width=${itemSize}
														height=${itemSize - 2}
														rx="5"
													/>
													${
														entry === latest
															? svg`
														<circle
															class="latest-dot"
															cx=${x + itemSize / 2}
															cy=${y + (itemSize - 2) / 2}
															r=${itemSize * 0.08}
															aria-hidden="true"
														/>
													`
															: nothing
													}
												</g>
											`,
							)}
						</g>
					</svg>
				</div>
				<div
					slot="footer"
					class="controls"
				>
					<s-button
						label="Reset hash map"
						@click=${this.reset}
						><s-icon
							slot="icon"
							name="arrow_clockwise"
							aria-hidden="true"
						></s-icon
					></s-button>
					<s-button
						label="Add pair"
						@click=${this.add}
						><s-icon
							slot="icon"
							name="plus"
							aria-hidden="true"
						></s-icon
					></s-button>
				</div>
			</s-card>
		`;
	}
}
