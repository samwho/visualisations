import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { TimelineController } from "../../../shared/core/controllers/TimelineController";
import { SimpleReservoir } from "../core/Samplers";
import { LogMessage, getRandomLogLevel } from "./LogMessages";
import "./Term";

export type { LogMessage } from "./LogMessages";

@customElement("s-log-stream")
export class LogStream extends LitElement {
	@property({ type: Number }) mps = 7;

	@property({ type: Number, attribute: "sample-rate" }) sampleRate?: number;

	@property({ type: Number, attribute: "every-n" }) everyN?: number;

	@property({ type: Number, attribute: "reservoir-size" })
	reservoirSize?: number;

	@property({ type: Number, attribute: "trough-duration" }) troughDuration = 1;

	@property({ type: Number, attribute: "peak-duration" }) peakDuration = 1;

	@property({ type: Number, attribute: "ramp-duration" }) rampDuration = 1;

	@property({ type: Number, attribute: "peak-multiplier" }) peakMultiplier = 1;

	@property({ type: Number, attribute: "trough-multiplier" }) troughMultiplier =
		1;

	@property() jitter = "1,1";

	@property({ type: Boolean, reflect: true }) paused = true;

	@state() private logs: {
		message: LogMessage;
		striped: boolean;
		pending: boolean;
		batchEnd: boolean;
	}[] = [];

	private nextStriped = false;

	readonly timeline = new TimelineController(this);

	private timer?: number;

	private flushInterval?: number;

	private reservoir?: SimpleReservoir<LogMessage>;

	private received = 0;

	private startedTime = this.timeline.nowMs();

	constructor() {
		super();
		this.timeline.addEventListener("resume", () => this.scheduleWork());
	}

	static override styles = css`
		:host {
			/* I/W/E labels preserve brand colours and redundantly identify severity. */
			--color-log-severity-info: var(--palette-blue);
			--color-log-severity-warning: var(--palette-orange);
			--color-log-severity-error: var(--palette-red);
			--_stripe-opacity: 75%;
			display: flex;
			flex-direction: column;
			justify-content: flex-end;
			width: 100%;
			font-family: var(--font-family-code);
			height: calc(7.5rem + var(--space-4));
			overflow: hidden;
			box-sizing: border-box;
			padding-block-start: var(--space-2);
		}
		:host([data-theme="dark"]) {
			--_stripe-opacity: 50%;
		}
		.scrollport {
			flex: 1;
			min-height: 0;
			overflow-x: auto;
			overflow-y: hidden;
		}
		.rows {
			display: flex;
			flex-direction: column;
			justify-content: flex-end;
			width: max-content;
			min-width: 100%;
			height: 100%;
		}
		p {
			flex-shrink: 0;
			display: flex;
			align-items: center;
			gap: var(--space-2);
			margin: 0;
			padding-inline: var(--space-4);
			height: calc(var(--type-ui-size) * var(--line-height-normal));
			line-height: var(--line-height-normal);
			white-space: nowrap;
			font-size: var(--type-ui-size);
		}
		p.striped {
			background: color-mix(
				in oklab,
				var(--color-surface-subtle) var(--_stripe-opacity),
				transparent
			);
		}
		.batch-boundary {
			flex-shrink: 0;
			border-block-start: 1px solid var(--color-palette-red-line);
			margin-block-start: -1px;
		}
		.filtered {
			opacity: var(--opacity-disabled);
		}
		time {
			color: var(--color-text-secondary);
		}
		.level {
			font-weight: var(--font-weight-bold);
		}
		.INFO {
			color: var(--color-log-severity-info);
		}
		.WARN {
			color: var(--color-log-severity-warning);
		}
		.ERROR {
			color: var(--color-log-severity-error);
		}
		.empty {
			display: grid;
			place-items: center;
			flex: 1;
			font-family: var(--font-family-body);
			color: var(--color-text-secondary);
			text-align: center;
		}
	`;

	protected override willUpdate(changed: PropertyValues<this>): void {
		if (changed.has("reservoirSize") || changed.has("mps")) {
			this.timeline.pause();
			this.clearTimers();
			this.reservoir =
				this.reservoirSize === undefined
					? undefined
					: new SimpleReservoir(this.reservoirSize);
		}
		this.start();
	}

	reset(): void {
		this.timeline.pause();
		this.clearTimers();
		this.paused = true;
		this.logs = [];
		this.nextStriped = false;
		this.received = 0;
		this.reservoir?.reset();
		this.startedTime = this.timeline.nowMs();
	}

	protected override render() {
		if (this.logs.length === 0) {
			return html`<div class="empty">
				<span>
					${
						this.paused
							? html`Press <t->play</t-> to start the logs.`
							: "Waiting for logs…"
					}
				</span>
			</div>`;
		}
		// The generated prose is decorative; the graph exposes source/sent rates.
		return html`<div class="scrollport">
			<div class="rows">
				${this.logs.map(
					({ message: log, striped, pending, batchEnd }) =>
						html`<p
								class=${`${(pending ? this.reservoir?.items.includes(log) : log.selected) ? "" : "filtered"} ${striped ? "striped" : ""}`}
								aria-hidden="true"
							>
								<time datetime=${log.datetime}>${log.time}</time>
								<span
									class=${`level ${log.level}`}
									aria-hidden="true"
									>${log.level.charAt(0)}</span
								>
								<samp class="message">- ${log.content}</samp>
							</p>
							${
								batchEnd
									? html`<div
											class="batch-boundary"
											aria-hidden="true"
										></div>`
									: ""
							}`,
				)}
			</div>
		</div>`;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.start();
	}

	private start(): void {
		if (this.paused || !this.isConnected) {
			this.timeline.pause();
			return;
		}
		this.timeline.resume();
		this.scheduleWork();
	}

	private scheduleWork(): void {
		if (this.timeline.isPaused()) {
			return;
		}
		this.timer ??= this.timeline.setTimeout(this.generate, this.interval());
		if (this.reservoir && this.flushInterval === undefined) {
			this.flushInterval = this.timeline.setInterval(() => this.flush(), 1000);
			this.dispatchEvent(new Event("flush-start"));
		}
	}

	private clearTimers(): void {
		if (this.timer !== undefined) {
			this.timeline.clearTimeout(this.timer);
		}
		if (this.flushInterval !== undefined) {
			this.dispatchEvent(new Event("flush-stop"));
			this.timeline.clearInterval(this.flushInterval);
		}
		this.timer = undefined;
		this.flushInterval = undefined;
	}

	private readonly generate = (): void => {
		this.timer = undefined;
		const log = new LogMessage(getRandomLogLevel());
		this.received += 1;
		if (this.reservoir) {
			// Count arrivals immediately, and selected logs only when the batch is sent.
			this.reservoir.sample(log);
			this.appendLog(log, true);
			this.dispatchEvent(
				new CustomEvent("logs", { detail: { total: 1, selected: 0 } }),
			);
		} else {
			log.selected =
				this.everyN === undefined
					? this.sampleRate === undefined || Math.random() < this.sampleRate
					: this.received % this.everyN === 0;
			this.appendLog(log);
			this.dispatchEvent(
				new CustomEvent("logs", {
					detail: { total: 1, selected: log.selected ? 1 : 0 },
				}),
			);
		}
		this.start();
	};

	private flush(): void {
		if (!this.reservoir) {
			return;
		}
		const selected = new Set(this.reservoir.items);
		// Only the bounded display rows need resolving; evicted candidates need no history.
		this.logs = this.logs.map((row, index) => {
			if (row.pending) {
				row.message.selected = selected.has(row.message);
				return {
					...row,
					pending: false,
					batchEnd: index === this.logs.length - 1,
				};
			}
			return row;
		});
		this.dispatchEvent(
			new CustomEvent("logs", {
				detail: { total: 0, selected: selected.size },
			}),
		);
		this.reservoir.reset();
		this.dispatchEvent(new Event("flush"));
	}

	private appendLog(log: LogMessage, pending = false): void {
		this.logs = [
			// Keep an extra row partially visible above the five full rows.
			...this.logs.slice(-5),
			{ message: log, striped: this.nextStriped, pending, batchEnd: false },
		];
		this.nextStriped = !this.nextStriped;
	}

	private interval(): number {
		const cycle =
			this.troughDuration + this.peakDuration + 2 * this.rampDuration;
		const time = ((this.timeline.nowMs() - this.startedTime) / 1000) % cycle;
		const peak = 1 / this.peakMultiplier;
		const trough = 1 / this.troughMultiplier;
		let multiplier = trough;
		if (time < this.rampDuration) {
			multiplier = trough - (time / this.rampDuration) * (trough - peak);
		} else if (time < this.rampDuration + this.peakDuration) {
			multiplier = peak;
		} else if (time < 2 * this.rampDuration + this.peakDuration) {
			multiplier =
				peak +
				((time - this.rampDuration - this.peakDuration) / this.rampDuration) *
					(trough - peak);
		}
		const [min = 1, max = 1] = this.jitter.split(",").map(Number);
		return (1000 / this.mps) * multiplier * (min + Math.random() * (max - min));
	}

	override disconnectedCallback(): void {
		this.clearTimers();
		this.reservoir?.reset();
		super.disconnectedCallback();
	}
}
