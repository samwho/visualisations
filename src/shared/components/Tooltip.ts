import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ThemeController } from "../core/controllers/ThemeController";
import { badgeColours } from "./Badge";

@customElement("s-tooltip-bubble")
class TooltipBubble extends LitElement {
	@property() text = "";

	@property({ type: Boolean, reflect: true }) open = false;

	@property({ type: Boolean, reflect: true }) positioned = false;

	@property({ reflect: true }) placement: "top" | "bottom" = "bottom";

	@property({ type: Boolean, attribute: "no-animation", reflect: true })
	noAnimation = false;

	constructor() {
		super();
		new ThemeController(this);
	}

	static override styles = [
		badgeColours,
		css`
			:host {
				position: fixed;
				z-index: var(--layer-overlay);
				display: block;
				visibility: hidden;
				pointer-events: none;
				opacity: 0;
				transform: scale(0.97);
				transform-origin: calc(var(--tooltip-arrow-left, 50%) + 4px) -5px;
				transition:
					opacity var(--motion-duration-state) var(--motion-ease-out),
					transform var(--motion-duration-state) var(--motion-ease-out),
					visibility 0s linear var(--motion-duration-state);
				box-sizing: border-box;
				max-width: min(18rem, calc(100vw - 2 * var(--space-2)));
				padding: var(--space-2) var(--space-3);
				border: var(--border-width-thin) solid var(--_badge-border);
				border-radius: var(--radius-control);
				background: var(--_badge-background);
				color: var(--_badge-color);
				font: var(--type-ui-size) / var(--line-height-normal)
					var(--font-family-body);
			}
			:host([open][positioned]) {
				visibility: visible;
				pointer-events: auto;
				opacity: 1;
				transform: scale(1);
				transition-delay: 0s;
			}
			:host([placement="top"]) {
				transform-origin: calc(var(--tooltip-arrow-left, 50%) + 4px)
					calc(100% + 5px);
			}
			:host([no-animation]) {
				transition: none;
				transform: none;
			}
			@media (prefers-reduced-motion: reduce) {
				:host {
					transition: none;
					transform: none;
				}
			}
			:host([placement="top"]) .chevron {
				top: auto;
				bottom: -5px;
				transform: rotate(225deg);
			}
			.chevron {
				position: absolute;
				top: -5px;
				left: var(--tooltip-arrow-left);
				width: 8px;
				height: 8px;
				transform: rotate(45deg);
				border-top: var(--border-width-thin) solid var(--_badge-border);
				border-left: var(--border-width-thin) solid var(--_badge-border);
				background: var(--_badge-background);
			}
		`,
	];

	protected override render() {
		return html`<span
				class="chevron"
				aria-hidden="true"
			></span>
			<span role="tooltip">${this.text}</span>`;
	}
}

/** Manual hints dismiss themselves; controlled hints leave open/close ownership to the caller. */
@customElement("s-tooltip")
export class Tooltip extends LitElement {
	@property() text = "";

	@property({ attribute: "font-family" }) fontFamily = "";

	@property() trigger: "hover focus" | "manual" | "controlled" = "hover focus";

	@property({ type: Boolean, reflect: true }) open = false;

	@property() placement: "top" | "bottom" = "bottom";

	@property({ type: Boolean, attribute: "no-animation" }) noAnimation = false;

	private interactions?: AbortController;

	private readonly bubble = new TooltipBubble();

	private target?: HTMLElement;

	private describedTarget?: HTMLElement;

	private originalDescription: string | null = null;

	private targetHovered = false;

	private bubbleHovered = false;

	private targetFocused = false;

	private hideTimer?: number;

	static override styles = css`
		:host,
		slot {
			display: contents;
		}
		.status {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
	`;

	override connectedCallback(): void {
		super.connectedCallback();
		document.body.append(this.bubble);
		document.addEventListener("scroll", this.position, true);
		window.addEventListener("resize", this.position);
		this.targetChanged();
	}

	override disconnectedCallback(): void {
		this.cancelHide();
		this.bindTarget(undefined);
		document.removeEventListener("scroll", this.position, true);
		window.removeEventListener("resize", this.position);
		this.bubble.remove();
		super.disconnectedCallback();
	}

	protected override firstUpdated(): void {
		this.targetChanged();
	}

	protected override updated(changed: PropertyValues<this>): void {
		if (changed.has("text")) {
			this.bubble.text = this.text;
		}
		if (changed.has("text") || changed.has("trigger")) {
			this.bubble.setAttribute(
				"aria-hidden",
				String(this.trigger !== "hover focus"),
			);
			this.updateDescription();
		}
		if (changed.has("trigger")) {
			this.syncInteractions();
		}
		if (changed.has("open")) {
			this.bubble.open = this.open;
			if (this.open) {
				this.bubble.positioned = false;
			}
		}
		if (changed.has("noAnimation")) {
			this.bubble.noAnimation = this.noAnimation;
		}
		if (changed.has("fontFamily")) {
			this.bubble.style.fontFamily = this.fontFamily;
		}
		if (changed.has("placement")) {
			this.bubble.placement = this.placement;
		}
		if (this.open) {
			void this.bubble.updateComplete.then(this.position);
		}
	}

	/** Refresh a manually shown tooltip whose target is moving. */
	updatePosition(): void {
		this.position();
	}

	show(): void {
		this.open = true;
	}

	hide(): void {
		this.open = false;
	}

	private readonly targetChanged = (): void => {
		const target = this.renderRoot.querySelector("slot")?.assignedElements()[0];
		this.bindTarget(target instanceof HTMLElement ? target : undefined);
	};

	private bindTarget(target: HTMLElement | undefined): void {
		if (this.target === target) {
			return;
		}
		this.target = target;
		this.syncInteractions();
		this.updateDescription();
		if (this.open) {
			this.position();
		}
	}

	private syncInteractions(): void {
		this.interactions?.abort();
		this.interactions = undefined;
		this.cancelHide();
		this.targetHovered = false;
		this.bubbleHovered = false;
		this.targetFocused = false;
		if (!this.isConnected || !this.target || this.trigger === "controlled") {
			return;
		}
		this.interactions = new AbortController();
		const { signal } = this.interactions;
		this.target?.addEventListener("pointerenter", this.targetEnter, { signal });
		this.target?.addEventListener("pointerleave", this.targetLeave, { signal });
		this.target?.addEventListener("focusin", this.targetFocusIn, { signal });
		this.target?.addEventListener("focusout", this.targetFocusOut, { signal });
		this.bubble.addEventListener("pointerenter", this.bubbleEnter, { signal });
		this.bubble.addEventListener("pointerleave", this.bubbleLeave, { signal });
		document.addEventListener("pointerdown", this.outsidePointerDown, {
			capture: true,
			signal,
		});
		document.addEventListener("focusin", this.outsideFocusIn, { signal });
		document.addEventListener("keydown", this.keyDown, { signal });
	}

	private updateDescription(): void {
		this.restoreDescription();
		if (this.trigger !== "hover focus" || !this.text || !this.target) {
			return;
		}
		// The actual button may live in the target's shadow root. A text description
		// avoids an ID reference across the tooltip bubble's separate shadow root.
		this.describedTarget =
			this.target.shadowRoot?.querySelector<HTMLElement>(
				"button, a[href], input, select, textarea, [tabindex]",
			) ?? this.target;
		this.originalDescription =
			this.describedTarget.getAttribute("aria-description");
		this.describedTarget.setAttribute(
			"aria-description",
			[this.originalDescription, this.text].filter(Boolean).join(" "),
		);
	}

	private restoreDescription(): void {
		if (!this.describedTarget) {
			return;
		}
		if (this.originalDescription === null) {
			this.describedTarget.removeAttribute("aria-description");
		} else {
			this.describedTarget.setAttribute(
				"aria-description",
				this.originalDescription,
			);
		}
		this.describedTarget = undefined;
		this.originalDescription = null;
	}

	private readonly targetEnter = (event: PointerEvent): void => {
		if (event.pointerType === "mouse" || event.pointerType === "pen") {
			this.cancelHide();
			this.targetHovered = true;
			if (this.trigger !== "manual") {
				this.show();
			}
		}
	};

	private readonly targetLeave = (): void => {
		this.targetHovered = false;
		this.hideWhenIdle();
	};

	private readonly targetFocusIn = (): void => {
		this.cancelHide();
		this.targetFocused = true;
		if (this.trigger !== "manual") {
			this.show();
		}
	};

	private readonly targetFocusOut = (): void => {
		this.targetFocused = false;
		if (this.trigger !== "manual") {
			this.hideWhenIdle();
		}
	};

	private readonly bubbleEnter = (): void => {
		this.cancelHide();
		this.bubbleHovered = true;
	};

	private readonly bubbleLeave = (): void => {
		this.bubbleHovered = false;
		this.hideWhenIdle();
	};

	private hideWhenIdle(): void {
		if (this.trigger !== "manual") {
			this.cancelHide();
			this.hideTimer = window.setTimeout(() => {
				if (!this.targetHovered && !this.bubbleHovered && !this.targetFocused) {
					this.hide();
				}
			}, 100);
		}
	}

	private cancelHide(): void {
		window.clearTimeout(this.hideTimer);
		this.hideTimer = undefined;
	}

	private readonly outsidePointerDown = (event: PointerEvent): void => {
		const path = event.composedPath();
		if (this.open && !path.includes(this) && !path.includes(this.bubble)) {
			this.hide();
		}
	};

	private readonly outsideFocusIn = (event: FocusEvent): void => {
		if (
			this.open &&
			this.trigger === "manual" &&
			!event.composedPath().includes(this)
		) {
			this.hide();
		}
	};

	private readonly keyDown = (event: KeyboardEvent): void => {
		if (event.key === "Escape") {
			this.hide();
		}
	};

	private readonly position = (): void => {
		if (!this.open || !this.target) {
			return;
		}
		const anchor = this.target.getBoundingClientRect();
		// Measure layout dimensions so the scale transition cannot move the anchor.
		const width = this.bubble.offsetWidth;
		const center = anchor.left + anchor.width / 2;
		const margin = 8;
		const left = Math.max(
			margin,
			Math.min(center - width / 2, window.innerWidth - width - margin),
		);
		this.bubble.style.left = `${left}px`;
		this.bubble.style.top = `${
			this.placement === "top"
				? anchor.top - this.bubble.offsetHeight - 12
				: anchor.bottom + 12
		}px`;
		this.bubble.style.setProperty(
			"--tooltip-arrow-left",
			`${Math.max(12, Math.min(center - left - 4, width - 20))}px`,
		);
		this.bubble.positioned = true;
	};

	protected override render() {
		return html`<slot @slotchange=${this.targetChanged}></slot>
			<span
				class="status"
				role="status"
				>${this.trigger === "manual" && this.open ? this.text : ""}</span
			>`;
	}
}
