import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
	compressCode,
	decodeSharedCode,
} from "../../../shared/core/SharedCode";
import { TimelineController } from "../../../shared/core/controllers/TimelineController";
import { inputSource, type InputSource } from "../model/HeatMapModel";
import type { HashSource } from "../runtime/HeatMapProtocol";
import murmur3 from "../examples/murmur3.js.txt";
import simple from "../examples/simple.js.txt";
import stringSum from "../examples/string-sum.js.txt";
import xxhash32 from "../examples/xxhash32.js.txt";
import murmur2 from "../examples/murmur2.js.txt";
import farmhash32 from "../examples/farmhash32.js.txt";
import wyhash32 from "../examples/wyhash32.js.txt";
import fasthash32 from "../examples/fasthash32.js.txt";
import "../../../shared/components/Button";
import "../../../shared/components/Select";
import "../../../shared/components/Slider";
import "../../../shared/components/SplitPane";
import "./Icon";
import "./HeatMap";
import type { Select } from "../../../shared/components/Select";
import type { Slider } from "../../../shared/components/Slider";
import type { Values } from "../model/Hashers";
import "./CodeEditor";
import type { CodeEditor } from "./CodeEditor";

// Bundle source text rather than compiled functions so the editor keeps the
// examples' original formatting and comments.
const EXAMPLES = {
	murmur3,
	xxhash32,
	murmur2,
	farmhash32,
	wyhash32,
	fasthash32,
	simple,
	stringSum,
};

@customElement("s-hashing-playground")
export class Playground extends LitElement {
	@property({ attribute: false }) layout?: "row" | "column";

	@state() private sharedCodePending = false;

	@state() private sharedCodeLoading = false;

	@state() private iterations = 10000;

	@state() private seed = 0;

	@state() private progress = 10000;

	@state() private inputs: InputSource = inputSource("random");

	@state() private values: Values = "random";

	@state() private selected: keyof typeof EXAMPLES = "murmur3";

	@state() private source?: HashSource;

	@state() private error = "";

	@state() private compiling = false;

	private get editor(): CodeEditor | null {
		return this.querySelector<CodeEditor>("s-hashing-code-editor");
	}

	private debounce?: number;

	private readonly timeline = new TimelineController(this, undefined, {
		pauseOffscreen: false,
	});

	private generation = 0;

	static override styles = css`
		:host {
			display: block;
			height: 100%;
			min-height: 0;
		}
		.editor {
			display: grid;
			grid-template-rows: auto minmax(0, 1fr);
		}
		.editor,
		.source,
		::slotted(*) {
			box-sizing: border-box;
			min-width: 0;
			width: 100%;
			height: 100%;
			min-height: 0;
		}
		.source {
			grid-row: 2;
		}
		.shared-code-notice {
			min-width: 0;
			overflow-wrap: anywhere;
			padding: var(--space-2) var(--space-3);
			background: var(--color-status-warning-background);
			color: var(--color-status-warning-foreground);
			font-size: var(--font-size-small);
		}
		.shared-code-notice s-button {
			display: inline-flex;
			max-width: 100%;
			height: var(--control-min-height);
		}
		.shared-code-notice p {
			margin: 0 0 var(--space-2);
		}
		.output {
			display: flex;
			flex-direction: column;
			overflow: auto;
			background: var(--color-surface-workspace);
		}
		.visually-hidden {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			clip-path: inset(50%);
			overflow: hidden;
		}
		.controls {
			margin: 0;
			min-inline-size: 0;
			border: 0;
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			align-items: end;
			gap: var(--space-2);
			padding: var(--space-3);
			padding-top: max(var(--space-3), env(safe-area-inset-top));
			border-bottom: var(--border-width-thin) solid
				var(--color-border-workspace);
			background: var(--color-surface-toolbar);
		}
		.field {
			--control-label-gap: var(--space-1);
			display: grid;
			gap: var(--space-1);
			min-width: 0;
		}
		s-select::part(label),
		s-slider::part(label) {
			font-size: var(--font-size-xsmall);
			font-weight: var(--font-weight-bold);
			line-height: var(--line-height-tight);
			letter-spacing: var(--letter-spacing-label);
			text-transform: uppercase;
		}
		s-select,
		s-slider {
			width: 100%;
			min-width: 0;
		}
		s-heat-map {
			flex: 1;
			min-height: var(--space-9);
			margin: var(--space-3);
		}
		.footer {
			display: flex;
			align-items: center;
			gap: var(--space-3);
			padding: var(--space-3);
		}
		.footer s-slider {
			flex: 1;
		}
		.count {
			font: var(--font-size-small) var(--font-family-code);
			white-space: nowrap;
		}
		.error {
			margin: 0;
			padding: var(--space-2) var(--space-3);
			overflow-wrap: anywhere;
		}
		@media (max-width: 480px) {
			.controls,
			.footer {
				padding-inline: var(--space-2);
				gap: var(--space-2);
			}
		}
	`;

	override connectedCallback(): void {
		super.connectedCallback();
		this.timeline.resume();
		this.addEventListener("editor-ready", this.onEditorReady);
		this.addEventListener("input", this.onEditorInput);
		this.addEventListener("editor-error", this.onEditorError);
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.generation++;
		if (this.debounce !== undefined) {
			this.timeline.clearTimeout(this.debounce);
		}
		this.removeEventListener("editor-ready", this.onEditorReady);
		this.removeEventListener("input", this.onEditorInput);
		this.removeEventListener("editor-error", this.onEditorError);
	}

	private onEditorReady = (): void => {
		void this.loadInitialCode();
	};

	private async loadInitialCode(): Promise<void> {
		const shared = new URLSearchParams(location.hash.slice(1));
		const code = shared.get("code");
		if (code === null) {
			this.loadExample();
			return;
		}
		// Set the gate before setValue emits input. Even edits and parameter
		// changes must not import a shared module until the reader consents.
		this.sharedCodePending = true;
		const values = shared.get("input");
		if (
			values === "random" ||
			values === "randomLonger" ||
			values === "intToStr" ||
			values === "murmur3Collisions" ||
			values === "xxhash32Collisions" ||
			values === "farmhash32Collisions" ||
			values === "wyhash32Collisions" ||
			values === "fasthash32Collisions" ||
			values === "stringSumDos"
		) {
			this.values = values;
		}
		const selected = shared.get("function");
		if (
			selected === "murmur3" ||
			selected === "simple" ||
			selected === "stringSum" ||
			selected === "xxhash32" ||
			selected === "murmur2" ||
			selected === "farmhash32" ||
			selected === "wyhash32" ||
			selected === "fasthash32"
		) {
			this.selected = selected;
		}
		const seed = Number(shared.get("seed"));
		if (Number.isInteger(seed) && seed >= 0 && seed <= 100) {
			this.seed = seed;
		}
		const iterations = Number(shared.get("iterations"));
		if (iterations >= 1000 && iterations <= 100000 && iterations % 1000 === 0) {
			this.iterations = iterations;
			this.progress = iterations;
		}
		this.sharedCodeLoading = true;
		this.editor?.setReadOnly(true);
		const generation = ++this.generation;
		try {
			const decoded = await decodeSharedCode(code);
			if (generation !== this.generation || !this.isConnected) {
				return;
			}
			this.sharedCodeLoading = false;
			this.editor?.setValue(decoded);
		} catch (error) {
			if (generation === this.generation && this.isConnected) {
				this.error = `Couldn't load shared code: ${String(error)}`;
			}
		} finally {
			this.editor?.setReadOnly(false);
		}
	}

	async getShareParameters(): Promise<URLSearchParams> {
		if (this.sharedCodeLoading) {
			throw new Error("Shared code is not ready to share.");
		}
		const code = this.editor?.value ?? "";
		const parameters = new URLSearchParams({
			function: this.selected,
			input: this.values,
			seed: String(this.seed),
			iterations: String(this.iterations),
		});
		if (this.layout) {
			parameters.set("split", this.layout);
		}
		parameters.set("code", await compressCode(code));
		return parameters;
	}

	private onEditorInput = (event: Event): void => {
		if (event.target !== this.editor) {
			return;
		}
		this.generation++;
		if (this.debounce !== undefined) {
			this.timeline.clearTimeout(this.debounce);
		}
		if (this.sharedCodePending) {
			return;
		}
		this.compiling = true;
		this.debounce = this.timeline.setTimeout(() => this.compile(), 500);
	};

	private onEditorError = (event: Event): void => {
		if (event instanceof CustomEvent) {
			this.error = String(event.detail);
		}
	};

	private loadExample(): void {
		this.generation++;
		this.sharedCodeLoading = false;
		this.sharedCodePending = false;
		this.editor?.setReadOnly(false);
		this.editor?.setValue(EXAMPLES[this.selected]);
		// Debounce typing, not an explicit selection of a complete bundled example.
		if (this.debounce !== undefined) {
			this.timeline.clearTimeout(this.debounce);
		}
		this.compile();
	}

	private compile(): void {
		if (this.sharedCodePending) {
			return;
		}
		const code = this.editor?.value;
		if (code === undefined) {
			return;
		}
		this.compiling = true;
		this.source = { id: ++this.generation, code };
	}

	protected override willUpdate(changed: PropertyValues): void {
		if (changed.has("values")) {
			this.generateInputs();
		}
	}

	private generateInputs(): void {
		this.inputs = inputSource(this.values);
	}

	protected override render() {
		return html`
			<s-split-pane
				small-layout=${this.layout ?? "column"}
				large-layout=${this.layout ?? "row"}
				breakpoint="1000"
			>
				<div
					slot="one"
					class="editor"
				>
					${
						this.sharedCodePending
							? html`
									<div class="shared-code-notice">
										<p>
											This link contains shared JavaScript. Check it before
											running: it runs in a worker and isn't sandboxed.
										</p>
										<s-button
											?disabled=${this.sharedCodeLoading}
											@click=${() => {
												this.sharedCodePending = false;
												this.compiling = true;
												this.compile();
											}}
											>Run shared code</s-button
										>
									</div>
								`
							: nothing
					}
					<div class="source"><slot></slot></div>
				</div>
				<section
					slot="two"
					class="output"
					aria-label="Hash distribution"
				>
					<fieldset class="controls">
						<legend class="visually-hidden">
							Hash distribution parameters
						</legend>
						<div class="field">
							<s-select
								visible-label="Function"
								label="Hash function"
								.value=${this.selected}
								@change=${(e: Event) => {
									// SAFETY: this change listener is attached directly to s-select.
									const select = e.currentTarget as Select;
									// SAFETY: every option is a bundled example key.
									this.selected = select.value as keyof typeof EXAMPLES;
									this.loadExample();
								}}
							>
								<option value="murmur3">murmur3</option>
								<option value="xxhash32">xxHash32</option>
								<option value="murmur2">murmur2</option>
								<option value="farmhash32">FarmHash32</option>
								<option value="wyhash32">wyhash32</option>
								<option value="fasthash32">fasthash32</option>
								<option value="simple">simple</option>
								<option value="stringSum">stringSum</option>
							</s-select>
						</div>
						<div class="field">
							<s-select
								visible-label="Input"
								label="Input values"
								.value=${this.values}
								@change=${(e: Event) => {
									// SAFETY: this change listener is attached directly to s-select.
									const select = e.currentTarget as Select;
									// SAFETY: every option in this template is a member of Values.
									this.values = select.value as Values;
								}}
							>
								<option value="random">Random (10 chars)</option>
								<option value="randomLonger">Random (32 chars)</option>
								<option value="intToStr">Sequential numbers</option>
								<option value="murmur3Collisions">murmur3 collisions</option>
								<option value="xxhash32Collisions">xxHash32 collisions</option>
								<option value="farmhash32Collisions">
									FarmHash32 collisions
								</option>
								<option value="wyhash32Collisions">wyhash32 collisions</option>
								<option value="fasthash32Collisions">
									fasthash32 collisions
								</option>
								<option value="stringSumDos">stringSum collisions</option>
							</s-select>
						</div>
						<div class="field">
							<s-slider
								.visibleLabel=${`Iterations: ${this.iterations}`}
								label="Iterations"
								min="1000"
								max="100000"
								step="1000"
								.value=${String(this.iterations)}
								@input=${(e: Event) => {
									// SAFETY: this input listener is attached directly to s-slider.
									const iterations = Number((e.currentTarget as Slider).value);
									this.progress =
										this.progress === this.iterations
											? iterations
											: Math.min(this.progress, iterations);
									this.iterations = iterations;
								}}
							></s-slider>
						</div>
						<div class="field">
							<s-slider
								.visibleLabel=${`Seed: ${this.seed}`}
								label="Seed"
								min="0"
								max="100"
								.value=${String(this.seed)}
								@input=${(e: Event) => {
									// SAFETY: this input listener is attached directly to s-slider.
									this.seed = Number((e.currentTarget as Slider).value);
								}}
							></s-slider>
						</div>
					</fieldset>
					<p
						class="error"
						role="alert"
						?hidden=${!this.error}
					>
						${this.error}
					</p>
					<s-heat-map
						.pending=${this.compiling}
						playground
						.iterations=${this.iterations}
						.seed=${this.seed}
						.inputs=${this.inputs}
						.progress=${this.sharedCodePending ? 0 : this.progress}
						.valueFn=${this.values}
						.source=${this.source}
						@hash-ready=${() => {
							if (this.source?.id !== this.generation) {
								return;
							}
							this.error = "";
							this.compiling = false;
						}}
						@hash-error=${(e: CustomEvent) => {
							if (this.source?.id !== this.generation) {
								return;
							}
							this.error = String(e.detail);
							this.compiling = false;
						}}
					></s-heat-map>
					<div class="footer">
						<s-button
							label="Reset inputs"
							@click=${this.generateInputs}
						>
							<s-icon
								slot="icon"
								name="shuffle"
								aria-hidden="true"
							></s-icon>
						</s-button>
						<s-slider
							label="Inputs placed"
							min="0"
							.max=${String(this.iterations)}
							step="1"
							.value=${String(this.progress)}
							.valueText=${`${this.progress} of ${this.iterations} inputs placed`}
							@input=${(event: Event) => {
								// SAFETY: this input listener is attached directly to s-slider.
								this.progress = Number((event.currentTarget as Slider).value);
							}}
						></s-slider>
						<output class="count">${this.progress} / ${this.iterations}</output>
					</div>
				</section>
			</s-split-pane>
		`;
	}
}
