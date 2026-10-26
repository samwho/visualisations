import { MediaQueryController } from "../../core/controllers/MediaQueryController";
import { html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import type { Debugger } from "./Debugger";
import { DebuggerConnectedElement } from "./DebuggerConnectedElement";
import type { Scope } from "../Program";
import { AnimationController } from "../../core/controllers/AnimationController";
import { VisibilityController } from "../../core/controllers/VisibilityController";
import { prefersReducedMotion } from "../../Accessibility";

@customElement("s-array")
export class ArrayViewer extends DebuggerConnectedElement {
	constructor() {
		super();
		this.motion.addEventListener("change", this.stopReducedMotion);
		this.visibility.addEventListener("hidden", () =>
			this.animations.cancelAnimations(),
		);
	}

	@property() ref = "a";

	@state() private values: number[] = [];

	private initial: number[] = [];

	private readonly animations = new AnimationController(this);

	private readonly positions = new Map<Element, DOMRect>();

	private readonly motion = new MediaQueryController(
		this,
		"(prefers-reduced-motion: reduce)",
	);

	private readonly visibility = new VisibilityController(this);

	protected override onDebuggerConnected(debuggerElement: Debugger): void {
		this.initial = debuggerElement.initialArray(this.ref);
		this.values = [...this.initial];
	}

	static override styles = css`
		:host {
			display: inline-block;
			max-width: 100%;
			font-family: var(--font-family-code);
			font-size: inherit;
			line-height: var(--line-height-normal);
			color: var(--color-text-code);
		}
		.array {
			display: inline-grid;
			align-items: baseline;
		}
		.array > span {
			grid-row: 1;
		}
		.item {
			display: inline-block;
			color: var(--color-syntax-literal);
		}
		.separator {
			white-space: pre;
		}
	`;

	private readonly stopReducedMotion = (): void => {
		if (this.motion?.matches) {
			this.animations.cancelAnimations();
		}
	};

	protected override onDebuggerStep(scope: Scope | undefined): void {
		const current = scope?.[this.ref];
		const values = Array.isArray(current) ? current : this.initial;
		if (
			values.length !== this.values.length ||
			values.some((value, index) => value !== this.values[index])
		) {
			this.values = [...values];
		}
	}

	protected override willUpdate(changed: Map<string, unknown>): void {
		if (!changed.has("values")) {
			return;
		}
		this.positions.clear();
		if (!prefersReducedMotion() && !this.visibility.isHidden) {
			for (const item of this.renderRoot.querySelectorAll(".item")) {
				this.positions.set(item, item.getBoundingClientRect());
			}
		}
		this.animations.cancelAnimations();
	}

	protected override updated(): void {
		const moves: { element: Element; x: number }[] = [];
		if (
			!prefersReducedMotion() &&
			this.isConnected &&
			!this.visibility.isHidden
		) {
			for (const [element, before] of this.positions) {
				const x = before.left - element.getBoundingClientRect().left;
				if (x !== 0) {
					moves.push({ element, x });
				}
			}
		}
		this.positions.clear();
		for (const { element, x } of moves) {
			this.animations.trackAnimation(
				element.animate(
					[{ transform: `translateX(${x}px)` }, { transform: "translateX(0)" }],
					{ duration: 200, easing: "ease-in-out" },
				),
			);
		}
	}

	protected override render() {
		return html`<span
			class="array"
			role="img"
			aria-label=${this.ref + " = " + this.values.join(", ")}
		>
			<span style="grid-column: 1">[</span>
			${repeat(
				this.values,
				(value) => value,
				(value, index) =>
					html`<span
						class="item"
						style=${"grid-column: " + (index * 2 + 2)}
						>${value}</span
					>`,
			)}
			${this.values.slice(1).map(
				(_, index) =>
					html`<span
						class="separator"
						style=${"grid-column: " + (index * 2 + 3)}
						>${", "}</span
					>`,
			)}
			<span style=${"grid-column: " + (this.values.length * 2 + 1)}>]</span>
		</span>`;
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.positions.clear();
	}
}
