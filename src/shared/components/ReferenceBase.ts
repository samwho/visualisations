import { css, html, LitElement, type CSSResultGroup } from "lit";
import { property } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import search from "../../../static/images/icons/framework7/cropped/search.svg";
import { prefersReducedMotion } from "../Accessibility";
import { TargetController } from "../core/controllers/TargetController";
import type { BadgeVariant } from "./Badge";

export interface ReferenceBinding {
	targetElement():
		| HTMLElement
		| null
		| undefined
		| Promise<HTMLElement | null | undefined>;
	scrollOnSelect?: boolean;
	toggleSelection(): void;
	isSelected(): boolean;
}

export abstract class ReferenceBase<
	TTarget extends HTMLElement,
> extends LitElement {
	@property({ reflect: true }) variant: BadgeVariant | "page" = "neutral";

	protected readonly referenceTarget = new TargetController<TTarget>(this, {
		id: () => this.targetId(),
		isTarget: (element): element is TTarget => this.isTarget(element),
	});

	private targetResolution = 0;

	constructor() {
		super();
		this.referenceTarget.addEventListener("connected", (event) => {
			// SAFETY: TargetController emits connected with the matched target.
			this.targetConnected((event as CustomEvent<TTarget>).detail);
		});
		this.referenceTarget.addEventListener("disconnected", (event) => {
			// SAFETY: TargetController emits disconnected with the matched target.
			this.targetDisconnected((event as CustomEvent<TTarget>).detail);
		});
	}

	static override styles: CSSResultGroup = css`
		:host {
			--_reference-background: var(--color-surface-code);
			--_reference-active-background: var(--color-surface-code-selected);
			--_reference-color: var(--color-text-primary);
			display: inline-block;
			vertical-align: baseline;
			white-space: nowrap;
			touch-action: manipulation;
		}
		:host([variant="orange"]) {
			--_reference-background: var(--color-palette-orange-surface);
			--_reference-active-background: var(
				--color-palette-orange-surface-strong
			);
			--_reference-color: var(--color-palette-orange-foreground);
		}
		:host([variant="page"]) {
			--_reference-background: var(--color-surface-page);
			--_reference-active-background: var(--color-surface-page);
			--_reference-color: var(--color-text-primary);
		}
		:host([variant="blue"]) {
			--_reference-background: var(--color-palette-blue-surface);
			--_reference-active-background: var(--color-palette-blue-surface-strong);
			--_reference-color: var(--color-palette-blue-foreground);
		}
		:host([variant="green"]) {
			--_reference-background: var(--color-palette-green-surface);
			--_reference-active-background: var(--color-palette-green-surface-strong);
			--_reference-color: var(--color-palette-green-foreground);
		}
		:host([variant="yellow"]) {
			--_reference-background: var(--color-palette-yellow-surface);
			--_reference-active-background: var(
				--color-palette-yellow-surface-strong
			);
			--_reference-color: var(--color-palette-yellow-foreground);
		}
		:host([variant="dark-blue"]) {
			--_reference-background: var(--color-palette-dark-blue-surface);
			--_reference-active-background: var(
				--color-palette-dark-blue-surface-strong
			);
			--_reference-color: var(--color-palette-dark-blue-foreground);
		}
		:host([variant="red"]) {
			--_reference-background: var(--color-palette-red-surface);
			--_reference-active-background: var(--color-palette-red-surface-strong);
			--_reference-color: var(--color-palette-red-foreground);
		}
		:host([variant="pink"]) {
			--_reference-background: var(--color-palette-pink-surface);
			--_reference-active-background: var(--color-palette-pink-surface-strong);
			--_reference-color: var(--color-palette-pink-foreground);
		}
		:host([variant="grey"]) {
			--_reference-background: var(--color-palette-grey-surface);
			--_reference-active-background: var(--color-palette-grey-surface-strong);
			--_reference-color: var(--color-palette-grey-foreground);
		}
		button {
			position: relative;
			display: inline-flex;
			align-items: center;
			gap: 0.25em;
			min-inline-size: var(--control-target-min-size);
			min-block-size: var(--control-target-min-size);
			padding: 0 0.3em;
			border: 0;
			border-radius: var(--radius-small);
			background: var(--_reference-background);
			color: var(--_reference-color);
			font: inherit;
			font-family: var(--font-family-code);
			font-size: 0.9em;
			line-height: 1;
			vertical-align: baseline;
			white-space: nowrap;
			cursor: pointer;
			touch-action: manipulation;
			transition: background-color var(--motion-duration-state) ease;
		}
		:host([active]) button {
			background: var(--_reference-active-background);
		}
		:host([active]) button::after {
			position: absolute;
			left: 50%;
			transform: translateX(-50%);
			border-right: 0.4em solid transparent;
			border-left: 0.4em solid transparent;
			pointer-events: none;
			content: "";
		}
		:host([active][data-target-direction="up"]) button::after {
			bottom: calc(100% - 1px);
			border-bottom: 0.45em solid var(--_reference-active-background);
		}
		:host([active][data-target-direction="down"]) button::after {
			top: calc(100% - 1px);
			border-top: 0.45em solid var(--_reference-active-background);
		}
		.icon,
		.icon svg {
			display: block;
			inline-size: 0.75em;
			block-size: 0.75em;
		}
		slot,
		.icon {
			pointer-events: none;
		}
		.icon svg {
			fill: currentColor;
		}
		button:focus-visible {
			outline: var(--focus-ring-width) solid var(--color-border-focus);
			outline-offset: var(--focus-ring-offset);
		}
		@media (prefers-reduced-motion: reduce) {
			button {
				transition: none;
			}
		}
	`;

	protected abstract targetId(): string;

	protected abstract isTarget(element: HTMLElement): element is TTarget;

	protected abstract getBinding(target: TTarget): ReferenceBinding | undefined;

	protected abstract get accessibleLabel(): string;

	protected get binding(): ReferenceBinding | undefined {
		const target = this.referenceTarget.element;
		return target ? this.getBinding(target) : undefined;
	}

	protected targetConnected(_target: TTarget): void {}

	protected targetDisconnected(_target: TTarget): void {}

	protected referenceDisconnected(): void {}

	protected renderReferenceValue() {
		return html`<slot></slot>`;
	}

	protected renderButtonContent() {
		return html`${this.renderReferenceValue()}<span
				class="icon"
				aria-hidden="true"
				>${unsafeSVG(search)}</span
			>`;
	}

	protected syncReferenceState(scrollOnSelect = false): void {
		const binding = this.binding;
		const selected = binding?.isSelected() ?? false;
		this.toggleAttribute("active", selected);
		delete this.dataset.targetDirection;
		const resolution = ++this.targetResolution;
		if (selected && binding) {
			void this.resolveTarget(binding, resolution, scrollOnSelect);
		}
		this.requestUpdate();
	}

	private async resolveTarget(
		binding: ReferenceBinding,
		resolution: number,
		scrollOnSelect: boolean,
	): Promise<void> {
		const element = await binding.targetElement();
		if (
			!element ||
			!element.isConnected ||
			!this.isConnected ||
			resolution !== this.targetResolution ||
			!binding.isSelected()
		) {
			return;
		}
		const reference = this.getBoundingClientRect();
		const bounds = element.getBoundingClientRect();
		this.dataset.targetDirection =
			bounds.top + bounds.height / 2 < reference.top + reference.height / 2
				? "up"
				: "down";
		if (!scrollOnSelect || binding.scrollOnSelect === false) {
			return;
		}
		if (
			bounds.top >= 0 &&
			bounds.bottom <= window.innerHeight &&
			bounds.left >= 0 &&
			bounds.right <= window.innerWidth
		) {
			return;
		}
		element.scrollIntoView({
			behavior: prefersReducedMotion() ? "auto" : "smooth",
			block: "nearest",
			inline: "nearest",
		});
	}

	private readonly toggleSelection = (): void => {
		const binding = this.binding;
		if (!binding) {
			return;
		}
		binding.toggleSelection();
		this.syncReferenceState(true);
	};

	override disconnectedCallback(): void {
		this.referenceDisconnected();
		super.disconnectedCallback();
	}

	protected override render() {
		const binding = this.binding;
		return html`<button
			type="button"
			aria-label=${this.accessibleLabel}
			aria-pressed=${binding?.isSelected() ? "true" : "false"}
			?disabled=${!binding}
			@click=${this.toggleSelection}
		>
			${this.renderButtonContent()}
		</button>`;
	}
}
