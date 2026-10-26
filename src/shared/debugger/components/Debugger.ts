import { LitElement, css, html } from "lit";
import { guard } from "lit/directives/guard.js";
import { customElement, property, state } from "lit/decorators.js";
import { Debugger as Runtime } from "../Runtime";
import type { CodeToken, DebuggerProgram, Scope } from "../Program";
import { TimelineController } from "../../core/controllers/TimelineController";
import { VisibilityController } from "../../core/controllers/VisibilityController";
import "./Icon";
import { AnimationController } from "../../core/controllers/AnimationController";
import { prefersReducedMotion } from "../../Accessibility";
import "../../components/Button";
import "../../components/Card";
import "../../components/FloatingPane";
import type { Select } from "../../components/Select";
import "../../components/Select";

@customElement("s-debugger")
export class Debugger extends LitElement {
	constructor() {
		super();
		this.visibility.addEventListener("hidden", () => {
			this.pause();
			this.animations.cancelAnimations();
		});
	}

	@state() private playing = false;

	@state() private atEnd = false;

	@state() private scope?: Scope;

	@state() private speed = 1;

	private runtime?: Runtime;

	@property() label = "Source code";

	@property() variables = "";

	@state() private program?: DebuggerProgram;

	private get lines(): readonly (readonly CodeToken[])[] {
		return this.program?.lines ?? [];
	}

	private get variableNames(): readonly string[] {
		return this.variables.trim()
			? this.variables.trim().split(/\s+/)
			: (this.program?.variableNames ?? []);
	}

	private timer?: number;

	private readonly animations = new AnimationController(this);

	private readonly visibility = new VisibilityController(this);

	private readonly timeline = new TimelineController(this, this.visibility);

	override connectedCallback(): void {
		super.connectedCallback();
		this.timeline.resume();
	}

	static override styles = css`
		:host {
			display: block;
			width: 100%;
			min-width: 0;
		}
		.code {
			position: relative;
			isolation: isolate;
		}
		.locals {
			width: max-content;
		}
		.locals table {
			max-width: var(--layout-panel-max-width);
			border-collapse: collapse;
			font-family: var(--font-family-code);
			font-size: calc(var(--type-code-size) * 0.875);
		}
		.locals th,
		.locals td {
			padding-block: var(--space-1);
			padding-inline: 0;
			vertical-align: baseline;
		}
		.locals th {
			text-align: right;
			font-weight: var(--font-weight-regular);
		}
		.locals td {
			text-align: left;
		}
		.locals code {
			display: inline;
			width: auto;
			font-size: inherit;
			min-width: 0;
		}
		.scope-value {
			display: flex;
			align-items: baseline;
			min-width: 0;
			overflow-x: auto;
		}
		.locals .assignment {
			padding-inline: var(--space-1);
		}
		pre {
			margin: 0;
			padding-block: var(--space-4);
			background: var(--color-surface-default);
			color: var(--color-text-code);
			overflow-x: auto;
		}
		code {
			display: block;
			width: max-content;
			min-width: 100%;
			font-family: var(--font-family-code);
			font-size: var(--type-code-size);
			line-height: var(--line-height-normal);
		}
		.line {
			display: block;
			padding-inline: var(--space-4);
		}
		.line.selected {
			background: var(--color-surface-code-selected);
			box-shadow: inset var(--border-width-thick) 0 var(--color-action-accent);
		}
		.line.selected :is(.keyword, .operator, .type) {
			color: var(--color-syntax-keyword-selected);
		}
		.line.selected .literal {
			color: var(--color-syntax-literal-selected);
		}
		.keyword {
			color: var(--color-syntax-keyword);
		}
		.operator {
			color: var(--color-syntax-operator);
		}
		.literal {
			color: var(--color-syntax-literal);
		}
		.type {
			color: var(--color-syntax-declaration);
		}
		.function {
			color: var(--color-syntax-function);
		}
		.controls,
		.left,
		.right {
			display: flex;
			align-items: center;
			gap: var(--space-2);
		}
		.controls {
			justify-content: space-between;
			flex-wrap: wrap;
		}
		s-select {
			min-width: var(--space-9);
			min-height: var(--control-min-height);
		}
		s-select::part(select) {
			text-align-last: center;
		}
		.comment {
			color: var(--color-syntax-comment);
		}
		slot[name="main"],
		slot[name="post"] {
			display: none;
		}
	`;

	setProgram(program: DebuggerProgram): void {
		this.pause();
		this.program = program;
		this.runtime = new Runtime(program);
		this.scope = undefined;
		this.atEnd = false;
	}

	initialArray(name: string): number[] {
		return this.runtime?.initialArray(name) ?? [];
	}

	protected override render() {
		const atStart = this.scope === undefined;
		return html`
			<s-card full-width>
				<div class="code">
					<pre
						tabindex="0"
						aria-label=${this.label}
					><code>${this.lines.map(
						(line, i) =>
							html`<span
								class=${this.scope?.line === i + 1 ? "line selected" : "line"}
								aria-current=${this.scope?.line === i + 1 ? "step" : "false"}
								>${guard([line], () => line.map((token) => (token.kind === "plain" ? token.text : html`<span class=${token.kind}>${token.text}</span>`)))}</span
							>`,
					)}</code></pre>
					<s-floating-pane
						class="locals"
						collapsible
						position="bottom-right"
						label="variables"
						role="region"
						aria-label="Local variables"
					>
						<h3 slot="header">Variables</h3>
						<table aria-label="Variable values">
							<tbody>
								${this.variableNames.map(
									(name) => html`
										<tr
											class="variable"
											data-variable=${name}
										>
											<th scope="row">${name}</th>
											<td
												class="operator assignment"
												aria-hidden="true"
											>
												=
											</td>
											<td>
												<div class="scope-value">
													<slot name=${"variable-" + name}>
														${
															this.scope?.[name] === undefined
																? html`<code class="keyword">undefined</code>`
																: html`<code class="literal"
																		>${String(this.scope[name])}</code
																	>`
														}
													</slot>
												</div>
											</td>
										</tr>
									`,
								)}
							</tbody>
						</table>
					</s-floating-pane>
				</div>
				<div
					class="controls"
					slot="footer"
				>
					<div class="left">
						<s-button
							label="Reset"
							?disabled=${atStart}
							@click=${this.reset}
							><s-debugger-icon
								slot="icon"
								name="restart"
							></s-debugger-icon
						></s-button>
						<s-select
							label="Play speed"
							.value=${String(this.speed)}
							@change=${this.changeSpeed}
						>
							${[0.2, 0.5, 1, 2, 4, 8].map(
								(speed) =>
									html`<option
										value=${String(speed)}
										.selected=${speed === this.speed}
									>
										${speed < 1 ? String(speed).slice(1) : speed}x
									</option>`,
							)}
						</s-select>
						<s-button
							label=${this.playing ? "Pause" : "Play"}
							?disabled=${this.atEnd && !this.playing}
							@click=${this.togglePlay}
							><s-debugger-icon
								slot="icon"
								name=${this.playing ? "pause" : "play"}
							></s-debugger-icon
						></s-button>
					</div>
					<div class="right">
						<s-button
							label="Step back"
							?disabled=${atStart || this.playing}
							@click=${this.back}
							><s-debugger-icon
								slot="icon"
								name="back"
							></s-debugger-icon
						></s-button>
						<s-button
							label="Step forward"
							?disabled=${this.atEnd || this.playing}
							@click=${this.step}
							><s-debugger-icon
								slot="icon"
								name="forward"
							></s-debugger-icon
						></s-button>
					</div>
				</div>
			</s-card>
			<slot name="main"></slot><slot name="post"></slot>
		`;
	}

	private publish(): void {
		this.scope = this.runtime?.scope;
		this.dispatchEvent(
			new CustomEvent<Scope | undefined>("step", { detail: this.scope }),
		);
	}

	private get atVisibleLine(): boolean {
		const line = this.runtime?.scope?.line;
		return line !== undefined && line >= 1 && line <= this.lines.length;
	}

	private readonly step = (): void => {
		// Setup calls outside the displayed source must not consume a reader step.
		while (this.runtime?.step()) {
			if (!this.atVisibleLine) {
				continue;
			}
			this.publish();
			void this.flashLine();
			return;
		}
		this.atEnd = true;
		this.pause();
	};

	private async flashLine(): Promise<void> {
		await this.updateComplete;
		if (
			prefersReducedMotion() ||
			!this.isConnected ||
			this.visibility.isHidden
		) {
			return;
		}
		const line = this.renderRoot.querySelector(".line.selected");
		if (line) {
			for (const animation of line.getAnimations()) {
				animation.cancel();
			}
			this.animations.trackAnimation(
				line.animate(
					[
						{ boxShadow: "inset 6px 0 var(--color-action-accent)" },
						{ boxShadow: "inset 3px 0 var(--color-action-accent)" },
					],
					{ duration: 200, easing: "ease-out" },
				),
			);
		}
	}

	private readonly back = (): void => {
		while (this.runtime?.stepBack()) {
			if (this.atVisibleLine) {
				break;
			}
		}
		this.atEnd = false;
		this.publish();
		void this.flashLine();
	};

	private readonly reset = (): void => {
		this.pause();
		this.runtime?.restart();
		this.atEnd = false;
		this.publish();
	};

	private readonly togglePlay = (): void => {
		if (this.playing) {
			this.pause();
			return;
		}
		this.playing = true;
		this.advance();
	};

	private readonly advance = (): void => {
		if (!this.playing || this.visibility.isHidden) {
			return;
		}
		this.step();
		if (this.playing) {
			this.timer = this.timeline.setTimeout(this.advance, 1000 / this.speed);
		}
	};

	private readonly changeSpeed = (event: Event): void => {
		// SAFETY: this handler belongs to the native speed select.
		this.speed = Number((event.currentTarget as Select).value);
		if (this.playing) {
			this.pause();
			this.togglePlay();
		}
	};

	private pause(): void {
		if (this.timer !== undefined) {
			this.timeline.clearTimeout(this.timer);
		}
		this.timer = undefined;
		this.playing = false;
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.pause();
	}
}
