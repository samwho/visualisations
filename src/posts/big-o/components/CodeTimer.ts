import { LitElement, html, css } from "lit";
import { state, property, customElement } from "lit/decorators.js";
import { exec } from "../runtime/CodeWorker";
import { FrameController } from "../../../shared/core/controllers/FrameController";
import { TimelineController } from "../../../shared/core/controllers/TimelineController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import "./Icon";

export function formatTime(milliseconds: number): string {
	const minutes = Math.floor(milliseconds / 60000);
	const seconds = Math.floor((milliseconds % 60000) / 1000);
	const ms = Math.floor(milliseconds % 1000);
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

@customElement("s-code-timer")
export class CodeTimer extends LitElement {
	constructor() {
		super();
		this.frames.addEventListener("update", () => {
			if (this.start !== undefined) {
				this.milliseconds = this.timeline.nowMs() - this.start;
			}
		});
		this.visibility.addEventListener("hidden", () => this.stopFrame());
		this.visibility.addEventListener("visible", () => this.tick());
	}

	@property() label = "";

	@state() private running = false;

	@state() private milliseconds = 0;

	@state() private error = "";

	@state() private completed = false;

	private readonly frames = new FrameController(this);

	// The worker keeps running offscreen; suspend only its display's frames.
	private readonly timeline = new TimelineController(this, undefined, {
		pauseOffscreen: false,
	});

	private start?: number;

	private readonly visibility = new VisibilityController(this);

	static override styles = css`
		:host {
			display: flex;
			flex-direction: column;
			align-items: center;
			font-family: var(--font-family-code);
		}
		.title {
			font-size: var(--font-size-xlarge);
			margin-bottom: var(--space-2);
		}
		.controls {
			display: flex;
			align-items: stretch;
			max-width: 100%;
		}
		/* Joined timer controls stretch beyond the shared icon-only height. */
		s-button {
			height: auto;
		}
		s-button::part(button) {
			border-radius: var(--radius-large) 0 0 var(--radius-large);
		}
		/* Balance the triangle's left-heavy visual weight, not its bounding box. */
		s-icon[name="play"] {
			transform: translateX(12%);
		}
		output {
			display: flex;
			align-items: center;
			padding: var(--space-3) var(--space-5);
			border: var(--border-width-thick) solid
				var(--color-action-neutral-background);
			border-left: 0;
			border-radius: 0 var(--radius-large) var(--radius-large) 0;
			font-size: var(--type-body-size);
			transition: border-color var(--motion-duration-state) ease;
			font-variant-numeric: tabular-nums;
		}
		.running {
			color: var(--color-text-data-orange);
			border-color: var(--color-status-warning-background-solid);
		}
		.completed {
			color: var(--color-status-success-foreground);
			border-color: var(--color-status-success-background-solid);
		}
		slot {
			display: none;
		}
	`;

	protected override render() {
		return html`
			<div class="title">${this.label}</div>
			<div class="controls">
				<s-button
					size="xl"
					variant=${this.running ? "warning" : this.completed ? "success" : "neutral"}
					label=${`Run ${this.label}`}
					?loading=${this.running}
					@click=${this.run}
					><s-icon
						slot="icon"
						name="play"
					></s-icon
				></s-button>
				<output
					class=${this.running ? "running" : this.completed ? "completed" : ""}
					aria-label=${`Execution time for ${this.label}`}
					aria-busy=${String(this.running)}
					>${formatTime(
						this.completed ? Math.max(1, this.milliseconds) : this.milliseconds,
					)}</output
				>
			</div>
			${this.error ? html`<p role="alert">${this.error}</p>` : ""}
			<slot name="code"></slot>
		`;
	}

	private readonly run = (): void => {
		if (this.running) {
			return;
		}
		this.running = true;
		this.completed = false;
		this.error = "";
		this.milliseconds = 0;
		this.start = undefined;
		exec({
			code: this.querySelector('[slot="code"]')?.textContent ?? "",
			onStart: () => {
				this.timeline.resume();
				this.start = this.timeline.nowMs();
				this.tick();
			},
			onComplete: (ms) => {
				this.stop();
				this.milliseconds = ms;
				this.completed = true;
			},
			onError: (message) => {
				this.stop();
				this.error = message;
			},
		});
	};

	private tick(): void {
		if (
			!this.running ||
			!this.isConnected ||
			this.start === undefined ||
			this.visibility.isHidden
		) {
			return;
		}
		this.milliseconds = this.timeline.nowMs() - this.start;
		this.frames.timeline.resume();
	}

	private stopFrame(): void {
		this.frames.timeline.pause();
	}

	private stop(): void {
		this.stopFrame();
		this.timeline.pause();
		this.running = false;
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.stop();
	}
}
