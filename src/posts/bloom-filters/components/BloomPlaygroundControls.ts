import { css, html, LitElement } from "lit";
import { customElement, query } from "lit/decorators.js";
import "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { BloomFilter } from "./BloomFilter";
import "./Icon";
import { visuallyHiddenStyles } from "../../../shared/styles/Accessibility";
import { randomAnimalName } from "../AnimalNames";
import { indices } from "../Hashers";

@customElement("s-bloom-playground-controls")
export class BloomPlaygroundControls extends LitElement {
	static override styles = [
		visuallyHiddenStyles,
		css`
			:host {
				display: grid;
				grid-template-columns: auto minmax(0, 1fr) auto auto;
				gap: var(--space-2);
				align-items: center;
			}
			.entry {
				position: relative;
				min-width: 0;
			}
			s-input {
				--input-padding-inline-end: calc(
					var(--control-padding-inline) + var(--icon-size-small) +
						var(--space-2)
				);
				min-width: 0;
			}
			s-icon[name="shuffle"] {
				/* The cropped SVG is wider than its square icon host. */
				width: auto;
			}
			.status-bits {
				position: absolute;
				inset-inline-end: var(--control-padding-inline);
				top: 50%;
				inline-size: var(--icon-size-small);
				block-size: var(--icon-size-small);
				transform: translateY(-50%);
				pointer-events: none;
			}
			.status-bit {
				position: absolute;
				inline-size: 40%;
				block-size: 40%;
				border-radius: var(--radius-circle);
				background: var(--color-palette-orange-surface-strong);
			}
			.status-bit.set {
				background: var(--color-data-fill-orange);
			}
			.status-bit:first-child {
				top: 0;
				left: 50%;
				transform: translateX(-50%);
			}
			.status-bit:nth-child(2) {
				bottom: 0;
				left: 0;
			}
			.status-bit:nth-child(3) {
				bottom: 0;
				right: 0;
			}
		`,
	];

	@query("s-input") private input!: Input;

	private get filter(): BloomFilter {
		return this.closest<BloomFilter>("s-bloom-filter")!;
	}

	private add(): void {
		this.filter.add(this.input.value);
		this.requestUpdate();
	}

	private shuffle(): void {
		const value = randomAnimalName(this.input.value);
		this.filter.valueToHash = value;
		this.input.value = value;
		this.requestUpdate();
	}

	private reset(): void {
		this.filter.reset();
		this.filter.valueToHash = "foo";
		this.input.value = "foo";
		this.requestUpdate();
	}

	private handleKeydown(event: KeyboardEvent): void {
		if (
			event.key !== "Enter" ||
			event.isComposing ||
			// oxlint-disable-next-line typescript/no-deprecated -- Safari delivers compositionend before the confirming Enter.
			event.keyCode === 229
		) {
			return;
		}
		event.preventDefault();
		this.add();
	}

	protected override render() {
		const value = this.filter.valueToHash;
		const setBits = indices(value, this.filter.bits).map(
			(index) => this.filter.filter.counts[index]! > 0,
		);
		const present = setBits.every(Boolean);
		return html`
			<s-button
				class="reset"
				appearance="filled"
				label="Reset bloom filter"
				?disabled=${!this.filter.filter.counts.some(Boolean)}
				@click=${this.reset}
				><s-icon
					slot="icon"
					name="restart"
				></s-icon
			></s-button>
			<div class="entry">
				<s-input
					label="Bloom filter value"
					placeholder="Enter a value"
					.value=${value}
					.success=${present}
					@input=${() => {
						this.filter.valueToHash = this.input.value;
						this.requestUpdate();
					}}
					@keydown=${this.handleKeydown}
				></s-input>
				<span
					class="status-bits"
					aria-hidden="true"
				>
					${setBits.map(
						(set) =>
							html`<span class=${`status-bit ${set ? "set" : ""}`}></span>`,
					)}
				</span>
			</div>
			<s-button
				appearance="filled"
				label="Choose a random colour and animal"
				@click=${this.shuffle}
				><s-icon
					slot="icon"
					name="shuffle"
				></s-icon
			></s-button>
			<s-button
				appearance="filled"
				variant="success"
				label="Add current value"
				?disabled=${present}
				@click=${this.add}
				><s-icon
					slot="icon"
					name="add"
				></s-icon
			></s-button>
			<output
				class="visually-hidden"
				aria-live="polite"
				aria-atomic="true"
				>${`${setBits.filter(Boolean).length} of 3 bits set. ${present ? "May be in the bloom filter" : "Not in the bloom filter"}`}</output
			>
		`;
	}
}
