/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adapted from https://github.com/ngrok/webernetes/blob/main/src/clock.ts.
 */

interface Task {
	handle: number;
	callback: () => void;
	dueAtMs: number;
	timer?: ReturnType<typeof setTimeout>;
}

/**
 * Keeps elapsed time, timers and Web Animations on one pausable timeline.
 * Share one instance between related components. Use nowMs() for elapsed time
 * and rate windows, setTimeout() for simulation work, and registerAnimation()
 * for motion that should pause with it. Owners pause/resume on visibility and
 * playback changes, clear work on reset, and dispose on disconnection.
 */
export class Clock {
	private nextHandle = 1;

	private readonly tasks = new Map<number, Task>();

	private readonly animations = new Set<Animation>();

	private paused = false;

	private playbackRate = 1;

	private wallStartedAtMs: number;

	private simulatedNowMs: number;

	constructor(
		private readonly wallNow: () => number = () => performance.now(),
		initialNowMs?: number,
		initiallyPaused = false,
	) {
		this.paused = initiallyPaused;
		this.wallStartedAtMs = wallNow();
		this.simulatedNowMs = initialNowMs ?? this.wallStartedAtMs;
	}

	nowMs(): number {
		if (this.paused) {
			return this.simulatedNowMs;
		}
		return (
			this.simulatedNowMs +
			(this.wallNow() - this.wallStartedAtMs) * this.playbackRate
		);
	}

	isPaused(): boolean {
		return this.paused;
	}

	getPlaybackRate(): number {
		return this.playbackRate;
	}

	setPlaybackRate(rate: number): void {
		const nextRate = Number.isFinite(rate) ? Math.max(0, rate) : 1;
		if (nextRate === this.playbackRate) {
			return;
		}

		if (!this.paused) {
			this.simulatedNowMs = this.nowMs();
			this.wallStartedAtMs = this.wallNow();
			this.unscheduleTasks();
		}
		this.playbackRate = nextRate;
		for (const animation of this.animations) {
			animation.playbackRate = nextRate;
		}
		if (!this.paused) {
			this.scheduleTasks();
		}
	}

	pause(): void {
		if (this.paused) {
			return;
		}
		this.simulatedNowMs = this.nowMs();
		this.paused = true;
		this.unscheduleTasks();
		for (const animation of this.animations) {
			this.pauseAnimation(animation);
		}
	}

	resume(): void {
		if (!this.paused) {
			return;
		}
		this.paused = false;
		this.wallStartedAtMs = this.wallNow();
		this.scheduleTasks();
		for (const animation of this.animations) {
			this.playAnimation(animation);
		}
	}

	registerAnimation(animation: Animation): void {
		this.animations.add(animation);
		animation.currentTime = 0;
		animation.playbackRate = this.playbackRate;
		if (this.paused) {
			this.pauseAnimation(animation);
		}
		void animation.finished.then(
			() => this.animations.delete(animation),
			() => this.animations.delete(animation),
		);
	}

	registeredAnimationCount(): number {
		return this.animations.size;
	}

	clearAnimations(cancel = false): void {
		if (cancel) {
			for (const animation of this.animations) {
				animation.cancel();
			}
		}
		this.animations.clear();
	}

	setTimeout(callback: () => void, delayMs: number): number {
		const task: Task = {
			handle: this.nextHandle++,
			callback,
			dueAtMs: this.nowMs() + Math.max(0, delayMs),
		};
		this.tasks.set(task.handle, task);
		this.scheduleTask(task);
		return task.handle;
	}

	clearTimeout(handle: number): void {
		const task = this.tasks.get(handle);
		if (!task) {
			return;
		}
		this.unscheduleTask(task);
		this.tasks.delete(handle);
	}

	clear(): void {
		this.unscheduleTasks();
		this.tasks.clear();
	}

	pendingTaskCount(): number {
		return this.tasks.size;
	}

	/** Advances paused time synchronously for deterministic tests. */
	step(durationMs: number): void {
		if (durationMs < 0) {
			throw new Error("Step duration must be non-negative");
		}
		const wasPaused = this.paused;
		if (!wasPaused) {
			this.pause();
		}
		const targetMs = this.simulatedNowMs + durationMs;
		let advancedToMs = this.simulatedNowMs;

		for (;;) {
			const task = this.nextDueTask(targetMs);
			if (!task) {
				break;
			}
			this.advanceAnimations(task.dueAtMs - advancedToMs);
			advancedToMs = task.dueAtMs;
			this.simulatedNowMs = task.dueAtMs;
			this.tasks.delete(task.handle);
			try {
				task.callback();
			} catch {
				// Match browser timer semantics: one bad callback does not stop time.
			}
		}

		this.advanceAnimations(targetMs - advancedToMs);
		this.simulatedNowMs = targetMs;
		if (!wasPaused) {
			this.resume();
		}
	}

	[Symbol.dispose](): void {
		this.clear();
		this.clearAnimations(true);
	}

	private scheduleTask(task: Task): void {
		if (this.paused || this.playbackRate === 0) {
			return;
		}
		const delayMs =
			Math.max(0, task.dueAtMs - this.nowMs()) / this.playbackRate;
		task.timer = setTimeout(() => {
			task.timer = undefined;
			if (this.tasks.get(task.handle) !== task) {
				return;
			}
			this.tasks.delete(task.handle);
			task.callback();
		}, delayMs);
	}

	private scheduleTasks(): void {
		for (const task of this.tasks.values()) {
			this.scheduleTask(task);
		}
	}

	private unscheduleTask(task: Task): void {
		if (task.timer !== undefined) {
			clearTimeout(task.timer);
			task.timer = undefined;
		}
	}

	private unscheduleTasks(): void {
		for (const task of this.tasks.values()) {
			this.unscheduleTask(task);
		}
	}

	private nextDueTask(targetMs: number): Task | undefined {
		let next: Task | undefined;
		for (const task of this.tasks.values()) {
			if (
				task.dueAtMs <= targetMs &&
				(!next ||
					task.dueAtMs < next.dueAtMs ||
					(task.dueAtMs === next.dueAtMs && task.handle < next.handle))
			) {
				next = task;
			}
		}
		return next;
	}

	private pauseAnimation(animation: Animation): void {
		if (animation.playState !== "finished" && animation.playState !== "idle") {
			animation.pause();
		}
	}

	private playAnimation(animation: Animation): void {
		if (animation.playState !== "finished" && animation.playState !== "idle") {
			animation.playbackRate = this.playbackRate;
			animation.play();
		}
	}

	private advanceAnimations(durationMs: number): void {
		if (durationMs <= 0) {
			return;
		}
		for (const animation of [...this.animations]) {
			if (
				animation.playState === "finished" ||
				animation.playState === "idle"
			) {
				this.animations.delete(animation);
				continue;
			}
			if (animation.currentTime === null) {
				continue;
			}
			const currentTime = Number(animation.currentTime);
			if (!Number.isFinite(currentTime)) {
				continue;
			}
			const endTime = Number(animation.effect?.getComputedTiming().endTime);
			const nextTime = currentTime + durationMs;
			if (Number.isFinite(endTime) && nextTime >= endTime) {
				animation.currentTime = endTime;
				animation.finish();
			} else {
				animation.currentTime = nextTime;
			}
		}
	}
}
