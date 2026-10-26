import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../../../shared/components/Button";
import "../../../shared/components/Card";
import { getHashFunction, type Hasher } from "../model/Hashers";
import "../../../shared/components/SplitFlap";

@customElement("s-avalanche")
export class Avalanche extends LitElement {
	@property({ attribute: "hashfn" }) hashFn: Hasher = "murmur3";

	@state() private value = 0;

	@state() private previousValue = 0;

	@state() private hash = 0;

	@state() private previousHash = 0;

	static override styles = css`
		:host {
			display: block;
			container-type: inline-size;
		}
		.bit-row {
			display: grid;
			grid-template-columns: minmax(16ch, 1fr) minmax(0, 500px);
			column-gap: var(--space-2);
			align-items: center;
			padding: var(--space-2);
			font: 1em var(--font-family-code, monospace);
		}
		.bit-row + .bit-row {
			border-top: var(--border-width-thin) solid var(--color-border-subtle);
		}
		.row-label {
			grid-column: 1;
			grid-row: 1;
			color: var(--color-text-primary);
		}
		.hash-label {
			color: var(--color-text-data-green);
		}
		.hash-label.stringSum {
			color: var(--color-text-data-red);
		}
		.row {
			grid-column: 2;
			display: grid;
			grid-template-columns: repeat(8, minmax(0, 1fr));
			gap: var(--space-1);
		}
		@container (max-width: 28rem) {
			.bit-row {
				grid-template-columns: minmax(0, 1fr);
				row-gap: var(--space-1);
			}
			.row {
				grid-column: 1;
			}
		}
		.bit {
			min-width: 0;
			font: bold clamp(var(--font-size-large), 8cqw, 64px) / 1
				var(--font-family-code, monospace);
			border-radius: 3px;
		}
		button {
			background: none;
			border: 0;
			padding: 0;
			cursor: pointer;
			touch-action: manipulation;
		}
		.input-bit {
			position: relative;
		}
		.input-bit button {
			position: absolute;
			inset: 0;
			width: 100%;
			border-radius: inherit;
		}
		.input-bit s-split-flap {
			pointer-events: none;
		}
		.input-bit:hover:not(.input-changed) {
			--split-flap-hover-border-color: var(--color-border-control);
		}
		button:focus-visible {
			outline: var(--focus-ring-width-strong) solid
				var(--color-palette-pink-border);
			outline-offset: var(--focus-ring-offset);
		}
		.footer {
			display: flex;
			justify-content: center;
		}
	`;

	protected override willUpdate(changed: PropertyValues<this>): void {
		if (changed.has("hashFn")) {
			this.value = this.previousValue = 0;
			this.hash = this.previousHash = this.hashValue(0);
		}
	}

	private hashValue(value: number): number {
		return getHashFunction(this.hashFn)(String.fromCharCode(value)) & 255;
	}

	flip(bit = Math.floor(Math.random() * 8)): void {
		this.previousValue = this.value;
		this.previousHash = this.hash;
		this.value ^= 1 << bit;
		this.hash = this.hashValue(this.value);
	}

	protected override render() {
		let changedOutputBits = 0;
		return html`
			<s-card full-width>
				<div class="bits">
					<div class="bit-row">
						<span class="row-label">input</span>
						<div
							class="row"
							role="group"
							aria-label="Input bits"
						>
							${Array.from({ length: 8 }, (_, i) => {
								const bit = 7 - i;
								const mask = 1 << bit;
								// The animation has duplicate clipped glyphs, not a textual button label.
								return html`<div
									class="bit input-bit ${(this.value ^ this.previousValue) & mask ? "input-changed" : ""}"
								>
									<s-split-flap
										aria-hidden="true"
										.glyph=${this.value & mask ? "1" : "0"}
										.quiet=${!(this.value & mask)}
										.outlined=${Boolean((this.value ^ this.previousValue) & mask)}
										.highlight=${(this.value ^ this.previousValue) & mask ? (this.hashFn === "stringSum" ? "red" : "green") : ""}
									></s-split-flap>
									<button
										aria-label="Flip input bit ${bit}: ${this.value & mask ? "1" : "0"}"
										aria-pressed=${Boolean(this.value & mask)}
										@click=${() => this.flip(bit)}
									></button>
								</div>`;
							})}
						</div>
					</div>
					<div class="bit-row">
						<span class="row-label"
							><span class="hash-label ${this.hashFn}">${this.hashFn}</span
							>(input)</span
						>
						<div
							class="row"
							role="img"
							aria-label="Hash output ${this.hash.toString(2).padStart(8, "0")}"
						>
							${Array.from({ length: 8 }, (_, i) => {
								const mask = 1 << (7 - i);
								const changed = Boolean((this.hash ^ this.previousHash) & mask);
								const delay = changed ? ++changedOutputBits * 45 : 0;
								return html`<s-split-flap
									aria-hidden="true"
									class="bit output ${changed ? "changed" : "unchanged"}"
									.outlined=${changed}
									.glyph=${this.hash & mask ? "1" : "0"}
									.quiet=${!(this.hash & mask)}
									.highlight=${changed ? (this.hashFn === "stringSum" ? "red" : "green") : ""}
									.delay=${delay}
								></s-split-flap>`;
							})}
						</div>
					</div>
				</div>
				<div
					slot="footer"
					class="footer"
				>
					<s-button @click=${() => this.flip()}>Flip random bit</s-button>
				</div>
			</s-card>
		`;
	}
}
