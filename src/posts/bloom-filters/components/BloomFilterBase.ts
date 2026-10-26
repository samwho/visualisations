import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import "../../../shared/components/Card";
import { BloomFilter } from "../../../shared/datastructures/BloomFilter";
import type { CountingBloomFilter } from "../../../shared/datastructures/CountingBloomFilter";
import { indices } from "../Hashers";
import { visuallyHiddenStyles } from "../../../shared/styles/Accessibility";
import { Bit } from "./Bit";
import type { RingSegment } from "./SegmentedRing";
import { classMap } from "lit/directives/class-map.js";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";

const noPreviewSegments: readonly RingSegment[] = [];
const noPreviewRings: ReadonlyMap<number, readonly RingSegment[]> = new Map();

/** Shared filter operations and grid; each s-bit owns its colours and animation lifecycle. */
export abstract class BloomFilterBase extends LitElement {
	@property({ type: Number }) bits = 32;

	@property() initial = "";

	@state() private message = "";

	filter: BloomFilter | CountingBloomFilter = new BloomFilter();

	@state() private ready = false;

	private selectedBit?: number;

	constructor() {
		super();
		const visibility = new VisibilityController(this, { rootMargin: "200px" });
		visibility.addEventListener(
			"first-visible",
			() => {
				this.ready = true;
			},
			{ once: true },
		);
	}

	static override styles = [
		visuallyHiddenStyles,
		css`
			:host {
				display: block;
				width: 100%;
				container-type: inline-size;
			}
			.grid {
				display: grid;
				grid-template-columns: repeat(16, minmax(0, 1fr));
				gap: var(--space-2);
				padding: var(--space-4) var(--space-3);
			}
			.placeholder {
				aspect-ratio: 1;
			}
			.bit.selectable {
				cursor: pointer;
				touch-action: manipulation;
			}
			@container (max-width: 30rem) {
				.grid {
					grid-template-columns: repeat(8, minmax(0, 1fr));
				}
			}
		`,
	];

	protected abstract readonly gridLabel: string;

	protected abstract createFilter(): BloomFilter | CountingBloomFilter;
	protected abstract bitLabel(index: number, count: number): string;
	protected renderCount(_count: number): number | typeof nothing {
		return nothing;
	}

	protected previewRingSegments(): ReadonlyMap<number, readonly RingSegment[]> {
		return noPreviewRings;
	}

	protected override firstUpdated(): void {
		this.filter = this.createFilter();
		this.notify();
		if (this.initial) {
			this.add(this.initial, false);
		}
	}

	private notify(): void {
		this.requestUpdate();
		this.dispatchEvent(new Event("bloom-change"));
	}

	getBit(index: number): Bit {
		if (!this.ready) {
			// Article links can highlight a bit before its visibility notification.
			this.ready = true;
			this.performUpdate();
		}
		const bit = this.renderRoot?.querySelector<Bit>(`[data-bit="${index}"]`);
		if (!bit) {
			throw new Error(`No bit exists at index ${index}.`);
		}
		return bit;
	}

	private hasProseReference(index: number): boolean {
		return Array.from(this.ownerDocument.querySelectorAll("s-bitlink")).some(
			(reference) =>
				reference.getAttribute("bfid") === this.id &&
				reference.getAttribute("appearance") !== "bit" &&
				Number(reference.textContent?.trim()) === index,
		);
	}

	private syncHighlight(): void {
		const active = this.selectedBit;
		for (const bit of this.renderRoot.querySelectorAll<Bit>(
			"s-bit[data-bit]",
		)) {
			if (Number(bit.dataset.bit) === active) {
				bit.highlight();
			} else {
				bit.clearHighlight();
			}
		}
		this.requestUpdate();
	}

	isBitSelected(index: number): boolean {
		return this.selectedBit === index;
	}

	toggleBitSelection(index: number): void {
		this.getBit(index);
		this.selectedBit = this.selectedBit === index ? undefined : index;
		this.syncHighlight();
		this.dispatchEvent(new Event("bloom-change"));
	}

	add(value: string, animate = true): void {
		const selected = indices(value, this.bits);
		this.filter.add(selected);
		if (this.ready) {
			for (const index of new Set(selected)) {
				this.getBit(index).setValue(this.filter.counts[index]! > 0, animate);
			}
		}
		this.message = "";
		this.notify();
	}

	containsValue(value: string): boolean {
		return this.filter.contains(indices(value, this.bits));
	}

	check(value: string): boolean {
		const selected = indices(value, this.bits);
		const present = this.filter.contains(selected);
		for (const index of new Set(selected)) {
			this.getBit(index).check();
		}
		this.message = present
			? `${JSON.stringify(value)} may be present.`
			: `${JSON.stringify(value)} is definitely not present.`;
		this.notify();
		return present;
	}

	protected removeItem(value: string): boolean {
		const selected = indices(value, this.bits);
		const removed = this.filter.remove(selected);
		if (removed) {
			for (const index of new Set(selected)) {
				this.getBit(index).setValue(this.filter.counts[index]! > 0);
			}
		}
		this.message = "";
		this.notify();
		return removed;
	}

	reset(): void {
		this.filter.reset();
		for (const bit of this.renderRoot.querySelectorAll<Bit>("s-bit")) {
			bit.setValue(false);
		}
		this.message = "";
		this.notify();
	}

	private gridDescription(): string {
		const setBits = Array.from({ length: this.bits }, (_, index) => {
			const count = this.filter.counts[index] ?? 0;
			return count > 0 ? this.bitLabel(index, count) : "";
		}).filter(Boolean);
		return `${this.gridLabel}. ${this.bits} bits. ${
			setBits.length > 0
				? `${setBits.join(". ")}. All other bits are zero.`
				: "All bits are zero."
		}`;
	}

	protected override render() {
		const previewRings = this.previewRingSegments();
		return html`
			<s-card full-width>
				<div
					class="grid"
					role="img"
					aria-live="polite"
					aria-atomic="true"
					aria-label=${this.gridDescription()}
					@bit-change=${() => this.dispatchEvent(new Event("bloom-change"))}
				>
					${Array.from({ length: this.bits }, (_, index) => {
						if (!this.ready) {
							return html`<span
								class="placeholder"
								aria-hidden="true"
							></span>`;
						}
						const count = this.filter.counts[index] ?? 0;
						const linked = this.hasProseReference(index);
						const highlighted = this.selectedBit === index;
						const selectable = linked || highlighted;
						return html`<s-bit
							fill
							class=${classMap({
								bit: true,
								selectable,
								previewed:
									previewRings.get(index)?.some((segment) => segment.active) ??
									false,
								set: count > 0,
								highlight: highlighted,
							})}
							.ring=${highlighted}
							.previewSegments=${previewRings.get(index) ?? noPreviewSegments}
							data-bit=${index}
							aria-hidden="true"
							@click=${() => {
								if (linked || this.selectedBit === index) {
									this.toggleBitSelection(index);
								}
							}}
							>${this.renderCount(count)}</s-bit
						>`;
					})}
				</div>
				<slot
					name="controls"
					slot="footer"
				></slot>
			</s-card>
			<output
				class="visually-hidden"
				aria-live="polite"
				>${this.message}</output
			>
		`;
	}
}
