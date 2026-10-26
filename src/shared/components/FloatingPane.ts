import { MediaQueryController } from "../core/controllers/MediaQueryController";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import minimize from "../../../static/images/icons/framework7/cropped/arrow_down_right_arrow_up_left.svg";
import maximize from "../../../static/images/icons/framework7/cropped/arrow_up_left_arrow_down_right.svg";
import "./Button";
import { AnimationController } from "../core/controllers/AnimationController";
import { prefersReducedMotion } from "../Accessibility";

/** The parent supplies a positioned containing block (for example, position: relative). */
@customElement("s-floating-pane")
export class FloatingPane extends LitElement {
	@property({ type: Boolean, reflect: true })
	collapsible = false;

	@property({ type: String, reflect: true })
	position: "top-left" | "top-right" | "bottom-left" | "bottom-right" =
		"bottom-right";

	@property({ type: Boolean, reflect: true })
	collapsed = false;

	@property({ type: String })
	label = "pane";

	private readonly animations = new AnimationController(this);

	private previousBounds?: DOMRect;

	private previousContent?: {
		width: number;
		height: number;
		transform: string;
	};

	private restoreContent?: () => void;

	private readonly motion = new MediaQueryController(
		this,
		"(prefers-reduced-motion: reduce)",
	);

	constructor() {
		super();
		this.motion.addEventListener("change", this.motionChanged);
	}

	override disconnectedCallback(): void {
		this.previousBounds = undefined;
		this.restoreContent?.();
		super.disconnectedCallback();
	}

	private readonly motionChanged = (): void => {
		if (this.motion?.matches) {
			this.animations.cancelAnimations();
			this.restoreContent?.();
		}
	};

	protected override willUpdate(changed: PropertyValues): void {
		if (
			this.hasUpdated &&
			(changed.has("collapsed") || changed.has("collapsible"))
		) {
			// Capture the current animated size before cancelling, so rapid toggles reverse smoothly.
			this.previousBounds = this.getBoundingClientRect();
			const content = this.renderRoot.querySelector<HTMLElement>(".content")!;
			const style = getComputedStyle(content);
			this.previousContent = {
				width: Number.parseFloat(style.width),
				height: Number.parseFloat(style.height),
				transform:
					content.hidden === true && this.restoreContent === undefined
						? "scale(0)"
						: style.transform,
			};
			this.animations.cancelAnimations();
			this.restoreContent?.();
		}
	}

	protected override updated(): void {
		const before = this.previousBounds;
		const previousContent = this.previousContent;
		this.previousBounds = undefined;
		this.previousContent = undefined;
		if (!before || !this.isConnected || prefersReducedMotion()) {
			return;
		}
		const after = this.getBoundingClientRect();
		if (
			!before.width ||
			!before.height ||
			!after.width ||
			!after.height ||
			(before.width === after.width && before.height === after.height)
		) {
			return;
		}
		const timing = { duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" };
		const collapsed = this.collapsible && this.collapsed;
		const content = this.renderRoot.querySelector<HTMLElement>(".content")!;
		const style = getComputedStyle(content);
		const width = collapsed
			? previousContent!.width
			: Number.parseFloat(style.width);
		const height = collapsed
			? previousContent!.height
			: Number.parseFloat(style.height);
		// Preserve subpixel sizes: offsetWidth rounding can wrap the body's text.
		// Freeze the body's expanded layout while the frame resizes around it.
		content.style.width = `${width}px`;
		content.style.height = `${height}px`;
		content.style.flexShrink = "0";
		content.style.display = "block";
		const restore = () => {
			content.style.removeProperty("width");
			content.style.removeProperty("height");
			content.style.removeProperty("flex-shrink");
			content.style.removeProperty("display");
			this.restoreContent = undefined;
		};

		this.restoreContent = restore;
		this.animations.trackAnimation(
			this.animate(
				[
					{ width: `${before.width}px`, height: `${before.height}px` },
					{ width: `${after.width}px`, height: `${after.height}px` },
				],
				timing,
			),
		);
		const animation = this.animations.trackAnimation(
			content.animate(
				[
					{ transform: previousContent!.transform },
					{ transform: collapsed ? "scale(0)" : "scale(1)" },
				],
				timing,
			),
		);
		void animation.finished.then(
			() => {
				if (this.restoreContent === restore) {
					restore();
				}
			},
			() => {},
		);
	}

	static override styles = css`
		:host {
			position: absolute;
			right: var(--space-3);
			bottom: var(--space-3);
			z-index: var(--layer-floating);
			max-width: calc(100% - 2 * var(--space-3));
			max-height: calc(100% - 2 * var(--space-3));
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			min-width: 0;
			border: var(--border-width-thin) solid var(--color-border-subtle);
			border-radius: var(--radius-control);
			background: var(--color-surface-default);
			overflow: hidden;
		}
		:host([position^="top-"]) {
			top: var(--space-3);
			bottom: auto;
		}
		:host([position$="-left"]) {
			left: var(--space-3);
			right: auto;
		}
		.header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-2);
			flex-shrink: 0;
			padding: var(--space-1);
			padding-inline-start: var(--space-2);
			background: var(--color-surface-panel);
			font: var(--font-weight-bold) var(--font-size-xsmall)
				var(--font-family-code);
		}
		:host(:not([collapsible][collapsed])) .header {
			border-bottom: var(--border-width-thin) dotted
				var(--color-border-separator);
		}
		slot[name="header"] {
			min-width: 0;
		}
		::slotted([slot="header"]) {
			margin: 0;
			font: inherit;
		}
		.content {
			min-height: 0;
			overflow: auto;
			transform-origin: right top;
		}
		:host([position$="-left"]) .content {
			transform-origin: left top;
		}
		.content[hidden] {
			display: none;
		}
		.body {
			padding: var(--space-2);
		}
		slot[name="footer"]::slotted(*) {
			box-sizing: border-box;
			width: 100%;
			padding: var(--space-2);
			border-top: var(--border-width-thin) dotted var(--color-border-separator);
			background: var(--color-surface-panel);
		}
		s-button {
			--button-border-radius: max(
				0px,
				calc(var(--radius-control) - var(--border-width-thin) - var(--space-1))
			);
		}
		svg {
			width: 100%;
			height: 100%;
			fill: currentColor;
		}
	`;

	private readonly toggle = (): void => {
		this.collapsed = !this.collapsed;
	};

	protected override render() {
		const collapsed = this.collapsible && this.collapsed;
		return html`
			<div class="header">
				<slot name="header"></slot>
				${
					this.collapsible
						? html`
								<s-button
									appearance="ghost"
									variant="neutral"
									size="xs"
									label=${`${collapsed ? "Maximize" : "Minimize"} ${this.label}`}
									.expanded=${!collapsed}
									@click=${this.toggle}
								>
									<span
										slot="icon"
										aria-hidden="true"
										>${unsafeSVG(collapsed ? maximize : minimize)}</span
									>
								</s-button>
							`
						: nothing
				}
			</div>
			<div
				class="content"
				?hidden=${collapsed}
				?inert=${collapsed}
			>
				<div class="body"><slot></slot></div>
				<slot name="footer"></slot>
			</div>
		`;
	}
}
