import type { ReactiveController } from "lit";
import type { ControllerHost } from "./ElementControllerHost";
import { TimelineController } from "./TimelineController";

/**
 * Schedules simulation updates and rendering on one requestAnimationFrame loop.
 * Share a timeline with related animations/timers, or use the default paused,
 * visibility-aware timeline and call timeline.resume() to start playback.
 *
 * Emits `update` with `{ nowMs, deltaMs }` while time is advancing, followed by
 * queued requestDrawWith() callbacks and `draw` with numeric timeline time.
 * Delta is not capped or subdivided; consumers choose their own simulation steps.
 * Explicit redraw requests still paint while paused, offscreen or at zero speed.
 */
export class FrameController extends EventTarget implements ReactiveController {
	/** Playback clock used for frame timestamps, update deltas and visibility suspension. */
	readonly timeline: TimelineController;

	private connected = false;

	private frame?: number;

	private previous?: number;

	private dirty = false;

	private drawing = false;

	private readonly beforeDraw = new Set<() => void>();

	private subscriptions?: AbortController;

	/**
	 * Registers frame scheduling with the host without starting playback.
	 * @param host Host whose connection controls whether frames can run.
	 * @param timeline Shared timeline; otherwise creates a visibility-aware one.
	 */
	constructor(host: ControllerHost, timeline?: TimelineController) {
		super();
		this.timeline = timeline ?? new TimelineController(host);
		host.addController(this);
	}

	/**
	 * Requests a draw without resuming time. Repeated requests share one pending
	 * frame, and existing requestDrawWith() callbacks are retained.
	 * A request made during rendering schedules another frame.
	 */
	requestDraw(): void {
		this.dirty = true;
		this.schedule();
	}

	/**
	 * Queues synchronous work immediately before draw in the same frame callback.
	 * Use this for canvas buffer resizing/configuration: changing a buffer now and
	 * calling requestDraw() afterwards can expose a cleared canvas for one frame.
	 *
	 * Reusing the same bound callback coalesces requests by identity. Distinct
	 * callbacks run in insertion order and should read current state when invoked.
	 * Work queued by these callbacks or by draw listeners runs on a later frame;
	 * work queued by an update listener can run before that frame's draw.
	 * Pending callbacks survive playback changes but are discarded on disconnection.
	 *
	 * @param callback Synchronous, non-throwing work; async work is not awaited.
	 */
	requestDrawWith(callback: () => void): void {
		this.beforeDraw.add(callback);
		this.requestDraw();
	}

	/** Subscribes to playback changes and schedules any retained redraw request or active playback. */
	hostConnected(): void {
		this.connected = true;
		this.subscriptions?.abort();
		this.subscriptions = new AbortController();
		const { signal } = this.subscriptions;
		this.timeline.addEventListener("pause", this.playbackChanged, { signal });
		this.timeline.addEventListener("resume", this.playbackChanged, { signal });
		this.timeline.addEventListener("speedchange", this.speedChanged, {
			signal,
		});
		this.schedule();
	}

	/** Cancels the frame, drops queued callbacks and playback subscriptions, and resets delta tracking. */
	hostDisconnected(): void {
		this.connected = false;
		this.cancelFrame();
		this.beforeDraw.clear();
		this.subscriptions?.abort();
		this.subscriptions = undefined;
	}

	/** Resets delta tracking on pause/resume and reschedules without losing requested work. */
	private readonly playbackChanged = (): void => {
		this.cancelFrame();
		this.schedule();
	};

	/** Stops continuous frames at zero speed while still allowing explicit redraws. */
	private readonly speedChanged = (): void => {
		if (this.timeline.getPlaybackRate() === 0) {
			this.cancelFrame();
		}
		this.schedule();
	};

	/** Cancels the pending browser frame and clears its time baseline, not redraw intent or callbacks. */
	private cancelFrame(): void {
		if (this.frame !== undefined) {
			cancelAnimationFrame(this.frame);
		}
		this.frame = undefined;
		this.previous = undefined;
	}

	/** Requests at most one frame when connected and dirty or playing, never during a committed frame. */
	private schedule(): void {
		if (!this.connected || this.drawing || this.frame !== undefined) {
			return;
		}
		if (
			this.dirty ||
			(!this.timeline.isPaused() && this.timeline.getPlaybackRate() > 0)
		) {
			this.frame = requestAnimationFrame(this.tick);
		}
	}

	/**
	 * Commits one update/callback/draw cycle, then schedules any remaining work.
	 * The first update after cancellation has zero delta. Pausing during update
	 * still allows the committed draw; disconnection suppresses remaining callbacks
	 * and draw. The scheduling guard is restored even if queued work throws.
	 */
	private readonly tick = (): void => {
		this.frame = undefined;
		if (!this.connected) {
			return;
		}
		this.drawing = true;
		this.dirty = false;
		const now = this.timeline.nowMs();
		try {
			if (!this.timeline.isPaused() && this.timeline.getPlaybackRate() > 0) {
				const deltaMs = now - (this.previous ?? now);
				this.previous = now;
				this.dispatchEvent(
					new CustomEvent("update", { detail: { nowMs: now, deltaMs } }),
				);
			}
			// Work queued during these callbacks or draw belongs to the next frame.
			if (this.beforeDraw.size > 0) {
				const callbacks = [...this.beforeDraw];
				this.beforeDraw.clear();
				for (const callback of callbacks) {
					if (!this.connected) {
						break;
					}
					callback();
				}
			}
			if (this.connected) {
				this.dispatchEvent(new CustomEvent("draw", { detail: now }));
			}
		} finally {
			this.drawing = false;
			this.schedule();
		}
	};
}
