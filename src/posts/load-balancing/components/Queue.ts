import { css, html, LitElement } from "lit";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { customElement, property } from "lit/decorators.js";
import { prefersReducedMotion } from "../../../shared/Accessibility";
import { QUEUE_MOTION_DURATION } from "../globals";
import type { Request } from "./Request";

const QUEUE_ITEM_SPACING = 20;
const QUEUE_BOTTOM_INSET = 4;
const QUEUE_HEIGHT_INSET = 5;
// The simulation's 24px queue has a 22px-wide positioning box.
const QUEUE_CENTER_X = 11;
const QUEUE_TOP_BORDER = 1;
const QUEUE_ANIMATION_ID = "queue-motion";

@customElement("s-queue")
export class Queue extends LitElement {
	constructor() {
		super();
		new ThemeController(this);
	}

	static override styles = css`
		:host {
			display: block;
			position: absolute;
		}

		.queue-slot {
			position: absolute;
			z-index: 0;
			width: 20px;
			height: 20px;
			border-radius: var(--radius-circle);
			background: var(--simulation-queue-background);
			opacity: 0.45;
			pointer-events: none;
			transform: translate(-50%, -50%);
		}
	`;

	@property({ type: Number })
	capacity = 0;

	protected override render() {
		return html`
			${Array.from(
				{ length: this.capacity },
				(_, index) =>
					html`<span
						class="queue-slot"
						aria-hidden="true"
						style=${`left: 50%; top: calc(100% - ${QUEUE_BOTTOM_INSET + index * QUEUE_ITEM_SPACING}px)`}
					></span>`,
			)}
			<slot></slot>
		`;
	}

	place(requests: Request[], animate = true): void {
		if (!animate) {
			this.position(requests);
			return;
		}

		const placements = requests.map((request, index) => ({
			request,
			first: request.visualElement?.getBoundingClientRect(),
			passesUnderRequest: request.parentElement !== this && index > 0,
		}));
		for (const { request } of placements) {
			this.cancelMotion(request);
		}
		this.position(requests);

		if (prefersReducedMotion()) {
			return;
		}

		for (const { request, first, passesUnderRequest } of placements) {
			const last = request.visualElement?.getBoundingClientRect();
			if (!first || !last) {
				continue;
			}
			const deltaX = first.left - last.left;
			const deltaY = first.top - last.top;
			if (deltaX === 0 && deltaY === 0) {
				continue;
			}
			if (passesUnderRequest) {
				// Keep a newly queued request below the existing queue while it
				// travels through it. It regains its normal stacking order once it
				// reaches its slot.
				request.style.zIndex = "1";
			}
			const animation = request.playMotion(
				passesUnderRequest
					? [
							{ translate: `${deltaX}px ${deltaY}px`, scale: 1 },
							{
								translate: `${deltaX * 0.45}px ${deltaY * 0.45 + 3}px`,
								scale: 0.62,
								offset: 0.58,
							},
							{ translate: "0px 0px", scale: 1 },
						]
					: [
							{ translate: `${deltaX}px ${deltaY}px` },
							{ translate: "0px 0px" },
						],
				{
					duration: QUEUE_MOTION_DURATION,
					easing: "cubic-bezier(0.22, 1, 0.36, 1)",
					fill: "both",
				},
				QUEUE_ANIMATION_ID,
			);
			void animation.finished.then(
				() => this.finishMotion(request, animation),
				() => this.finishMotion(request, animation),
			);
		}
	}

	private position(requests: Request[]): void {
		for (const [index, request] of requests.entries()) {
			if (request.parentElement !== this) {
				this.append(request);
			}
			request.moveTo(
				QUEUE_CENTER_X,
				this.capacity * QUEUE_ITEM_SPACING -
					QUEUE_HEIGHT_INSET -
					QUEUE_BOTTOM_INSET -
					QUEUE_TOP_BORDER -
					index * QUEUE_ITEM_SPACING,
			);
		}
	}

	take(request: Request): void {
		this.cancelMotion(request);
		request.remove();
	}

	override disconnectedCallback(): void {
		for (const request of this.querySelectorAll<Request>("s-request")) {
			this.cancelMotion(request);
		}
		super.disconnectedCallback();
	}

	private cancelMotion(request: Request): void {
		request.cancelMotion();
		request.style.removeProperty("z-index");
	}

	private finishMotion(request: Request, animation: Animation): void {
		if (!request.hasMotion) {
			request.style.removeProperty("z-index");
		}
		animation.cancel();
	}
}
