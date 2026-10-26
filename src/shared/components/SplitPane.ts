import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ResizeController } from "../core/controllers/ResizeController";
import { ThemeController } from "../core/controllers/ThemeController";

export type SplitLayout = "row" | "column" | "row-reverse" | "column-reverse";
const MINIMUM = 20;
const MAXIMUM = 80;

/** Slots one/two run left-to-right or top-to-bottom, unless explicitly reversed.
 * Layouts follow the component's width. Emits change after dragging or keyboard resizing.
 */
@customElement("s-split-pane")
export class SplitPane extends LitElement {
	@property({ attribute: "small-layout" }) smallLayout: SplitLayout = "column";

	@property({ attribute: "large-layout" }) largeLayout: SplitLayout = "row";

	/** Use smallLayout at or below this component width, in CSS pixels. */
	@property({ type: Number }) breakpoint = 1000;

	@state() private width = 0;

	@state() private value = 50;

	@state() private dragging = false;

	private previousCursor = "";

	constructor() {
		super();
		new ThemeController(this);
		// JS also keeps the separator's ARIA, keyboard axis and slot order in sync.
		const resize = new ResizeController(this);
		resize.addEventListener("resize", () => {
			this.width = this.clientWidth;
		});
	}

	private get layout(): SplitLayout {
		return this.width <= this.breakpoint ? this.smallLayout : this.largeLayout;
	}

	private get stacked(): boolean {
		return this.layout === "column" || this.layout === "column-reverse";
	}

	static override styles = css`
		:host {
			--color-border-split: var(--stone-300);
			--color-action-grip: var(--stone-400);
			--color-action-grip-active: var(--palette-blue);
			display: block;
			width: 100%;
			height: 100%;
			min-width: 0;
			min-height: 0;
		}
		:host([data-theme="dark"]) {
			--color-border-split: var(--stone-700);
			--color-action-grip: var(--stone-600);
		}
		.panes {
			position: relative;
			display: grid;
			grid-template-columns: var(--split-position) minmax(0, 1fr);
			width: 100%;
			height: 100%;
		}
		.panel {
			min-width: 0;
			min-height: 0;
			overflow: hidden;
		}
		::slotted(*) {
			box-sizing: border-box;
			width: 100%;
			height: 100%;
			min-width: 0;
			min-height: 0;
		}
		.handle {
			position: absolute;
			z-index: var(--layer-floating);
			top: 0;
			bottom: 0;
			left: var(--split-position);
			width: var(--control-target-min-size);
			transform: translateX(-50%);
			cursor: col-resize;
			touch-action: none;
			outline: none;
		}
		.handle::before {
			position: absolute;
			inset: 0 auto 0 50%;
			width: var(--border-width-thick);
			background: var(--color-border-split);
			content: "";
			transform: translateX(-50%);
		}
		.handle::after {
			position: absolute;
			top: 50%;
			left: 50%;
			width: var(--space-1);
			height: var(--space-8);
			border-radius: var(--radius-pill);
			background: var(--color-action-grip);
			content: "";
			transform: translate(-50%, -50%);
		}
		.handle::before,
		.handle::after {
			transition: background-color var(--motion-duration-press) ease;
		}
		.handle:focus-visible::before,
		.handle:focus-visible::after,
		.handle.dragging::before,
		.handle.dragging::after {
			background: var(--color-action-grip-active);
		}
		@media (hover: hover) and (pointer: fine) {
			.handle:hover::before,
			.handle:hover::after {
				background: var(--color-action-grip-active);
			}
		}

		.stacked {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: var(--split-position) minmax(0, 1fr);
		}
		.stacked .handle {
			top: var(--split-position);
			right: 0;
			bottom: auto;
			left: 0;
			width: auto;
			height: var(--control-target-min-size);
			transform: translateY(-50%);
			cursor: row-resize;
		}
		.stacked .handle::before {
			inset: 50% 0 auto 0;
			width: auto;
			height: var(--border-width-thick);
			transform: translateY(-50%);
		}
		.stacked .handle::after {
			width: var(--space-8);
			height: var(--space-1);
		}
		@media (prefers-reduced-motion: reduce) {
			.handle::before,
			.handle::after {
				transition: none;
			}
		}
	`;

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.restoreCursor();
	}

	private applyValue(value: number): void {
		this.value = Math.round(Math.min(MAXIMUM, Math.max(MINIMUM, value)));
	}

	private notify(): void {
		void this.updateComplete.then(() => {
			if (this.isConnected) {
				this.dispatchEvent(
					new Event("change", { bubbles: true, composed: true }),
				);
			}
		});
	}

	private valueFromPointer(event: PointerEvent): number {
		const bounds = this.getBoundingClientRect();
		return this.stacked
			? ((event.clientY - bounds.top) / bounds.height) * 100
			: ((event.clientX - bounds.left) / bounds.width) * 100;
	}

	private handlePointerDown(event: PointerEvent): void {
		if (!event.isPrimary || event.button !== 0) {
			return;
		}
		event.preventDefault();
		// SAFETY: the template binds pointerdown directly to the separator HTMLElement.
		const handle = event.currentTarget as HTMLElement;
		handle.focus();
		handle.setPointerCapture(event.pointerId);
		this.previousCursor = document.documentElement.style.cursor;
		this.dragging = true;
		document.documentElement.style.cursor = this.stacked
			? "row-resize"
			: "col-resize";
	}

	private handlePointerMove(event: PointerEvent): void {
		// SAFETY: the template binds pointermove directly to the separator HTMLElement.
		const handle = event.currentTarget as HTMLElement;
		if (!handle.hasPointerCapture(event.pointerId)) {
			return;
		}
		this.applyValue(this.valueFromPointer(event));
	}

	private restoreCursor(): void {
		if (!this.dragging) {
			return;
		}
		this.dragging = false;
		document.documentElement.style.cursor = this.previousCursor;
	}

	private finishPointer(): void {
		if (!this.dragging) {
			return;
		}
		this.restoreCursor();
		this.notify();
	}

	private handleKeyDown(event: KeyboardEvent): void {
		let value = this.value;
		switch (event.key) {
			case "Home":
				value = MINIMUM;
				break;
			case "End":
				value = MAXIMUM;
				break;
			case "ArrowLeft":
				if (this.stacked) {
					return;
				}
				value -= 5;
				break;
			case "ArrowRight":
				if (this.stacked) {
					return;
				}
				value += 5;
				break;
			case "ArrowUp":
				if (!this.stacked) {
					return;
				}
				value -= 5;
				break;
			case "ArrowDown":
				if (!this.stacked) {
					return;
				}
				value += 5;
				break;
			default:
				return;
		}
		event.preventDefault();
		this.applyValue(value);
		this.notify();
	}

	protected override render() {
		// Reorder slots, not just CSS, so keyboard order follows the visual layout.
		const reversed = this.layout.endsWith("-reverse");
		return html`
			<div
				class="panes ${this.stacked ? "stacked" : ""}"
				style="--split-position: ${this.value}%"
			>
				<div
					class="panel"
					id="first"
				>
					<slot name=${reversed ? "two" : "one"}></slot>
				</div>
				<div
					class="handle ${this.dragging ? "dragging" : ""}"
					role="separator"
					tabindex="0"
					aria-label="Resize panels"
					aria-controls="first"
					aria-orientation=${this.stacked ? "horizontal" : "vertical"}
					aria-valuemin=${MINIMUM}
					aria-valuemax=${MAXIMUM}
					aria-valuenow=${this.value}
					@keydown=${this.handleKeyDown}
					@pointerdown=${this.handlePointerDown}
					@pointermove=${this.handlePointerMove}
					@lostpointercapture=${this.finishPointer}
				></div>
				<div class="panel">
					<slot name=${reversed ? "one" : "two"}></slot>
				</div>
			</div>
		`;
	}
}
