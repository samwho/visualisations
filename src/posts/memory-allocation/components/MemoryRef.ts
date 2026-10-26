import { css } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
	ReferenceBase,
	type ReferenceBinding,
} from "../../../shared/components/ReferenceBase";
import { Memory } from "./Memory";

@customElement("s-memory-ref")
export class MemoryRef extends ReferenceBase<Memory> {
	private static active?: MemoryRef;

	@property() target = "";

	@property({ type: Number }) address?: number;

	@property({ type: Number }) step?: number;

	private selected = false;

	static override styles = [
		ReferenceBase.styles,
		css`
			:host([highlighted]) {
				--_reference-background: var(--color-palette-blue-surface);
				--_reference-active-background: var(
					--color-palette-blue-surface-strong
				);
				--_reference-color: var(--color-palette-blue-foreground);
			}
		`,
	];

	protected override targetId(): string {
		return this.target;
	}

	protected override isTarget(element: HTMLElement): element is Memory {
		return element instanceof Memory;
	}

	protected override getBinding(memory: Memory): ReferenceBinding {
		return {
			targetElement: () =>
				this.address === undefined
					? memory.updateComplete.then(() => memory)
					: memory.getByteElement(this.address),
			toggleSelection: () => {
				if (MemoryRef.active === this && this.selected) {
					this.clear();
				} else {
					this.activate();
				}
			},
			isSelected: () => this.selected,
		};
	}

	protected override get accessibleLabel(): string {
		const action = this.address === undefined ? "Show" : "Highlight";
		return `${action} ${this.textContent?.trim() ?? "address"} in the memory example`;
	}

	private static syncMatching(): void {
		for (const reference of document.querySelectorAll<MemoryRef>(
			"s-memory-ref",
		)) {
			reference.toggleAttribute(
				"highlighted",
				MemoryRef.active !== undefined &&
					reference.target === MemoryRef.active.target &&
					reference.address === MemoryRef.active.address &&
					reference.step === MemoryRef.active.step,
			);
		}
	}

	private clear(): void {
		this.selected = false;
		if (MemoryRef.active === this) {
			if (this.address !== undefined) {
				this.referenceTarget.element?.clearByteHighlight();
			}
			MemoryRef.active = undefined;
			MemoryRef.syncMatching();
		}
		this.syncReferenceState();
	}

	private activate(): void {
		const memory = this.referenceTarget.element;
		if (!memory) {
			return;
		}
		if (MemoryRef.active !== this) {
			MemoryRef.active?.clear();
			MemoryRef.active = this;
		}
		this.selected = true;
		if (this.step !== undefined) {
			memory.setStep(this.step);
		}
		if (this.address !== undefined) {
			memory.highlightByte(this.address);
		}
		MemoryRef.syncMatching();
	}

	protected override referenceDisconnected(): void {
		this.clear();
	}
}
