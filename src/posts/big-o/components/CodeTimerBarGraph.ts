import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { exec } from "../runtime/CodeWorker";
import { FrameController } from "../../../shared/core/controllers/FrameController";
import { TimelineController } from "../../../shared/core/controllers/TimelineController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import "./Icon";
import "../../../shared/components/Card";

interface Bar {
	label: string;
	code: string;
	milliseconds: number;
	running: boolean;
	start?: number;
}

@customElement("s-code-timer-bar-graph")
export class CodeTimerBarGraph extends LitElement {
	constructor() {
		super();
		this.frames.addEventListener("update", this.advance);
		this.visibility.addEventListener("hidden", () => this.stopFrame());
		this.visibility.addEventListener("visible", () => this.tick());
	}

	@state() private bars: Bar[] = [];

	@state() private error = "";

	private readonly frames = new FrameController(this);

	// Concurrent workers keep wall time even while their graph is offscreen.
	private readonly timeline = new TimelineController(this, undefined, {
		pauseOffscreen: false,
	});

	private readonly visibility = new VisibilityController(this);

	static override styles = css`
		:host {
			display: block;
			width: 100%;
		}
		.chart {
			box-sizing: border-box;
			height: 300px;
			padding: var(--space-4);
			display: flex;
			align-items: flex-end;
			justify-content: center;
			gap: var(--space-1);
		}
		.bar {
			flex: 1;
			min-width: 0;
			max-width: 8ch;
			height: 100%;
			display: flex;
			flex-direction: column;
			gap: var(--space-1);
		}
		.track {
			flex: 1;
			display: flex;
			align-items: flex-end;
		}
		.value {
			container-type: size;
			container-name: timer-bar;
			display: flex;
			align-items: flex-end;
			justify-content: center;
			box-sizing: border-box;
			padding-bottom: var(--space-half);
			font-weight: var(--font-weight-bold);
			width: 100%;
			min-height: var(--space-2);
			background: var(--color-data-fill-dark-blue);
			border-radius: var(--radius-control);
			color: var(--color-text-on-dark-fill);
			text-align: center;
			font-family: var(--font-family-code);
			overflow: hidden;
		}
		.value.running {
			background: var(--color-status-success-background-solid);
			color: var(--color-status-success-on-solid);
		}
		.value span {
			transition: opacity var(--motion-duration-state) ease;
		}
		@container timer-bar (height < 1.25rem) {
			.value span {
				opacity: 0;
			}
		}
		.controls {
			display: flex;
			justify-content: center;
			gap: var(--space-1);
			padding-inline: var(--space-4);
		}
		s-button {
			--button-min-width: 0;
			flex: 1;
			min-width: 0;
			max-width: 8ch;
		}
		s-button::part(button) {
			font-family: var(--font-family-code);
			font-size: var(--type-caption-size);
			padding-inline: var(--space-1);
		}
		@media (prefers-reduced-motion: reduce) {
			.value span {
				transition: none;
			}
		}
		s-icon {
			height: var(--space-3);
		}
		slot {
			display: none;
		}
		.error {
			color: var(--color-status-danger-foreground);
		}
	`;

	protected override firstUpdated(): void {
		const shared = this.querySelector("shared")?.textContent ?? "";
		this.bars = [...this.querySelectorAll("bar")].map((el) => ({
			label: el.getAttribute("label") ?? "",
			code: shared + "\n" + (el.textContent ?? ""),
			milliseconds: 0,
			running: false,
		}));
	}

	protected override render() {
		const max = Math.max(5000, ...this.bars.map((bar) => bar.milliseconds));
		return html`
			<s-card full-width>
				<div class="chart">
					${this.bars.map(
						(bar) => html`
							<div class="bar">
								<div class="track">
									<output
										class=${bar.running ? "value running" : "value"}
										aria-label=${`Execution time for ${bar.label}`}
										aria-busy=${String(bar.running)}
										style=${`height: ${(bar.milliseconds / max) * 100}%`}
										><span
											>${(bar.milliseconds / 1000).toFixed(1)}s</span
										></output
									>
								</div>
							</div>
						`,
					)}
				</div>
				${
					this.error
						? html`<p
								class="error"
								role="alert"
							>
								${this.error}
							</p>`
						: ""
				}
				<div
					class="controls"
					slot="footer"
				>
					${this.bars.map(
						(bar) =>
							html`<s-button
								label=${`Run ${bar.label}`}
								?loading=${bar.running}
								@click=${() => this.run(bar)}
								><s-icon
									slot="icon"
									name="play"
								></s-icon
								>${bar.label}</s-button
							>`,
					)}
				</div>
			</s-card>
			<slot></slot>
		`;
	}

	private run(bar: Bar): void {
		if (bar.running) {
			return;
		}
		bar.running = true;
		bar.milliseconds = 0;
		bar.start = undefined;
		this.requestUpdate();
		exec({
			code: bar.code,
			onStart: () => {
				this.timeline.resume();
				bar.start = this.timeline.nowMs();
				this.tick();
			},
			onComplete: (ms) => {
				bar.milliseconds = ms;
				bar.running = false;
				this.tick();
				this.requestUpdate();
			},
			onError: (message) => {
				bar.running = false;
				this.tick();
				this.error = message;
				this.requestUpdate();
			},
		});
	}

	private tick(): void {
		if (!this.bars.some((bar) => bar.running)) {
			this.stopFrame();
			this.timeline.pause();
		} else if (this.isConnected && !this.visibility.isHidden) {
			this.frames.timeline.resume();
		}
	}

	private readonly advance = (): void => {
		for (const bar of this.bars) {
			if (bar.running && bar.start !== undefined) {
				bar.milliseconds = this.timeline.nowMs() - bar.start;
			}
		}
		this.requestUpdate();
		this.tick();
	};

	private stopFrame(): void {
		this.frames.timeline.pause();
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.stopFrame();
	}
}
