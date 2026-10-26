import { html, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ReferenceBase, type ReferenceBinding } from "./ReferenceBase";

export function prepareCodeReferences(root: ParentNode = document): void {
	for (const code of root.querySelectorAll<HTMLElement>(
		"pre.giallo > code[data-ref]",
	)) {
		code.id = `code-${code.dataset.ref}`;
	}
}

@customElement("s-coderef")
export class CodeRef extends ReferenceBase<HTMLElement> {
	private static active?: CodeRef;

	@property() target = "";

	@property({ type: Number }) line = 0;

	private selected = false;

	private getLine(code: HTMLElement): HTMLElement | undefined {
		return code.querySelectorAll<HTMLElement>(":scope > .giallo-l")[
			this.line - 1
		];
	}

	private get lineElement(): HTMLElement | undefined {
		const code = this.referenceTarget.element;
		return code ? this.getLine(code) : undefined;
	}

	protected override targetId(): string {
		return `code-${this.target}`;
	}

	protected override isTarget(element: HTMLElement): element is HTMLElement {
		return element.localName === "code" && element.dataset.ref === this.target;
	}

	protected override targetConnected(code: HTMLElement): void {
		const line = this.getLine(code);
		if (line) {
			line.style.borderRadius = "var(--radius-small)";
			line.style.transition =
				"background-color var(--motion-duration-state) ease, box-shadow var(--motion-duration-state) ease";
		}
	}

	protected override getBinding(
		code: HTMLElement,
	): ReferenceBinding | undefined {
		const line = this.getLine(code);
		if (!line) {
			return;
		}
		return {
			targetElement: () => line,
			scrollOnSelect: false,
			toggleSelection: () => {
				if (CodeRef.active === this && this.selected) {
					this.clear();
				} else {
					this.activate();
				}
			},
			isSelected: () => this.selected,
		};
	}

	protected override get accessibleLabel(): string {
		return `Highlight line ${this.line} in the code example`;
	}

	protected override renderReferenceValue() {
		return html`${this.line}`;
	}

	protected override updated(changed: PropertyValues): void {
		if (changed.has("variant") && this.hasAttribute("active")) {
			this.setHighlight(true);
		}
	}

	private setHighlight(active: boolean): void {
		const line = this.lineElement;
		if (!line) {
			return;
		}
		const highlight =
			this.variant === "neutral"
				? "var(--color-surface-code-selected)"
				: `var(--color-palette-${this.variant}-surface)`;
		line.style.backgroundColor = active ? highlight : "";
		// Extend across the code block's padding without changing row geometry.
		line.style.boxShadow = active
			? `calc(-1 * var(--space-4)) 0 0 ${highlight}, var(--space-4) 0 0 ${highlight}`
			: "";
	}

	private clear(): void {
		this.setHighlight(false);
		this.selected = false;
		if (CodeRef.active === this) {
			CodeRef.active = undefined;
		}
		this.syncReferenceState();
	}

	private activate(): void {
		if (!this.lineElement) {
			return;
		}
		if (CodeRef.active !== this) {
			CodeRef.active?.clear();
			CodeRef.active = this;
		}
		this.selected = true;
		this.setHighlight(true);
	}

	protected override referenceDisconnected(): void {
		this.clear();
	}
}
