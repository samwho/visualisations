import { MediaQueryController } from "../../../shared/core/controllers/MediaQueryController";
import { css, html, LitElement, type PropertyValues } from "lit";
import { TimelineController } from "../../../shared/core/controllers/TimelineController";
import { AnimationController } from "../../../shared/core/controllers/AnimationController";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import {
	customElement,
	property,
	query,
	state as reactiveState,
} from "lit/decorators.js";
import { prefersReducedMotion } from "../../../shared/Accessibility";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import "../../../shared/components/Card";
import type { Card } from "../../../shared/components/Card";
import { PageResizeController } from "../../../shared/core/controllers/PageResizeController";
import { ResizeController } from "../../../shared/core/controllers/ResizeController";

import {
	branches,
	Compiler,
	type Instruction,
	type Program,
} from "../machine/Compiler";
import { svg } from "lit/static-html.js";
import { repeat } from "lit/directives/repeat.js";
import { Select } from "../../../shared/components/Select";

const STEP_DURATION = 750;
const SQUARE_SIZE = 50;
const TAPE_RUNWAY = 200_000;
const TAPE_BUFFER = 12;
const TAPE_WINDOW_LEEWAY = 6;

type MachineState =
	| "running"
	| "finished"
	| "pause-requested"
	| "paused"
	| "start";

type PointerKind = "instruction" | "state" | "value";

const POINTER_KINDS: PointerKind[] = ["instruction", "state", "value"];

interface State {
	state: string;
	tape: TapeState;
	instructionId: string;
}

@customElement("s-turing-machine")
export class TuringMachine extends LitElement {
	private static readonly instances = new Set<TuringMachine>();

	private static nextId = 0;

	private static sharedSpeed = 1;

	private readonly page = new PageResizeController(this);

	@reactiveState()
	private machineHeight = 0;

	constructor() {
		super();
		this.motionPreference.addEventListener(
			"change",
			this.onMotionPreferenceChange,
		);
		new ThemeController(this);
		const resize = new ResizeController(this);
		resize.addEventListener("resize", () => {
			this.machineHeight = this.clientHeight;
			this.scheduleIndicatorUpdate();
		});

		this.visibility.addEventListener("hidden", () => {
			this.hideIndicators();
			this.onHide();
		});
		this.visibility.addEventListener("visible", () => {
			this.scheduleIndicatorUpdate();
			void this.onVisible();
		});
	}

	private readonly visibility = new VisibilityController(this);

	private readonly animations = new AnimationController(this);

	// A pending pause request must finish even after the machine leaves the viewport.
	private readonly timeline = new TimelineController(this, undefined, {
		pauseOffscreen: false,
	});

	private readonly waits = new Map<number, () => void>();

	private wait(ms: number): Promise<void> {
		return new Promise((resolve) => {
			const handle = this.timeline.setTimeout(() => {
				this.waits.delete(handle);
				resolve();
			}, ms);
			this.waits.set(handle, resolve);
		});
	}

	private readonly motionPreference = new MediaQueryController(
		this,
		"(prefers-reduced-motion: reduce)",
	);

	private readonly onMotionPreferenceChange = (): void => {
		if (!this.motionPreference?.matches) {
			return;
		}
		// CSS transitions react to the media query themselves; settle WAAPI effects too.
		for (const pointer of this.renderRoot.querySelectorAll(".pointer")) {
			for (const animation of pointer.getAnimations()) {
				animation.finish();
			}
		}
		this.tape?.settleMotion();
	};

	override connectedCallback(): void {
		super.connectedCallback();
		window.addEventListener("scroll", this.scheduleIndicatorUpdate, {
			passive: true,
		});
		window.addEventListener("resize", this.scheduleIndicatorUpdate, {
			passive: true,
		});
		this.timeline.resume();
		TuringMachine.instances.add(this);
		this.applySpeed(TuringMachine.sharedSpeed);
		this.id ||= `turing-${++TuringMachine.nextId}`;
		this.role = "figure";
		this.ariaLabel ??= "An interactive Turing machine simulation.";
	}

	override disconnectedCallback(): void {
		window.removeEventListener("scroll", this.scheduleIndicatorUpdate);
		window.removeEventListener("resize", this.scheduleIndicatorUpdate);
		this.programScrollport?.removeEventListener(
			"scroll",
			this.scheduleIndicatorUpdate,
		);
		this.programScrollport = undefined;
		if (this.indicatorFrame !== undefined) {
			cancelAnimationFrame(this.indicatorFrame);
			this.indicatorFrame = undefined;
		}
		TuringMachine.instances.delete(this);
		for (const [handle, resolve] of this.waits) {
			this.timeline.clearTimeout(handle);
			resolve();
		}
		this.waits.clear();
		this.onHide();
		for (const animation of this.renderRoot.querySelectorAll(".pointer")) {
			for (const active of animation.getAnimations()) {
				active.cancel();
			}
		}
		super.disconnectedCallback();
	}

	static override styles = css`
		:host {
			--color-turing-instruction-fill: var(--color-data-fill-blue);
			--color-turing-state-fill: var(--color-data-fill-orange);
			--color-turing-value-fill: var(--color-data-fill-green);
			--color-turing-head-fill: var(--color-data-fill-red);
			/* Opaque composite prevents brighter dots at table intersections. */
			--machine-table-separator: color-mix(
				in srgb,
				var(--color-text-primary) 12%,
				var(--color-surface-default)
			);
			display: block;
			position: relative;
			width: 100%;
			font-family: var(--font-family-body);

			--raw-step-duration: ${STEP_DURATION}ms;
			--speed: 1;
			--step-duration: calc(var(--raw-step-duration) / var(--speed));
		}
		:host([data-theme="dark"]) {
			--color-turing-instruction-fill: color-mix(
				in srgb,
				var(--color-data-fill-blue) 60%,
				transparent
			);
			--color-turing-state-fill: color-mix(
				in srgb,
				var(--color-data-fill-orange) 60%,
				transparent
			);
			--color-turing-value-fill: color-mix(
				in srgb,
				var(--color-data-fill-green) 60%,
				transparent
			);
			--color-turing-head-fill: color-mix(
				in srgb,
				var(--color-data-fill-red) 60%,
				transparent
			);
		}

		:host([workspace]) {
			height: 100%;
			min-height: 0;
		}

		s-card[sticky] {
			--card-sticky-top: var(--topnav-height, 0px);
		}

		s-card:not([sticky]) .tape-header,
		s-card:not([sticky]) .controls {
			position: relative;
		}

		.tape-header {
			display: block;
		}

		.offscreen-indicator {
			position: absolute;
			z-index: 1;
			width: 10px;
			height: 10px;
			pointer-events: none;
			transform: translateX(-50%);
		}

		.offscreen-indicator[hidden] {
			display: none;
		}

		.offscreen-indicator[data-kind="instruction"] {
			background: var(--color-turing-instruction-fill);
		}

		.offscreen-indicator[data-kind="state"] {
			background: var(--color-turing-state-fill);
		}

		.offscreen-indicator[data-kind="value"] {
			background: var(--color-turing-value-fill);
		}

		.tape-header .offscreen-indicator {
			top: 100%;
			clip-path: polygon(50% 0, 100% 100%, 0 100%);
		}

		.controls .offscreen-indicator {
			bottom: 100%;
			clip-path: polygon(0 0, 100% 0, 50% 100%);
		}

		s-select {
			min-width: var(--control-min-width);
		}

		.controls {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
			gap: var(--space-1);
		}

		.program-container {
			position: relative;
			max-width: 100%;
			overflow-x: auto;
		}

		.program-container:focus-visible {
			outline: var(--focus-ring-width) solid var(--focus-ring-color);
			outline-offset: calc(-1 * var(--focus-ring-offset));
		}

		table {
			margin-inline: auto;
			border-collapse: collapse;
			color: var(--color-text-primary);
			font: var(--type-caption-size) / var(--line-height-normal)
				var(--font-family-code);
			text-align: left;
		}

		th,
		td {
			padding: var(--space-2) var(--space-2);
			vertical-align: middle;
		}

		thead th {
			padding-block: var(--space-3);
			border-bottom: var(--border-width-thin) dotted
				var(--machine-table-separator);
			font: var(--font-weight-semibold)
				var(--font-size-small) / var(--line-height-normal)
				var(--font-family-body);
			text-align: center;
		}

		tbody tr + tr > td {
			border-top: var(--border-width-thin) dotted var(--machine-table-separator);
		}

		.state-cell,
		.value-cell {
			border-right: var(--border-width-thin) dotted
				var(--machine-table-separator);
		}

		.value-cell {
			text-align: center;
		}

		.instruction {
			font: inherit;
			display: inline-block;
			position: relative;
			border-radius: 0.5em;
			padding: var(--space-1);
			min-width: 4.5ch;
			text-align: center;
		}

		.pointer {
			pointer-events: none;
			border-radius: 0.5em;
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;

			border: var(--border-width-thick) solid;
			box-sizing: border-box;
		}

		#instruction-pointer {
			border-color: var(--color-turing-instruction-fill);
		}

		#state-pointer {
			border-color: var(--color-turing-state-fill);
		}

		#value-pointer {
			border-color: var(--color-turing-value-fill);
		}

		::slotted(pre),
		::slotted(controls) {
			display: none !important;
		}
	`;

	@query("#instruction-pointer")
	instructionPointer!: HTMLElement;

	@query("#state-pointer")
	statePointer!: HTMLElement;

	@query("#value-pointer")
	valuePointer!: HTMLElement;

	@property({ type: Boolean, attribute: "controls" })
	showControls = false;

	@property({ type: Boolean, attribute: "head" })
	showHead = false;

	/** A bare, faded tape for the article hero, without container chrome. */
	@property({ type: Boolean })
	standalone = false;

	/** A square, full-height simulator panel with a scrollable program. */
	@property({ type: Boolean, reflect: true })
	workspace = false;

	@property({ type: String })
	input = "";

	@property({ type: String })
	entrypoint = "main";

	private currentMachineState: MachineState = "start";

	@reactiveState()
	set machineState(newState: MachineState) {
		this.currentMachineState = newState;
		this.dispatchEvent(new CustomEvent("state-change", { detail: newState }));
	}

	get machineState() {
		return this.currentMachineState;
	}

	@reactiveState()
	speed = 1;

	@query("s-turing-machine-tape")
	tape!: Tape;

	private programScrollport?: HTMLElement;

	private indicatorFrame?: number;

	private readonly scheduleIndicatorUpdate = (): void => {
		if (
			this.indicatorFrame === undefined &&
			this.isConnected &&
			!this.visibility.isHidden
		) {
			this.indicatorFrame = requestAnimationFrame(() => {
				this.indicatorFrame = undefined;
				this.updateIndicators();
			});
		}
	};

	private hideIndicators(): void {
		for (const indicator of this.renderRoot.querySelectorAll<HTMLElement>(
			".offscreen-indicator",
		)) {
			indicator.hidden = true;
		}
	}

	private updateIndicators(): void {
		const card = this.renderRoot.querySelector("s-card");
		const header = this.renderRoot.querySelector<HTMLElement>(".tape-header");
		const controls = this.renderRoot.querySelector<HTMLElement>(".controls");
		if (!card || !header || !controls || this.visibility.isHidden) {
			return;
		}
		if (
			!this.showProgram ||
			(!this.workspace && !card.hasAttribute("sticky"))
		) {
			this.hideIndicators();
			return;
		}

		const headerRect = header.getBoundingClientRect();
		const controlsRect = controls.getBoundingClientRect();
		const show = headerRect.bottom + 10 < controlsRect.top;
		const topVisible =
			show && headerRect.bottom > 0 && headerRect.bottom < innerHeight;
		const bottomVisible =
			show && controlsRect.top > 0 && controlsRect.top < innerHeight;

		const placements = POINTER_KINDS.map((kind) => {
			const pointer = this.renderRoot.querySelector<HTMLElement>(
				`#${kind}-pointer`,
			);
			const rect = pointer?.getBoundingClientRect();
			const x = rect === undefined ? 0 : rect.left + rect.width / 2;
			return {
				kind,
				top:
					pointer !== null &&
					pointer.hidden === false &&
					topVisible &&
					rect !== undefined &&
					rect.bottom <= headerRect.bottom,
				bottom:
					pointer !== null &&
					pointer.hidden === false &&
					bottomVisible &&
					rect !== undefined &&
					rect.top >= controlsRect.top,
				topX: Math.max(5, Math.min(headerRect.width - 5, x - headerRect.left)),
				bottomX: Math.max(
					5,
					Math.min(controlsRect.width - 5, x - controlsRect.left),
				),
			};
		});

		for (const { kind, top, bottom, topX, bottomX } of placements) {
			const topIndicator = header.querySelector<HTMLElement>(
				`.offscreen-indicator[data-kind="${kind}"]`,
			);
			const bottomIndicator = controls.querySelector<HTMLElement>(
				`.offscreen-indicator[data-kind="${kind}"]`,
			);
			if (topIndicator) {
				topIndicator.hidden = !top;
				if (top) {
					topIndicator.style.left = `${topX}px`;
				}
			}
			if (bottomIndicator) {
				bottomIndicator.hidden = !bottom;
				if (bottom) {
					bottomIndicator.style.left = `${bottomX}px`;
				}
			}
		}

		if (
			!this.visibility.isHidden &&
			POINTER_KINDS.some((kind) =>
				this.renderRoot
					.querySelector(`#${kind}-pointer`)
					?.getAnimations()
					.some((animation) => animation.playState === "running"),
			)
		) {
			this.scheduleIndicatorUpdate();
		}
	}

	private readonly indicators = () => html`
		${POINTER_KINDS.map(
			(kind) =>
				html`<span
					class="offscreen-indicator"
					data-kind=${kind}
					hidden
					aria-hidden="true"
				></span>`,
		)}
	`;

	program?: Program;

	@property({ type: Boolean, attribute: "program" })
	showProgram = false;

	@property({ type: Boolean, attribute: "play" })
	play = false;

	state?: keyof Program;

	instruction?: Instruction;

	history: State[] = [];

	private hasPositionedPointers = false;

	get stepDuration() {
		return STEP_DURATION / this.speed;
	}

	override render() {
		if (this.initializationFailed) {
			return html`<p role="status">
				${
					document.documentElement.lang === "es"
						? "La máquina interactiva no se ha cargado. Intenta recargar la página."
						: "The interactive machine couldn't load. Please try refreshing the page."
				}
			</p>`;
		}
		if (this.standalone) {
			return html`
				<s-turing-machine-tape
					.initialInput=${this.input}
				></s-turing-machine-tape>
				<slot></slot>
			`;
		}
		return html`
			<s-card
				full-width
				?workspace=${this.workspace}
				?sticky=${!this.workspace && this.showProgram && this.machineHeight > this.page.height}
			>
				<div
					class="tape-header"
					slot="header"
				>
					<s-turing-machine-tape
						.initialInput=${this.input}
						integrated
					></s-turing-machine-tape>
					${this.indicators()}
				</div>
				<div
					class="program-container"
					?hidden=${!this.showProgram}
					@scroll=${this.scheduleIndicatorUpdate}
					tabindex="0"
					role="group"
					aria-label=${document.documentElement.lang === "es" ? "Programa de la máquina" : "Machine program"}
				>
					<div
						id="instruction-pointer"
						class="pointer"
					></div>
					<div
						id="state-pointer"
						class="pointer"
					></div>
					<div
						id="value-pointer"
						class="pointer"
					></div>
					${this.showProgram ? this.renderProgramTable() : null}
				</div>
				${this.showControls ? this.renderControls() : null}
			</s-card>
			<slot></slot>
		`;
	}

	@reactiveState()
	private initializationFailed = false;

	private initialization?: Promise<void>;

	override firstUpdated(changedProperties: PropertyValues<this>): void {
		super.firstUpdated(changedProperties);
		this.scheduleIndicatorUpdate();
		this.initialization = this.restart().catch((error: Error) => {
			this.initializationFailed = true;
			console.error("Turing machine initialisation failed", error);
		});
	}

	override updated(changedProperties: PropertyValues<this>): void {
		super.updated(changedProperties);
		const card = this.renderRoot.querySelector<Card>("s-card");
		if (card) {
			void card.updateComplete.then(() => {
				if (this.isConnected) {
					this.connectProgramScrollport();
				}
			});
		}
		this.scheduleIndicatorUpdate();
	}

	private connectProgramScrollport(): void {
		const scrollport =
			this.renderRoot
				.querySelector("s-card")
				?.shadowRoot?.querySelector<HTMLElement>(".body") ?? undefined;
		if (scrollport !== this.programScrollport) {
			this.programScrollport?.removeEventListener(
				"scroll",
				this.scheduleIndicatorUpdate,
			);
			this.programScrollport = scrollport;
			scrollport?.addEventListener("scroll", this.scheduleIndicatorUpdate, {
				passive: true,
			});
		}
		this.scheduleIndicatorUpdate();
	}

	private onHide() {
		if (this.machineState === "running") {
			void this.pause();
		}
	}

	private async onVisible() {
		if (!this.play) {
			return;
		}

		if (!this.hasUpdated) {
			await this.updateComplete;
		}

		await this.initialization;
		if (this.initializationFailed) {
			return;
		}
		if (this.machineState === "running" || this.machineState === "finished") {
			return;
		}
		if (this.machineState === "pause-requested") {
			await this.desiredState("paused");
		}
		if (this.isConnected && !this.visibility.isHidden) {
			void this.run();
		}
	}

	private onSpeedChange(event: Event) {
		const select = event.target;
		if (!(select instanceof Select)) {
			return;
		}
		const parsed = Number.parseFloat(select.value ?? "");
		const value = Number.isFinite(parsed) ? parsed : 1;
		TuringMachine.sharedSpeed = value;
		for (const machine of TuringMachine.instances) {
			machine.applySpeed(value);
		}
	}

	private applySpeed(value: number): void {
		this.style.setProperty("--speed", `${value}`);
		this.speed = value;
	}

	private renderControls() {
		return html`
			<div
				class="controls"
				slot="footer"
				role="group"
				aria-label="Machine controls"
			>
				${this.indicators()}
				<s-button
					id="restart-button"
					class="restart"
					label="Restart"
					?disabled=${this.machineState === "start"}
					@click=${() => {
						void this.restart();
					}}
				>
					<s-icon
						slot="icon"
						name="restart"
					></s-icon>
				</s-button>
				<s-button
					id="pause-button"
					class="pause"
					label="Pause"
					@click=${() => {
						void this.pause();
					}}
					style=${`display: ${this.machineState === "running" ? "block" : "none"}`}
				>
					<s-icon
						slot="icon"
						name="pause"
					></s-icon>
				</s-button>
				<s-button
					id="play-button"
					class="play"
					label="Play"
					@click=${() => {
						void this.run();
					}}
					?disabled=${this.machineState === "finished"}
					style=${`display: ${this.machineState === "running" ? "none" : "block"}`}
				>
					<s-icon
						slot="icon"
						name="play"
					></s-icon>
				</s-button>
				<s-button
					id="step-back-button"
					class="step-back"
					label="Step Back"
					@click=${() => {
						this.machineState = "paused";
						this.popState();
					}}
					?disabled=${
						this.machineState === "running" || this.history.length === 0
					}
				>
					<s-icon
						slot="icon"
						name="back"
					></s-icon>
				</s-button>
				<s-button
					id="step-button"
					class="step"
					label="Step Forward"
					@click=${() => {
						this.machineState = "paused";
						this.step();
					}}
					?disabled=${
						this.machineState === "finished" || this.machineState === "running"
					}
				>
					<s-icon
						slot="icon"
						name="forward"
					></s-icon>
				</s-button>
				<s-select
					id="speed-select"
					class="speed"
					label="Speed"
					@change=${(e: Event) => this.onSpeedChange(e)}
					.value=${String(this.speed)}
				>
					<option value="0.2">0.2x</option>
					<option value="0.5">0.5x</option>
					<option value="1">1x</option>
					<option value="2">2x</option>
					<option value="4">4x</option>
					<option value="8">8x</option>
					<option value="16">16x</option>
					<option value="32">32x</option>
				</s-select>
			</div>
		`;
	}

	private renderProgramTable() {
		if (!this.program) {
			return null;
		}
		const rows = this.computeProgramRows(this.program);

		let stateLabel = "State";
		let valueLabel = "Value";
		let instructionsLabel = "Instructions";
		const language = document.documentElement.lang;
		if (language === "es") {
			stateLabel = "Estado";
			valueLabel = "Valor";
			instructionsLabel = "Instrucciones";
		}

		return html`
			<table>
				<thead>
					<tr>
						<th scope="col">${stateLabel}</th>
						<th scope="col">${valueLabel}</th>
						<th scope="col">${instructionsLabel}</th>
					</tr>
				</thead>
				<tbody>
					${rows.map(
						(row) => html`
							<tr id=${this.lineId(row.index)}>
								${
									row.showLabel
										? html`
												<td
													class="state-cell"
													rowspan=${row.labelRowSpan}
												>
													<div
														id=${this.stateId(row.label)}
														class="instruction"
														data-read-list=${row.labelReads.join(",")}
													>
														${row.label}
													</div>
												</td>
											`
										: null
								}
								${
									row.showRead
										? html`
												<td
													class="value-cell"
													rowspan=${row.readRowSpan}
												>
													<div
														id=${this.readId(row.read)}
														class="instruction"
														data-label=${row.label}
														data-read=${this.normalizeReadValue(row.read)}
													>
														${row.read || "␣"}
													</div>
												</td>
											`
										: null
								}
								<td>
									${row.instructions.map(
										(instruction) => html`
											<code
												id=${this.instructionId(instruction)}
												class=${`instruction ${instruction.type}`}
											>
												${Compiler.instruction2pretty(instruction)}
											</code>
										`,
									)}
								</td>
							</tr>
						`,
					)}
				</tbody>
			</table>
		`;
	}

	private normalizeReadValue(read: string): string {
		if (read === "*") {
			return "star";
		}
		if (read === "") {
			return "blank";
		}
		return read;
	}

	private computeProgramRows(program: Program) {
		const bs = branches(program, ["label", "read"]);
		const labelInfo = new Map<string, { rows: number; reads: Set<string> }>();

		for (const { label, read } of bs) {
			const info =
				labelInfo.get(label) ??
				({
					rows: 0,
					reads: new Set<string>(),
				} satisfies { rows: number; reads: Set<string> });
			info.reads.add(read);
			labelInfo.set(label, { ...info, rows: info.rows + 1 });
		}

		const rows = bs.map(({ label, read, instructions, index }) => {
			const info = labelInfo.get(label)!;
			return {
				label,
				read,
				instructions,
				index,
				showLabel: false,
				showRead: false,
				labelRowSpan: info.rows,
				readRowSpan: 1,
				labelReads: Array.from(info.reads),
			};
		});

		const labelSeen = new Set<string>();
		for (const row of rows) {
			if (!labelSeen.has(row.label)) {
				row.showLabel = true;
				labelSeen.add(row.label);
			}
		}

		// Compute value cell rowspans across contiguous identical reads, regardless
		// of label, to match the pre-migration behaviour.
		let readGroupStart = 0;
		while (readGroupStart < rows.length) {
			const currentRead = rows[readGroupStart]!.read;
			let readGroupEnd = readGroupStart + 1;
			while (
				readGroupEnd < rows.length &&
				rows[readGroupEnd]!.read === currentRead
			) {
				readGroupEnd++;
			}
			rows[readGroupStart]!.showRead = true;
			rows[readGroupStart]!.readRowSpan = readGroupEnd - readGroupStart;
			readGroupStart = readGroupEnd;
		}

		return rows;
	}

	getNextInstruction(): Instruction | undefined {
		if (!this.program || this.state === undefined) {
			throw new Error("No program loaded");
		}

		if (!this.instruction) {
			const branch = this.program[this.state];
			if (!branch) {
				throw new Error(`No branch for: ${this.state}`);
			}

			const value = this.tape.read();
			const instructions =
				branch[value]?.instructions ?? branch["*"]?.instructions;

			return instructions?.[0];
		}

		if (this.instruction.type === "halt") {
			return;
		}

		const { type, branch, index } = this.instruction;
		if (type === "goto") {
			const nextBranch = this.program[this.instruction.label];
			if (!nextBranch) {
				throw new Error(`state not found: "${this.instruction.label}"`);
			}

			const value = this.tape.read();
			const instructions =
				nextBranch[value]?.instructions ?? nextBranch["*"]?.instructions;

			if (!instructions || instructions.length === 0) {
				throw new Error(
					`failed to find state|value pair, state: "${this.instruction.label}", value: "${value}"`,
				);
			}

			return instructions[0];
		}

		const nextIndex = index + 1;
		const instruction = branch.instructions[nextIndex];
		if (!instruction) {
			throw new Error(
				`failed to find state|value pair, state: "${branch.label}" value: "${branch.read}"`,
			);
		}
		return instruction;
	}

	private async animatePointer(
		pointer: HTMLElement,
		target: HTMLElement,
		animate = true,
	): Promise<void> {
		pointer.hidden = false;
		if (!animate || prefersReducedMotion()) {
			for (const animation of pointer.getAnimations()) {
				animation.cancel();
			}
			target.prepend(pointer);
			pointer.style.transform = "";
			this.scheduleIndicatorUpdate();
			return;
		}

		for (const animation of pointer.getAnimations()) {
			animation.pause();
			animation.commitStyles();
		}

		const start = pointer.getBoundingClientRect();

		for (const animation of pointer.getAnimations()) {
			animation.cancel();
		}

		target.prepend(pointer);

		const end = pointer.getBoundingClientRect();

		const deltaX = start.left - end.left;
		const deltaY = start.top - end.top;
		const scaleX = end.width ? start.width / end.width : 1;
		const scaleY = end.height ? start.height / end.height : 1;

		const animation = this.animations.trackAnimation(
			pointer.animate(
				[
					{
						transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
					},
					{ transform: "translate(0, 0) scale(1, 1)" },
				],
				{
					duration: this.stepDuration,
					easing: "cubic-bezier(0.22, 1, 0.36, 1)",
					fill: "forwards",
				},
			),
		);
		this.scheduleIndicatorUpdate();

		try {
			await animation.finished;
		} catch {
			// Ignore abort/cancel errors so pointer still ends in the right place.
		} finally {
			pointer.style.transform = "";
			this.scheduleIndicatorUpdate();
		}
	}

	async moveInstructionPointer(
		instruction: HTMLElement,
		animate = true,
	): Promise<void> {
		await this.animatePointer(this.instructionPointer, instruction, animate);
	}

	async moveStatePointer(state: HTMLElement, animate = true): Promise<void> {
		await this.animatePointer(this.statePointer, state, animate);
	}

	async moveValuePointer(value: HTMLElement, animate = true): Promise<void> {
		await this.animatePointer(this.valuePointer, value, animate);
	}

	resetPointers(animate = true) {
		if (Object.keys(this.program ?? {}).length === 0) {
			return;
		}

		const value = this.tape.read();
		const stateElement = this.getStateElement(this.state!);
		const readElement = this.getReadElement(this.state!, value);
		const instructionElement = this.renderRoot.querySelector<HTMLElement>(
			`#${this.instructionId(this.instruction!)}`,
		);

		if (!instructionElement) {
			return;
		}

		if (stateElement) {
			void this.moveStatePointer(stateElement, animate);
		}

		if (readElement) {
			void this.moveValuePointer(readElement, animate);
		}

		void this.moveInstructionPointer(instructionElement, animate);
	}

	step(): boolean {
		if (!this.program || !this.instruction) {
			return true;
		}

		this.pushState();

		let written: string | undefined;
		switch (this.instruction.type) {
			case "left":
				this.tape.left();
				break;
			case "right":
				this.tape.right();
				break;
			case "print":
				written = this.instruction.value;
				this.tape.print(this.instruction.value);
				break;
			case "halt":
				this.machineState = "finished";
				return true;
			case "goto":
				if (!this.program[this.instruction.label]) {
					throw new Error(`state not found: "${this.instruction.label}"`);
				}
				this.state = this.instruction.label;
				if (this.showProgram) {
					const stateElement = this.getStateElement(this.state);
					if (stateElement) {
						void this.moveStatePointer(stateElement);
					}
				}

				break;
			default:
				throw new Error("Invalid instruction");
		}

		if (this.showProgram) {
			const newValue = written ?? this.tape.read();
			const readElement = this.getReadElement(this.state!, newValue);

			if (readElement) {
				void this.moveValuePointer(readElement);
			}
		}

		this.instruction = this.getNextInstruction();

		const instructionElement = this.renderRoot.querySelector<HTMLElement>(
			`#${this.instructionId(this.instruction!)}`,
		);

		if (this.showProgram) {
			if (!instructionElement) {
				return true;
			}
			void this.moveInstructionPointer(instructionElement);
		}

		return false;
	}

	private getInstructionById(id: string): Instruction | undefined {
		if (!this.program) {
			return;
		}

		for (const stateBranches of Object.values(this.program)) {
			for (const branch of Object.values(stateBranches)) {
				for (const instruction of branch.instructions) {
					if (instruction.id === id) {
						return instruction;
					}
				}
			}
		}
		return undefined;
	}

	private pushState() {
		if (this.state === undefined) {
			throw new Error("No state");
		}

		if (!this.instruction) {
			throw new Error("No instruction");
		}

		this.history.push({
			state: this.state,
			tape: this.tape.getState(),
			instructionId: this.instruction.id,
		});

		this.requestUpdate();
		if (this.history.length > 30) {
			this.history.shift();
		}
	}

	private popState() {
		if (this.history.length === 0) {
			return;
		}
		const state = this.history.pop();
		if (state) {
			if (state.instructionId) {
				this.instruction = this.getInstructionById(state.instructionId);
			} else {
				this.instruction = undefined;
			}
			this.state = state.state;
			this.tape.restoreState(state.tape);
			this.resetPointers();
			this.requestUpdate();
		}
	}

	private stateId(state: string): string {
		return `${this.id}-state-${state}`;
	}

	private instructionId(instruction: Instruction): string {
		return `${this.id}-instruction-${instruction.id}`;
	}

	private lineId(index: number): string {
		return `${this.id}-line-${index}`;
	}

	private readId(read: string): string {
		if (read === "*") {
			return `${this.id}-read-star`;
		}
		if (read === "") {
			return `${this.id}-read-blank`;
		}
		return `${this.id}-read-${read}`;
	}

	private getReadElement(state: string, read: string): HTMLElement | null {
		const normalizedRead = this.normalizeReadValue(read);
		const byStateAndRead = this.renderRoot.querySelector<HTMLElement>(
			`div.instruction[data-label="${state}"][data-read="${normalizedRead}"]`,
		);
		if (byStateAndRead) {
			return byStateAndRead;
		}

		const wildcard = this.renderRoot.querySelector<HTMLElement>(
			`div.instruction[data-label="${state}"][data-read="${this.normalizeReadValue(
				"*",
			)}"]`,
		);
		if (wildcard) {
			return wildcard;
		}

		return this.renderRoot.querySelector<HTMLElement>(
			`div.instruction[data-read="${normalizedRead}"]`,
		);
	}

	private getStateElement(state: string): HTMLElement | undefined {
		const el = this.renderRoot.querySelector<HTMLElement>(
			`#${this.stateId(state)}`,
		);
		if (!el) {
			return undefined;
		}
		return el;
	}

	async pause() {
		if (this.machineState !== "running") {
			return;
		}
		this.machineState = "pause-requested";
		await this.desiredState("paused");
	}

	async desiredState(state: MachineState) {
		if (this.machineState === state) {
			return;
		}
		return new Promise<void>((resolve) => {
			const waiter = () => {
				if (this.machineState === state) {
					this.removeEventListener("state-change", waiter);
					resolve();
				}
			};

			this.addEventListener("state-change", waiter);
		});
	}

	async restart() {
		await this.pause();
		this.machineState = "start";

		const programElement = this.querySelector("pre");
		if (programElement) {
			this.program ??= Compiler.text2program(programElement.textContent ?? "");

			this.load(this.program, this.entrypoint);

			if (Object.keys(this.program).length > 0) {
				await this.updateComplete;

				const animatePointers = this.hasPositionedPointers;
				this.resetPointers(animatePointers);
				this.hasPositionedPointers = true;
			}
		} else {
			this.load({}, this.entrypoint);
		}
		this.requestUpdate();
	}

	load(program: Program, entrypoint: string) {
		// Evacuate pointers only when replacing the program's rows. On restart,
		// keep their cell-sized bounds as the animation's starting geometry.
		if (program !== this.program) {
			this.hasPositionedPointers = false;
			const container = this.renderRoot.querySelector(".program-container");
			for (const pointer of this.renderRoot.querySelectorAll<HTMLElement>(
				".pointer",
			)) {
				// Park invisibly until the new cells exist; there is no old target
				// geometry to animate from after replacing the program.
				pointer.hidden = true;
				for (const animation of pointer.getAnimations()) {
					animation.cancel();
				}
				pointer.style.transform = "";
				container?.append(pointer);
			}
		}

		this.history = [];
		// Resolve the entry branch against the initial input, not the previous run.
		const input = this.getAttribute("input") ?? "";
		this.tape.setValue(input.split(""));

		if (Object.keys(program).length === 0) {
			this.program = {};
			this.state = undefined;
			this.requestUpdate();
			return;
		}

		this.program = program;
		this.state = entrypoint;

		if (!(this.state in this.program)) {
			throw new Error(`state not found: "${entrypoint}"`);
		}

		const read = this.tape.read();
		this.instruction = undefined;
		this.instruction = this.getNextInstruction();
		if (!this.instruction) {
			throw new Error(
				`couldn't find state|value pair, state: "${entrypoint}" value: "${read}"`,
			);
		}

		this.requestUpdate();
	}

	async run() {
		if (
			this.machineState === "running" ||
			this.machineState === "pause-requested"
		) {
			return;
		}

		const waitChunkLength = Math.min(50, this.stepDuration); // ms

		this.machineState = "running";
		while (true) {
			// @ts-expect-error ts thinks this is an infinite loop
			if (this.machineState === "pause-requested") {
				this.machineState = "paused";
				return;
			}

			const shouldStop = this.step();
			if (shouldStop) {
				break;
			}

			// This contraption serves two purposes:
			// 1. It makes sure that pressing the pause button feels interactive.
			//    No waiting for a pause-request to actually happen.
			// 2. If you set the speed really low, then back up again, it
			//    means the increase takes hold immediately instead of waiting
			//    a long time.
			let waitedFor = 0;
			while (waitedFor < this.stepDuration) {
				// Each instruction must finish its reader-selected delay before the next.
				// eslint-disable-next-line no-await-in-loop
				await this.wait(waitChunkLength);
				waitedFor += waitChunkLength;
				// @ts-expect-error ts thinks this is an infinite loop
				if (this.machineState === "pause-requested") {
					this.machineState = "paused";
					return;
				}
			}
		}
		this.machineState = "finished";
	}
}

interface TapeState {
	currentIndex: number;
	squares: Map<number, string>;
}

@customElement("s-turing-machine-tape")
class Tape extends LitElement {
	private readonly visibility = new VisibilityController(this);

	private needsCenter = true;

	private readonly animations = new AnimationController(this);

	private readonly timeline = this.animations.timeline;

	private readonly resize = new ResizeController(
		this,
		() => this.renderRoot.querySelector(".container") ?? undefined,
	);

	static override styles = css`
		:host {
			display: block;
			width: 100%;

			--fade-percent: 10%;
			--elastic-ease: linear(
				0,
				1.22 18%,
				0.92 32%,
				1.03 50%,
				0.995 70%,
				1 100%
			);
		}

		.tape-frame {
			position: relative;
		}

		.fade-mask {
			position: relative;
			width: 100%;
			overflow: hidden;
			mask-image: linear-gradient(
				to right,
				transparent,
				var(--color-surface-page) var(--fade-percent),
				var(--color-surface-page) calc(100% - var(--fade-percent)),
				transparent
			);
			mask-mode: alpha;
			-webkit-mask-image: linear-gradient(
				to right,
				transparent,
				var(--color-surface-page) var(--fade-percent),
				var(--color-surface-page) calc(100% - var(--fade-percent)),
				transparent
			);
			-webkit-mask-mode: alpha;
			mask-size: 100% 100%;
			mask-repeat: no-repeat;
		}

		:host([integrated]) {
			user-select: none;
			-webkit-user-select: none;
		}

		:host([integrated]) .fade-mask {
			mask-image: none;
			-webkit-mask-image: none;
		}

		.container {
			line-height: 0;
			width: 100%;
			box-sizing: border-box;
			overflow-x: scroll;
			overflow-y: hidden;
			scrollbar-width: none;
			cursor: grab;
			cursor: -webkit-grab;
			position: relative;
			touch-action: manipulation;
		}

		.container.dragging {
			cursor: grabbing;
		}

		.scroll-track {
			position: relative;
			width: calc(100% + ${TAPE_RUNWAY}px);
			height: ${SQUARE_SIZE + 1}px;
			overflow: hidden;
			--origin-offset: 0px;
		}

		.tape-cells,
		.tape-head {
			position: absolute;
			top: 0;
		}

		.tape-cells {
			left: calc(50% - var(--origin-offset) + var(--window-start));
			transition: transform var(--step-duration) var(--elastic-ease);
		}

		.tape-head {
			left: calc(50% - var(--origin-offset) - ${SQUARE_SIZE / 2}px);
		}

		.container::-webkit-scrollbar {
			display: none;
		}

		.head-indicator {
			appearance: none;
			position: absolute;
			top: 50%;
			z-index: 2;
			display: flex;
			align-items: center;
			min-height: 44px;
			box-sizing: border-box;
			padding: 0;
			border: 0;
			background: transparent;
			color: var(--color-text-primary);
			font: var(--type-caption-size) / 1 var(--font-family-code);
			white-space: nowrap;
			cursor: pointer;
			touch-action: manipulation;
			transform: translateY(-50%);
		}

		.head-indicator .face {
			display: flex;
			align-items: center;
			gap: var(--space-1);
			padding: var(--space-1);
			border: var(--border-width-thin) solid var(--color-border-subtle);
			border-radius: calc(var(--radius-large) - var(--space-1));
			background: var(--color-surface-page);
		}

		:host([integrated]) .head-indicator .face {
			background: var(--color-surface-panel);
		}

		.head-indicator:focus-visible .face,
		.container:focus-visible {
			outline: var(--focus-ring-width) solid var(--focus-ring-color);
			outline-offset: calc(-1 * var(--focus-ring-offset));
		}

		.head-indicator[hidden] {
			display: none;
		}

		.head-indicator[data-side="left"] {
			left: var(--space-1);
		}

		.head-indicator[data-side="right"] {
			right: var(--space-1);
		}

		.head-indicator[data-side="right"] .face {
			flex-direction: row-reverse;
		}

		.head-indicator s-icon {
			color: var(--head-color);
		}

		text {
			font-family: var(--font-family-code);
			font-size: 24px;
			transform: translateY(-50px);
			transition: transform calc(var(--step-duration) / 8) ease-in-out;
		}

		.has-value text {
			transform: translateY(0);
		}

		@media (prefers-reduced-motion: reduce) {
			.tape-cells,
			text {
				transition: none;
			}
		}
	`;

	@property({ attribute: false })
	initialInput = "";

	protected override willUpdate(): void {
		if (!this.hasUpdated) {
			// Populate before the first paint rather than transitioning from blank cells.
			this.setValue(this.initialInput.split(""));
		}
	}

	@reactiveState()
	squares = new Map<number, string>();

	/** Container headers use unfaded tape with vertical cell dividers only. */
	@property({ type: Boolean, reflect: true })
	integrated = false;

	@property({ type: Boolean, attribute: "show-head" })
	showHead = true;

	@reactiveState()
	currentIndex = 0;

	@query("#head-stamp")
	headStamp?: SVGRectElement;

	@query(".container")
	container!: HTMLElement;

	@query(".scroll-track")
	private scrollTrack!: HTMLElement;

	@query(".tape-cells")
	private tapeCells!: SVGSVGElement;

	@query(".head-indicator")
	private headIndicator!: HTMLButtonElement;

	@reactiveState()
	isDragging = false;

	private startX?: number;

	private startScrollLeft = 0;

	private touchTap?: { id: number; x: number; y: number; time: number };

	private previousTap?: { x: number; y: number; time: number };

	private activePointer?: number;

	private resumeScrollingFrame?: number;

	private logicalOrigin = 0;

	private viewportWidth = 0;

	private renderedStart = -20;

	private renderedCount = 41;

	private displayOverrides = new Map<
		number,
		{ symbol: string; hasValue: boolean }
	>();

	private displayOverrideTimeouts = new Map<number, number>();

	constructor() {
		super();
		this.resize.addEventListener("resize", (event) => {
			// SAFETY: ResizeController dispatches a CustomEvent with a ResizeObserverEntry.
			const entry = (event as CustomEvent<ResizeObserverEntry>).detail;
			this.viewportWidth = entry.contentRect.width;
			if (this.needsCenter) {
				this.centerScroll();
			} else {
				this.updateWindow();
				this.updateHeadIndicator();
			}
		});
		this.visibility.addEventListener("visible", () => {
			if (this.needsCenter) {
				this.centerScroll();
			} else {
				this.updateWindow();
				this.updateHeadIndicator();
			}
		});
	}

	override updated(): void {
		this.updateWindow();
		this.updateHeadIndicator();
	}

	onPointerDown(e: PointerEvent) {
		if (e.pointerType === "touch") {
			return;
		}
		if (e.pointerType === "mouse" && e.button === 2) {
			return;
		}
		if (this.activePointer !== undefined) {
			return;
		}
		this.isDragging = true;
		this.startX = e.clientX;
		this.startScrollLeft = this.container.scrollLeft;
		this.activePointer = e.pointerId;
		this.container.setPointerCapture(e.pointerId);
	}

	onPointerUp(e: PointerEvent) {
		if (this.activePointer !== e.pointerId) {
			return;
		}
		this.container.releasePointerCapture(e.pointerId);
		this.isDragging = false;
		this.activePointer = undefined;
	}

	onPointerMove(e: PointerEvent) {
		if (this.activePointer !== e.pointerId) {
			return;
		}
		e.preventDefault();
		this.container.scrollLeft = this.startScrollLeft + this.startX! - e.clientX;
	}

	onTouchStart(e: TouchEvent) {
		this.touchTap = undefined;
		if (e.touches.length !== 1) {
			this.previousTap = undefined;
			return;
		}
		const touch = e.changedTouches[0];
		if (!touch) {
			return;
		}
		if (this.integrated) {
			this.touchTap = {
				id: touch.identifier,
				x: touch.clientX,
				y: touch.clientY,
				time: e.timeStamp,
			};
		}
	}

	onTouchMove(e: TouchEvent) {
		const touch = Array.from(e.touches).find(
			(t) => t.identifier === this.touchTap?.id,
		);
		if (!touch) {
			return;
		}
		if (
			this.touchTap &&
			Math.hypot(
				touch.clientX - this.touchTap.x,
				touch.clientY - this.touchTap.y,
			) > 10
		) {
			this.touchTap = undefined;
			this.previousTap = undefined;
		}
	}

	onTouchEnd(e: TouchEvent) {
		const ended = Array.from(e.changedTouches).some(
			(t) => t.identifier === this.touchTap?.id,
		);
		if (!ended) {
			return;
		}
		const tap = this.touchTap;
		this.touchTap = undefined;
		if (e.type === "touchcancel" || !tap || e.timeStamp - tap.time > 300) {
			this.previousTap = undefined;
			return;
		}
		const previous = this.previousTap;
		if (
			previous &&
			e.timeStamp - previous.time < 350 &&
			Math.hypot(tap.x - previous.x, tap.y - previous.y) < 24
		) {
			e.preventDefault();
			this.recenter();
		} else {
			this.previousTap = { ...tap, time: e.timeStamp };
		}
	}

	private recenter() {
		this.previousTap = undefined;
		this.centerScroll();
	}

	private recenterFromIndicator() {
		this.stopMomentumScrolling();
		this.container.focus({ preventScroll: true });
		this.recenter();
		this.resumeScrolling(true);
	}

	private stopMomentumScrolling() {
		if (this.resumeScrollingFrame !== undefined) {
			cancelAnimationFrame(this.resumeScrollingFrame);
		}
		// Removing the scrollable overflow stops iOS's native momentum. Setting
		// scrollLeft alone can be followed by another momentum scroll update.
		this.container.style.overflowX = "hidden";
	}

	private resumeScrolling(recenter = false) {
		this.resumeScrollingFrame = requestAnimationFrame(() => {
			this.resumeScrollingFrame = requestAnimationFrame(() => {
				this.container.style.overflowX = "";
				this.resumeScrollingFrame = undefined;
				if (recenter) {
					this.centerScroll();
				}
			});
		});
	}

	private get logicalDisplacement() {
		return this.logicalOrigin + this.container.scrollLeft - TAPE_RUNWAY / 2;
	}

	private onScroll() {
		const displacement = this.container.scrollLeft - TAPE_RUNWAY / 2;
		if (Math.abs(displacement) > TAPE_RUNWAY * 0.4) {
			const previous = this.container.scrollLeft;
			this.container.scrollLeft = TAPE_RUNWAY / 2;
			// Account for the distance the browser actually moved. On some Safari
			// versions a programmatic scroll during momentum can be ignored.
			this.logicalOrigin += previous - this.container.scrollLeft;
			this.scrollTrack.style.setProperty(
				"--origin-offset",
				`${this.logicalOrigin}px`,
			);
		}
		this.updateWindow();
		this.updateHeadIndicator();
	}

	private updateWindow() {
		const width = this.viewportWidth;
		if (width <= 0 || this.visibility.isHidden) {
			return;
		}
		const displacement = this.logicalDisplacement;
		const firstVisible =
			this.currentIndex +
			Math.floor((displacement - width / 2 + SQUARE_SIZE / 2) / SQUARE_SIZE);
		const lastVisible =
			this.currentIndex +
			Math.floor((displacement + width / 2 + SQUARE_SIZE / 2) / SQUARE_SIZE);
		const count = Math.ceil(width / SQUARE_SIZE) + 2 + TAPE_BUFFER * 2;
		if (
			count === this.renderedCount &&
			firstVisible >= this.renderedStart + TAPE_WINDOW_LEEWAY &&
			lastVisible < this.renderedStart + this.renderedCount - TAPE_WINDOW_LEEWAY
		) {
			return;
		}
		const previousStart = this.renderedStart;
		const previousCount = this.renderedCount;
		this.renderedStart = firstVisible - TAPE_BUFFER;
		this.renderedCount = count;
		this.tapeCells.style.setProperty(
			"--window-start",
			`${this.renderedStart * SQUARE_SIZE - SQUARE_SIZE / 2}px`,
		);
		// The cell pattern repeats, so an empty window only needs to move the
		// existing SVG. Lit has nothing to add or remove in that case.
		if (
			count !== previousCount ||
			this.hasSymbols(previousStart, previousCount) ||
			this.hasSymbols(this.renderedStart, count)
		) {
			this.requestUpdate();
		}
	}

	private hasSymbols(start: number, count: number): boolean {
		if (this.squares.size === 0 && this.displayOverrides.size === 0) {
			return false;
		}
		for (let index = start; index < start + count; index++) {
			if (this.squares.has(index) || this.displayOverrides.has(index)) {
				return true;
			}
		}
		return false;
	}

	private centerScroll() {
		this.needsCenter = true;
		this.logicalOrigin = 0;
		if (this.visibility.isHidden || this.viewportWidth === 0) {
			return;
		}
		this.needsCenter = false;
		const container = this.renderRoot.querySelector<HTMLElement>(".container");
		if (container) {
			this.scrollTrack.style.setProperty("--origin-offset", "0px");
			container.scrollLeft = TAPE_RUNWAY / 2;
			this.updateWindow();
			this.updateHeadIndicator();
		}
	}

	private updateHeadIndicator() {
		if (this.viewportWidth === 0 || this.visibility.isHidden) {
			return;
		}
		const indicator = this.headIndicator;
		const displacement = this.logicalDisplacement;
		const offscreen =
			Math.abs(displacement) - (this.viewportWidth + SQUARE_SIZE) / 2;
		const hidden = !this.showHead || offscreen <= 0;
		if (indicator.hidden !== hidden) {
			indicator.hidden = hidden;
		}
		if (hidden) {
			return;
		}
		const side = displacement > 0 ? "left" : "right";
		const cells = Math.ceil(offscreen / SQUARE_SIZE);
		const distance = indicator.querySelector(".distance")!;
		const sideChanged = indicator.dataset.side !== side;
		const distanceChanged = distance.textContent !== `${cells}`;
		if (!sideChanged && !distanceChanged) {
			return;
		}
		const spanish = document.documentElement.lang.startsWith("es");
		const noun = spanish
			? cells === 1
				? "celda"
				: "celdas"
			: cells === 1
				? "cell"
				: "cells";
		if (sideChanged) {
			indicator.dataset.side = side;
			indicator.querySelector(".arrow")!.textContent =
				side === "left" ? "←" : "→";
		}
		if (distanceChanged) {
			distance.textContent = `${cells}`;
		}
		indicator.ariaLabel = spanish
			? `Centrar la cinta: cabezal a ${cells} ${noun} a la ${side === "left" ? "izquierda" : "derecha"}`
			: `Recenter tape: head ${cells} ${noun} to the ${side}`;
	}

	getState(): TapeState {
		return {
			currentIndex: this.currentIndex,
			squares: new Map<number, string>(this.squares),
		};
	}

	restoreState(state: TapeState) {
		this.flushDisplayOverrides();
		this.squares = state.squares;
		this.currentIndex = state.currentIndex;
	}

	override render() {
		const indexes = Array.from(
			{ length: this.renderedCount },
			(_, i) => i + this.renderedStart,
		).filter(
			(index) => this.squares.has(index) || this.displayOverrides.has(index),
		);
		const totalWidth = SQUARE_SIZE * this.renderedCount;
		const totalHeight = SQUARE_SIZE + 1;
		return html`
			<div class="tape-frame">
				<div class="fade-mask">
					<div
						class="container ${this.isDragging ? "dragging" : ""}"
						tabindex="0"
						role="group"
						aria-label=${
							document.documentElement.lang.startsWith("es")
								? "Cinta de la máquina de Turing"
								: "Turing machine tape"
						}
						@scroll=${() => this.onScroll()}
						@dblclick=${() => this.recenter()}
						@pointerdown=${(e: PointerEvent) => this.onPointerDown(e)}
						@pointermove=${(e: PointerEvent) => this.onPointerMove(e)}
						@pointerup=${(e: PointerEvent) => this.onPointerUp(e)}
						@pointercancel=${(e: PointerEvent) => this.onPointerUp(e)}
						@touchstart=${(e: TouchEvent) => this.onTouchStart(e)}
						@touchmove=${(e: TouchEvent) => this.onTouchMove(e)}
						@touchend=${(e: TouchEvent) => this.onTouchEnd(e)}
						@touchcancel=${(e: TouchEvent) => this.onTouchEnd(e)}
					>
						<div class="scroll-track">
							<svg
								id="tape"
								class="tape-cells"
								aria-hidden="true"
								width="${totalWidth}"
								height="${totalHeight}"
								viewBox="0 0 ${totalWidth} ${totalHeight}"
								style="--window-start: ${this.renderedStart * SQUARE_SIZE - SQUARE_SIZE / 2}px; transform: translateX(${-this.currentIndex * SQUARE_SIZE}px)"
							>
								<defs>
									<pattern
										id="tape-cell-pattern"
										width="${SQUARE_SIZE}"
										height="${totalHeight}"
										patternUnits="userSpaceOnUse"
									>
										${
											this.integrated
												? svg`<path d="M0 0 V${totalHeight}" stroke="var(--color-border-subtle)" />`
												: svg`<rect x="0" y="0.5" width="${SQUARE_SIZE}" height="${SQUARE_SIZE}" fill="none" stroke="var(--color-data-neutral)" />`
										}
									</pattern>
								</defs>
								<rect
									width="${totalWidth}"
									height="${totalHeight}"
									fill="url(#tape-cell-pattern)"
								/>
								${repeat(
									indexes,
									(square) => square,
									(square) => this.renderSquare(square),
								)}
							</svg>
							<svg
								class="tape-head"
								aria-hidden="true"
								width="${SQUARE_SIZE}"
								height="${totalHeight}"
								viewBox="0 0 ${SQUARE_SIZE} ${totalHeight}"
							>
								${this.showHead ? this.renderHead() : null}
							</svg>
						</div>
					</div>
				</div>
				<button
					type="button"
					class="head-indicator"
					hidden
					@pointerdown=${() => this.stopMomentumScrolling()}
					@pointerup=${() => this.resumeScrolling()}
					@pointercancel=${() => this.resumeScrolling()}
					@click=${() => this.recenterFromIndicator()}
				>
					<span class="face">
						<span
							class="arrow"
							aria-hidden="true"
						></span>
						<s-icon name="head"></s-icon>
						<span
							class="distance"
							aria-hidden="true"
						></span>
					</span>
				</button>
			</div>
		`;
	}

	renderSquare(index: number) {
		const rawSymbol = this.squares.get(index) ?? "";
		const override = this.displayOverrides.get(index);
		const displaySymbol = override ? override.symbol : rawSymbol;
		const hasValue = override
			? override.hasValue
			: rawSymbol !== "" && rawSymbol !== " ";
		const x = SQUARE_SIZE * (index - this.renderedStart);
		const y = SQUARE_SIZE / 2 + 0.5;
		return svg`
			<g
				class="${hasValue ? "has-value" : ""}"
				transform="translate(${x}, ${y})"
			>
				<text
					x="${SQUARE_SIZE / 2}"
					y="0"
					fill="var(--color-text-primary)"
					text-anchor="middle"
					alignment-baseline="central"
				>
					${displaySymbol === "" ? " " : displaySymbol}
				</text>
			</g>
		`;
	}

	renderHead() {
		const stroke = SQUARE_SIZE / 15;
		const x = 0;
		const y = 0.5;

		return svg`
      <g transform="translate(${x}, ${y})">
        <rect
          id="head-border"
          width="${SQUARE_SIZE - stroke}"
          height="${SQUARE_SIZE - stroke}"
          x="${stroke / 2}"
          y="${stroke / 2}"
          fill="none"
          stroke="var(--color-turing-head-fill)"
          stroke-width="${stroke}"
        />
        <rect
          id="head-stamp"
          width="${SQUARE_SIZE}"
          height="0"
          x="0"
          y="0"
          fill="var(--color-turing-head-fill)"
        />
        <rect
          id="head"
          width="${SQUARE_SIZE}"
          height="${SQUARE_SIZE}"
          x="0"
          y="0"
          fill="var(--color-turing-head-fill)"
          opacity="0.2"
        />
      </g>
    `;
	}

	get stepDuration(): number {
		const speed = Number.parseFloat(
			getComputedStyle(this).getPropertyValue("--speed") || "1",
		);
		return STEP_DURATION / speed;
	}

	async stamp(): Promise<void> {
		if (!this.headStamp) {
			return;
		}

		for (const animation of this.headStamp.getAnimations()) {
			animation.cancel();
		}
		if (prefersReducedMotion() || this.timeline.isPaused()) {
			return;
		}

		const animation = this.animations.trackAnimation(
			this.headStamp.animate(
				[{ height: "0" }, { height: `${SQUARE_SIZE}px` }, { height: "0" }],
				{
					duration: this.stepDuration / 4,
					easing: "ease-in-out",
					fill: "forwards",
				},
			),
		);
		try {
			await animation.finished;
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
			} else {
				throw error;
			}
		}
	}

	override disconnectedCallback(): void {
		if (this.resumeScrollingFrame !== undefined) {
			cancelAnimationFrame(this.resumeScrollingFrame);
		}
		const container = this.renderRoot.querySelector<HTMLElement>(".container");
		if (container !== null) {
			container.style.overflowX = "";
		}
		this.flushDisplayOverrides();
		this.touchTap = undefined;
		this.previousTap = undefined;
		for (const animation of this.headStamp?.getAnimations() ?? []) {
			animation.cancel();
		}
		super.disconnectedCallback();
	}

	settleMotion() {
		this.flushDisplayOverrides();
		for (const animation of this.headStamp?.getAnimations() ?? []) {
			animation.finish();
		}
	}

	flushDisplayOverrides() {
		for (const timeout of this.displayOverrideTimeouts.values()) {
			this.timeline.clearTimeout(timeout);
		}
		this.displayOverrideTimeouts.clear();
		this.displayOverrides.clear();
		this.requestUpdate();
	}

	clear() {
		this.squares = new Map<number, string>();
		this.displayOverrides.clear();
		for (const timeout of this.displayOverrideTimeouts.values()) {
			this.timeline.clearTimeout(timeout);
		}
		this.displayOverrideTimeouts.clear();
		this.currentIndex = 0;
		this.centerScroll();
	}

	setValue(symbols: string[]) {
		this.clear();
		for (const [index, symbol] of symbols.entries()) {
			if (symbol !== " " && symbol !== "") {
				this.squares.set(index, symbol);
			}
		}
		this.requestUpdate();
	}

	readFullTape() {
		const indexes = [...this.squares.keys()];
		const minIndex = indexes.length > 0 ? Math.min(...indexes) : 0;
		const maxIndex = indexes.length > 0 ? Math.max(...indexes) : -1;
		return {
			minIndex,
			maxIndex,
			symbols: Array.from({ length: maxIndex - minIndex + 1 }, (_, i) =>
				this.read(minIndex + i),
			),
		};
	}

	right() {
		this.currentIndex++;
	}

	left() {
		this.currentIndex--;
	}

	read(index?: number): string {
		const value = this.squares.get(index ?? this.currentIndex) ?? "";
		if (value === " ") {
			return "";
		}
		return value;
	}

	print(symbol: string) {
		const index = this.currentIndex;
		const normalized = symbol === " " ? "" : symbol;
		const existingOverride = this.displayOverrides.get(index);
		const rawSymbol = this.squares.get(index) ?? "";
		const visibleSymbol = existingOverride
			? existingOverride.symbol
			: rawSymbol;

		if (normalized === "") {
			this.squares.delete(index);
		} else {
			this.squares.set(index, normalized);
		}

		const existingTimeout = this.displayOverrideTimeouts.get(index);
		if (existingTimeout !== undefined) {
			this.timeline.clearTimeout(existingTimeout);
		}

		const shouldHold =
			(visibleSymbol !== "" && visibleSymbol !== " ") || normalized !== "";
		// Offscreen printing must publish the symbol without waiting for suspended motion.
		if (shouldHold && !prefersReducedMotion() && !this.timeline.isPaused()) {
			this.displayOverrides.set(index, {
				symbol: visibleSymbol,
				hasValue: true,
			});

			const timeout = this.timeline.setTimeout(() => {
				this.displayOverrides.delete(index);
				this.displayOverrideTimeouts.delete(index);
				this.requestUpdate();
			}, this.stepDuration / 8);
			this.displayOverrideTimeouts.set(index, timeout);
		} else {
			this.displayOverrides.delete(index);
			this.displayOverrideTimeouts.delete(index);
		}
		void this.stamp();
		this.requestUpdate();
	}
}
