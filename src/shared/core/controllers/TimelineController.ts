import type { ReactiveController } from "lit";
import type { ControllerHost } from "./ElementControllerHost";
import { Clock } from "../Clock";
import { VisibilityController } from "./VisibilityController";

type TimelineHost = ControllerHost;

/** Controls automatic visibility suspension for a simulation timeline. */
interface TimelineOptions {
	/** Defaults to true; false disables visibility suspension, even with a supplied observer. */
	pauseOffscreen?: boolean;
	/** Margin for a newly created visibility observer; ignored when one is supplied. */
	rootMargin?: string;
}

interface Interval {
	timer?: number;
}

/**
 * Gives simulation time, timers and Web Animations the same pause and playback
 * rate. Share one instance across related controllers instead of mixing wall
 * timers and independently running animations.
 *
 * Starts at time zero with explicit playback paused. resume() records playback
 * intent; actual time advances only while connected and, by default, visible.
 * Visibility returning never overrides an explicit reader pause.
 * Emits `pause`/`resume` when effective pause state changes and `speedchange`
 * with the numeric rate when it changes. Zero speed freezes time without setting
 * isPaused() to true.
 *
 * Disconnection clears timers, cancels registered animations and resets playback
 * intent to paused. Elapsed time and speed remain available on reconnection.
 */
export class TimelineController
	extends EventTarget
	implements ReactiveController
{
	private readonly clock = new Clock(undefined, 0, true);

	/** Observer used to suspend playback, absent when pauseOffscreen is false. */
	readonly visibility?: VisibilityController;

	private connected = false;

	private explicitlyPaused = true;

	private nextInterval = 1;

	private readonly intervals = new Map<number, Interval>();

	/**
	 * Registers a paused simulation clock and its optional visibility dependency.
	 * @param host Lifecycle owner for the clock and any observer it creates.
	 * @param visibility Shared observer; otherwise creates one unless disabled.
	 * @param options Controls offscreen suspension and a new observer's margin.
	 */
	constructor(
		host: TimelineHost,
		visibility?: VisibilityController,
		options: TimelineOptions = {},
	) {
		super();
		if (options.pauseOffscreen !== false) {
			this.visibility =
				visibility ??
				new VisibilityController(host, {
					rootMargin: options.rootMargin,
				});
		}
		host.addController(this);
	}

	/** Returns elapsed simulation milliseconds, scaled by speed and frozen during pauses. */
	nowMs(): number {
		return this.clock.nowMs();
	}

	/** Returns effective pause state, including explicit, disconnected and visibility pauses. */
	isPaused(): boolean {
		return this.clock.isPaused();
	}

	/** Records an explicit pause that stays in effect when visibility returns. */
	pause(): void {
		this.explicitlyPaused = true;
		this.syncPlayback();
	}

	/** Records intent to play; a disconnected or hidden host still keeps the clock paused. */
	resume(): void {
		this.explicitlyPaused = false;
		this.syncPlayback();
	}

	/** Returns the simulation-time multiplier; defaults to 1, with 0 freezing time. */
	getPlaybackRate(): number {
		return this.clock.getPlaybackRate();
	}

	/**
	 * Changes the speed of time, pending timers and registered animations without
	 * changing playback intent. Emits speedchange only when the rate differs.
	 * @param rate Finite, non-negative multiplier; zero freezes time but is not a pause.
	 * @throws {RangeError} If rate is negative or non-finite.
	 */
	setPlaybackRate(rate: number): void {
		if (!Number.isFinite(rate) || rate < 0) {
			throw new RangeError("Playback rate must be finite and non-negative");
		}
		if (rate === this.getPlaybackRate()) {
			return;
		}
		this.clock.setPlaybackRate(rate);
		this.dispatchEvent(new CustomEvent("speedchange", { detail: rate }));
	}

	/**
	 * Schedules one callback after a delay in simulation time, preserving its
	 * remaining delay through pauses and speed changes.
	 * @param callback Work to run once the clock reaches the due time.
	 * @param delayMs Delay in simulation milliseconds; negative delays become zero.
	 * @returns Clock-local handle for clearTimeout(), not a window timer handle.
	 */
	setTimeout(callback: () => void, delayMs: number): number {
		return this.clock.setTimeout(callback, delayMs);
	}

	/** Cancels a simulation timeout; an unknown or completed handle is harmless. */
	clearTimeout(handle: number): void {
		this.clock.clearTimeout(handle);
	}

	/**
	 * Repeats work at a simulation-time cadence. After a stalled task, skips missed
	 * repetitions rather than firing a catch-up burst. Can be cancelled inside its
	 * own callback; disconnection also prevents it returning on reconnection.
	 * @param callback Work to repeat until cancelled or disconnected.
	 * @param intervalMs Finite, positive interval in simulation milliseconds.
	 * @returns Interval-local handle for clearInterval(), not clearTimeout().
	 * @throws {RangeError} If intervalMs is non-positive or non-finite.
	 */
	setInterval(callback: () => void, intervalMs: number): number {
		if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
			throw new RangeError("Interval must be finite and positive");
		}
		const handle = this.nextInterval++;
		const interval: Interval = {};
		this.intervals.set(handle, interval);
		let dueAt = this.nowMs() + intervalMs;
		/** Runs one interval callback and reschedules its next future slot if still registered. */
		const tick = () => {
			interval.timer = undefined;
			try {
				callback();
			} finally {
				if (this.intervals.get(handle) === interval) {
					// Preserve cadence, but skip missed repetitions after a stalled task.
					dueAt +=
						Math.max(1, Math.floor((this.nowMs() - dueAt) / intervalMs) + 1) *
						intervalMs;
					interval.timer = this.setTimeout(tick, dueAt - this.nowMs());
				}
			}
		};

		interval.timer = this.setTimeout(tick, intervalMs);

		return handle;
	}

	/** Cancels a repeating callback and its pending timeout; unknown handles are harmless. */
	clearInterval(handle: number): void {
		const interval = this.intervals.get(handle);
		if (interval?.timer !== undefined) {
			this.clearTimeout(interval.timer);
		}
		this.intervals.delete(handle);
	}

	/**
	 * Resets an animation to time zero and applies the timeline's pause and speed.
	 * The clock stops tracking it when it finishes or is cancelled. Use
	 * AnimationController as well to own finished forwards/both fill effects,
	 * which can keep applying styles after the clock stops tracking them.
	 * @param animation Web Animation whose playback should follow this clock.
	 */
	registerAnimation(animation: Animation): void {
		this.clock.registerAnimation(animation);
	}

	/** Subscribes to visibility and reconciles effective playback with the current intent. */
	hostConnected(): void {
		this.connected = true;
		this.visibility?.addEventListener("hidden", this.syncPlayback);
		this.visibility?.addEventListener("visible", this.syncPlayback);
		this.syncPlayback();
	}

	/** Pauses playback, removes visibility listeners, clears timers and cancels clock-owned animations. */
	hostDisconnected(): void {
		this.connected = false;
		this.visibility?.removeEventListener("hidden", this.syncPlayback);
		this.visibility?.removeEventListener("visible", this.syncPlayback);
		this.explicitlyPaused = true;
		this.syncPlayback();
		this.intervals.clear();
		this.clock[Symbol.dispose]();
	}

	/** Applies explicit, connection and visibility gates, emitting events only on effective transitions. */
	private readonly syncPlayback = (): void => {
		const paused =
			this.explicitlyPaused ||
			!this.connected ||
			this.visibility?.isHidden === true;
		if (paused === this.isPaused()) {
			return;
		}
		if (paused) {
			this.clock.pause();
			this.dispatchEvent(new Event("pause"));
		} else {
			this.clock.resume();
			this.dispatchEvent(new Event("resume"));
		}
	};
}
