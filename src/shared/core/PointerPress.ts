import type { ReactiveController, ReactiveControllerHost } from "lit";
import { TimelineController } from "./controllers/TimelineController";

const MINIMUM_PRESS_DURATION = 100;

/** Keeps brief pointer presses visible long enough for their feedback to render. */
export class PointerPress implements ReactiveController {
	private pointerId: number | null = null;

	private pressedAt = 0;

	private releaseTimer?: number;

	private readonly timeline: TimelineController;

	constructor(private readonly host: ReactiveControllerHost & HTMLElement) {
		this.timeline = new TimelineController(host, undefined, {
			pauseOffscreen: false,
		});
		host.addController(this);
	}

	start = (event: PointerEvent): void => {
		if (!event.isPrimary) {
			return;
		}
		this.clearReleaseTimer();
		this.pointerId = event.pointerId;
		this.timeline.resume();
		this.pressedAt = this.timeline.nowMs();
		this.host.toggleAttribute("pressing", true);
		// SAFETY: start is registered on the control's HTMLElement press surface.
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	};

	end = (event: PointerEvent): void => {
		if (event.pointerId !== this.pointerId) {
			return;
		}
		this.pointerId = null;
		const elapsed = this.timeline.nowMs() - this.pressedAt;
		const delay = Math.max(0, MINIMUM_PRESS_DURATION - elapsed);
		this.releaseTimer = this.timeline.setTimeout(() => this.finish(), delay);
	};

	hostDisconnected(): void {
		this.pointerId = null;
		this.clearReleaseTimer();
		this.host.removeAttribute("pressing");
		this.timeline.pause();
	}

	private finish(): void {
		this.releaseTimer = undefined;
		this.host.removeAttribute("pressing");
	}

	private clearReleaseTimer(): void {
		if (this.releaseTimer === undefined) {
			return;
		}
		this.timeline.clearTimeout(this.releaseTimer);
		this.releaseTimer = undefined;
	}
}
