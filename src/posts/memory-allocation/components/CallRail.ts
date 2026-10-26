import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

export interface CallRailCall {
	label: string;
	kind: "malloc" | "free";
	failed?: boolean;
}

type CallPosition = "before" | "previous" | "current" | "next" | "after";

@customElement("s-call-rail")
export class CallRail extends LitElement {
	@property({ attribute: false })
	calls: CallRailCall[] = [];

	@property({ type: Number })
	current = -1;

	static override styles = css`
		:host {
			--color-memory-call-slot: color-mix(
				in srgb,
				var(--color-surface-panel),
				var(--black) 7%
			);
			display: block;
			position: relative;
			box-sizing: border-box;
			width: 100%;
			min-height: var(--call-rail-height, var(--control-min-height));
			border-radius: var(--call-rail-border-radius, 0);
			background: var(--call-rail-background, var(--color-surface-panel));
		}

		.track,
		.rail {
			position: absolute;
			inset: 0;
			overflow: hidden;
			border-radius: inherit;
		}

		.rail::after {
			position: absolute;
			inset: 0;
			z-index: 2;
			background: linear-gradient(
				to right,
				var(--call-rail-background, var(--color-surface-panel)),
				transparent 30%,
				transparent 70%,
				var(--call-rail-background, var(--color-surface-panel))
			);
			content: "";
			pointer-events: none;
		}

		.rail {
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.current-slot {
			position: absolute;
			inset-block: 0;
			left: 50%;
			z-index: 0;
			box-sizing: border-box;
			width: var(--call-rail-slot-width, 8rem);
			background: var(--color-memory-call-slot);
			transform: translateX(-50%);
		}

		.call {
			position: absolute;
			top: 50%;
			left: 50%;
			box-sizing: border-box;
			z-index: 1;
			width: var(--call-rail-slot-width, 8rem);
			padding: 0;
			border: 0;
			border-radius: var(--radius-small);
			appearance: none;
			background: transparent;
			color: var(--color-text-secondary);
			cursor: pointer;
			font: var(--call-rail-font-size, var(--type-caption-size)) /
					var(--line-height-tight)
				var(--font-family-code);
			font-weight: var(--font-weight-bold);
			text-align: center;
			transform: translateX(calc(-50% + var(--relative-offset)))
				translateY(-50%);
			white-space: nowrap;
		}

		.call:focus-visible {
			outline: var(--focus-ring-width) solid currentColor;
			outline-offset: var(--focus-ring-offset-wide);
		}

		.call.malloc {
			color: var(--memory-text-allocated);
		}

		.call.free {
			color: var(--memory-text-free);
		}

		.call:hover,
		.call:focus-visible {
			z-index: 3;
		}

		@media (prefers-reduced-motion: no-preference) {
			.call {
				transition:
					color var(--motion-duration-state) ease,
					opacity var(--motion-duration-state) ease,
					transform var(--motion-duration-move) var(--motion-ease-out);
			}
		}
	`;

	private selectCall(index: number): void {
		this.dispatchEvent(
			new CustomEvent<number>("call-select", {
				detail: index,
				bubbles: true,
				composed: true,
			}),
		);
	}

	private position(index: number): CallPosition {
		const relativePosition = index - this.current;
		if (relativePosition < -1) {
			return "before";
		}
		if (relativePosition === -1) {
			return "previous";
		}
		if (relativePosition === 0) {
			return "current";
		}
		if (relativePosition === 1) {
			return "next";
		}
		return "after";
	}

	override render() {
		return html`
			<div class="track">
				<span
					class="current-slot"
					aria-hidden="true"
				></span>
				<ol
					class="rail"
					role="list"
				>
					${this.calls.map((call, index) => {
						const relativePosition = index - this.current;
						return html`<li>
							<button
								type="button"
								data-operation-index=${String(index)}
								aria-label=${`Go to ${call.label}`}
								style=${`--relative-offset: ${relativePosition * 100}%`}
								class=${classMap({
									call: true,
									[this.position(index)]: true,
									[call.kind]: true,
									failed: call.failed ?? false,
								})}
								@click=${() => this.selectCall(index)}
							>
								${call.label}
							</button>
						</li>`;
					})}
				</ol>
			</div>
		`;
	}
}
