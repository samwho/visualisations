import { css, html, LitElement } from "lit";
import { customElement, query, queryAll, state } from "lit/decorators.js";
import { prefersReducedMotion } from "../../../shared/Accessibility";
import { AnimationController } from "../../../shared/core/controllers/AnimationController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import { CircularTimer } from "./CircularTimer";

@customElement("s-cpu-one-step")
export class CPUOneStep extends LitElement {
	constructor() {
		super();
		this.visibility.addEventListener("hidden", () => this.setTimerPaused(true));
		this.visibility.addEventListener("visible", () =>
			this.setTimerPaused(false),
		);
	}

	private readonly animations = new AnimationController(this);

	private readonly visibility = new VisibilityController(this);

	private setTimerPaused(paused: boolean) {
		const timer =
			this.renderRoot.querySelector<CircularTimer>("s-circular-timer");
		if (timer) {
			timer.paused = paused;
		}
	}

	protected override firstUpdated() {
		this.instructions.forEach((instruction, index) => {
			instruction.dataset.order = String(index);
		});
	}

	private moveInstruction(instruction: HTMLElement, target: HTMLElement) {
		this.animations.cancelAnimations();
		const first = instruction.getBoundingClientRect();
		target.append(instruction);
		if (prefersReducedMotion()) {
			return;
		}
		const last = instruction.getBoundingClientRect();
		this.animations.trackAnimation(
			instruction.animate(
				[
					{
						transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)`,
					},
					{ transform: "translate(0, 0)" },
				],
				{ duration: 450, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
			),
		);
	}

	static override styles = css`
		:host {
			gap: var(--space-4);
			min-width: 0;
			margin: auto;
			width: 100%;
			height: calc(var(--instruction-height) * 6);
			display: grid;
			grid-template-areas: "instructions cpu retired";
			grid-template-columns: 1fr 1fr 1fr;

			--instruction-width: 9ch;
			--instruction-height: 2.5rem;
		}

		#instructions {
			grid-area: instructions;
			flex-direction: column;
			align-items: flex-end;
		}

		#retired {
			grid-area: retired;
			flex-direction: column-reverse;
			align-items: flex-start;
		}

		#instructions,
		#retired {
			border: var(--border-width-thin) solid var(--color-border-subtle);
			border-radius: var(--radius-large);
			padding: var(--space-4);
			display: flex;
			gap: var(--space-2);
		}

		#instructions {
			justify-content: flex-end;
		}

		.instruction {
			width: var(--instruction-width);
			height: var(--instruction-height);
			border-radius: var(--radius-medium);
			font-family: var(--font-family-code);
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.instruction.div {
			background-color: var(--color-palette-blue-solid);
			color: var(--color-palette-blue-on-solid);
		}

		.instruction.add {
			background-color: var(--color-palette-green-solid);
			color: var(--color-palette-green-on-solid);
			width: calc(var(--instruction-width) * 0.6);
		}

		.instruction.sub {
			background-color: var(--color-palette-yellow-solid);
			color: var(--color-palette-yellow-on-solid);
			width: calc(var(--instruction-width) * 0.6);
		}

		.instruction.mov {
			background-color: var(--color-palette-red-solid);
			color: var(--color-palette-red-on-solid);
			width: calc(var(--instruction-width) * 0.8);
		}

		#cpu {
			grid-area: cpu;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: var(--space-2);
		}

		.cpu-inner {
			width: calc(var(--instruction-width) + 0.2rem);
			height: calc(var(--instruction-height) + 0.2rem);
			border: var(--border-width-thin) dashed var(--color-border-control);
			border-radius: var(--radius-medium);
			display: flex;
			align-items: center;
			justify-content: center;
		}

		#cpu s-circular-timer {
			inline-size: var(--icon-size-medium);
			block-size: var(--icon-size-medium);
		}

		#cpu s-button {
			inline-size: var(--button-height);
			block-size: var(--button-height);
		}
	`;

	@query("#cpu .cpu-inner")
	private cpu!: HTMLElement;

	@query("#instructions")
	private instructionsContainer!: HTMLElement;

	@query("#retired")
	private retired!: HTMLElement;

	@queryAll("#instructions .instruction")
	private instructions!: NodeListOf<HTMLElement>;

	@state()
	private isRunning = false;

	@state()
	private isComplete = false;

	tickStart() {
		const instructions = Array.from(this.instructions);
		if (instructions.length === 0) {
			return;
		}
		const instruction = instructions.at(-1)!;
		this.moveInstruction(instruction, this.cpu);
	}

	tickEnd() {
		const instruction = this.cpu.querySelector<HTMLElement>(".instruction");
		if (!instruction) {
			return;
		}

		this.moveInstruction(instruction, this.retired);
	}

	private handlePlayClick = () => {
		if (this.isRunning) {
			return;
		}

		if (this.isComplete) {
			this.resetInstructions();
			this.isComplete = false;
		}

		this.isRunning = true;
	};

	private handleTimerStart = () => {
		this.tickStart();
	};

	private handleTimerEnd = (event: Event) => {
		const willComplete =
			this.instructions.length === 0 &&
			!!this.cpu.querySelector(".instruction");

		if (willComplete) {
			// SAFETY: this listener is attached to this component's CircularTimer.
			const timer = event.currentTarget as CircularTimer;
			timer.repeating = false;
			this.isRunning = false;
			this.isComplete = true;
		}

		this.tickEnd();
	};

	private resetInstructions() {
		const allInstructions = Array.from(
			this.renderRoot.querySelectorAll<HTMLElement>(".instruction"),
		);

		const sorted = allInstructions.sort((a, b) => {
			const aOrder = Number(a.dataset.order ?? 0);
			const bOrder = Number(b.dataset.order ?? 0);
			return aOrder - bOrder;
		});

		this.cpu.querySelectorAll(".instruction").forEach((node) => node.remove());
		this.retired
			.querySelectorAll(".instruction")
			.forEach((node) => node.remove());
		this.instructionsContainer
			.querySelectorAll(".instruction")
			.forEach((node) => node.remove());

		for (const instruction of sorted) {
			this.instructionsContainer.append(instruction);
		}
	}

	override render() {
		const buttonIcon = html`<s-icon
			slot="icon"
			name=${this.isComplete ? "restart" : "play"}
		></s-icon>`;
		const buttonLabel = this.isRunning
			? "Running"
			: this.isComplete
				? "Restart"
				: "Play";

		return html`
			<div id="instructions">
				<code class="instruction mov">mov</code>
				<code class="instruction div">div</code>
				<code class="instruction add">add</code>
				<code class="instruction sub">sub</code>
			</div>
			<div id="cpu">
				<div>CPU</div>
				<div class="cpu-inner"></div>
				<s-button
					label=${buttonLabel}
					?disabled=${this.isRunning}
					@click=${this.handlePlayClick}
				>
					${
						this.isRunning
							? html`
									<s-circular-timer
										slot="icon"
										.interval=${2000}
										.paused=${this.visibility.isHidden}
										repeating
										@timerstart=${this.handleTimerStart}
										@timerend=${this.handleTimerEnd}
									></s-circular-timer>
								`
							: buttonIcon
					}
				</s-button>
			</div>
			<div id="retired"></div>
		`;
	}
}
