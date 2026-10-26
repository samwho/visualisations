import { css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import {
	ReferenceBase,
	type ReferenceBinding,
} from "../../../shared/components/ReferenceBase";
import "./Bit";
import { BloomFilterBase } from "./BloomFilterBase";

@customElement("s-bitlink")
export class BitLink extends ReferenceBase<BloomFilterBase> {
	constructor() {
		super();
		this.variant = "orange";
	}

	@property() bfid = "";

	@property({ reflect: true }) appearance: "reference" | "bit" = "reference";

	@state() private bit?: number;

	static override styles = [
		ReferenceBase.styles,
		css`
			:host([appearance="reference"][data-set]) {
				--_reference-background: var(--color-data-fill-orange);
				--_reference-active-background: var(--color-data-fill-orange);
				--_reference-color: var(--bloom-bit-fill-text);
			}
			:host([appearance="bit"]) button {
				min-inline-size: 0;
				min-block-size: 0;
				margin: var(--space-half);
				padding: 0;
				border-radius: var(--radius-circle);
				background: transparent;
			}
			:host([appearance="bit"][active]) button {
				background: transparent;
			}
			:host([appearance="bit"][active]) button::after {
				content: none;
			}
			s-bit {
				pointer-events: none;
			}
		`,
	];

	protected override targetId(): string {
		return this.bfid;
	}

	protected override isTarget(
		element: HTMLElement,
	): element is BloomFilterBase {
		return element instanceof BloomFilterBase;
	}

	protected override targetConnected(filter: BloomFilterBase): void {
		filter.addEventListener("bloom-change", this.onBloomChange);
		this.syncBitState();
	}

	protected override targetDisconnected(filter: BloomFilterBase): void {
		filter.removeEventListener("bloom-change", this.onBloomChange);
	}

	protected override getBinding(
		filter: BloomFilterBase,
	): ReferenceBinding | undefined {
		const index = this.bit;
		if (
			index === undefined ||
			!Number.isInteger(index) ||
			index < 0 ||
			index >= filter.bits
		) {
			return;
		}
		return {
			targetElement: () => filter.getBit(index),
			toggleSelection: () => filter.toggleBitSelection(index),
			isSelected: () => filter.isBitSelected(index),
		};
	}

	protected override get accessibleLabel(): string {
		return `Highlight bit ${this.bit}: ${this.count ? "set" : "unset"}`;
	}

	private get count(): number {
		return this.bit === undefined
			? 0
			: (this.referenceTarget.element?.filter.counts[this.bit] ?? 0);
	}

	protected override renderReferenceValue() {
		return html`<slot @slotchange=${this.onSlotChange}></slot>`;
	}

	protected override renderButtonContent() {
		if (this.appearance !== "bit") {
			return super.renderButtonContent();
		}
		return html`<s-bit
			aria-hidden="true"
			class=${classMap({ set: this.count > 0 })}
			.ring=${this.binding?.isSelected() ?? false}
			>${this.renderReferenceValue()}</s-bit
		>`;
	}

	private readonly onBloomChange = (): void => {
		this.syncBitState();
	};

	private syncBitState(): void {
		this.toggleAttribute("data-set", this.count > 0);
		this.syncReferenceState();
	}

	private readonly onSlotChange = (event: Event): void => {
		// SAFETY: this slotchange listener is attached directly to the slot.
		const slot = event.currentTarget as HTMLSlotElement;
		this.bit = Number(
			slot
				.assignedNodes()
				.map((node) => node.textContent ?? "")
				.join("")
				.trim(),
		);
		this.syncBitState();
	};
}
