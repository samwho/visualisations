import type { ReactiveController } from "lit";
import type { ControllerHost } from "./ElementControllerHost";
import { TimelineController } from "./TimelineController";

/**
 * Keeps Web Animations in step with a simulation and cancels their effects on
 * disconnection. Use trackAnimation() for animations created by the host,
 * including finished effects whose forwards/both fill still applies styles.
 *
 * Creates and resumes a visibility-aware timeline unless one is supplied.
 * Supply a shared timeline when motion must follow another controller's playback.
 */
export class AnimationController
	extends EventTarget
	implements ReactiveController
{
	private readonly animations = new Set<Animation>();

	/** Playback clock shared by all tracked animations. */
	readonly timeline: TimelineController;

	private readonly ownsTimeline: boolean;

	/**
	 * Registers animation ownership with the host.
	 * @param host Host that connects and disconnects this controller.
	 * @param timeline Shared playback clock; its owner remains responsible for resuming it.
	 */
	constructor(host: ControllerHost, timeline?: TimelineController) {
		super();
		this.ownsTimeline = timeline === undefined;
		this.timeline = timeline ?? new TimelineController(host);
		host.addController(this);
	}

	/** Resumes the default timeline; leaves a supplied timeline's playback intent alone. */
	hostConnected(): void {
		if (this.ownsTimeline) {
			this.timeline.resume();
		}
	}

	/**
	 * Registers an animation at timeline time zero and applies the current pause/rate.
	 * Keeps filled effects owned after completion so disconnection can cancel them.
	 * @param animation Animation to own; registering it resets its currentTime.
	 * @returns The same animation, for use at its creation site.
	 */
	readonly trackAnimation = (animation: Animation): Animation => {
		this.animations.add(animation);
		this.timeline.registerAnimation(animation);
		/** Releases ownership and the cancel listener once no persistent effect remains. */
		const forget = () => {
			this.animations.delete(animation);
			animation.removeEventListener("cancel", forget);
		};

		animation.addEventListener("cancel", forget, { once: true });
		void animation.finished.then(() => {
			const fill = animation.effect?.getTiming().fill;
			// Finished forwards/both effects still apply styles and need cancellation.
			if (fill !== "forwards" && fill !== "both") {
				forget();
			}
		}, forget);
		return animation;
	};

	/** Cancels every owned effect, including finished filled effects, without pausing time. */
	cancelAnimations(): void {
		for (const animation of this.animations) {
			animation.cancel();
		}
		this.animations.clear();
	}

	/** Cancels owned effects; the timeline handles its own disconnection separately. */
	hostDisconnected(): void {
		this.cancelAnimations();
	}
}
