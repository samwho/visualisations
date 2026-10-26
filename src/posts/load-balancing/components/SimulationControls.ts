import { html } from "lit";
import "../../../shared/components/Button";
import "../../../shared/components/Select";
import "../../../shared/components/Slider";
import "../../../shared/components/RangeSlider";
import "../../../shared/components/SpeedSlider";
import "./Icon";
import { simulationSpeed } from "../globals";
import {
	algorithmLabels,
	formatValue,
	parseRange,
	parseServerPower,
} from "./SimulationSettings";
import type { Simulation } from "./Simulation";

type SimulationParameters = Pick<
	Simulation,
	| "algorithm"
	| "rps"
	| "rpsRange"
	| "requestCost"
	| "requestCostMax"
	| "serverPower"
	| "serverPowerMax"
	| "numServers"
	| "clientWidth"
>;

interface ParameterHandlers {
	algorithm(event: Event): void;
	rps(event: Event): void;
	requestCost(event: Event): void;
	serverPower(event: Event): void;
	numServers(event: Event): void;
}
interface PlaybackHandlers {
	reset(): void;
	shuffle(): void;
	speed(event: Event): void;
	toggle(): void;
}

export function renderParameterControls(
	simulation: SimulationParameters,
	handlers: ParameterHandlers,
) {
	const requestRange = parseRange(simulation.requestCost, { min: 50, max: 50 });
	const powerRange = parseServerPower(simulation.serverPower);
	const minimumPower = Array.isArray(powerRange)
		? Math.min(...powerRange)
		: powerRange.min;
	const maximumPower = Array.isArray(powerRange)
		? Math.max(...powerRange)
		: powerRange.max;
	const rpsRange = parseRange(simulation.rpsRange || String(simulation.rps), {
		min: simulation.rps,
		max: simulation.rps,
	});

	return html`
		<fieldset class="controls full-width-controls">
			<legend class="visually-hidden">Simulation parameters</legend>
			<div class="control">
				<s-select
					visible-label="Algorithm"
					.value=${simulation.algorithm}
					label="Algorithm"
					@change=${handlers.algorithm}
				>
					${Object.entries(algorithmLabels).map(
						([value, label]) => html`<option value=${value}>${label}</option>`,
					)}
				</s-select>
			</div>
			<div class="control">
				<s-range-slider
					visible-label="RPS"
					show-tooltip
					min="1"
					max="40"
					step="1"
					.value=${[rpsRange.min, rpsRange.max]}
					.tooltipFormatter=${formatValue}
					label="RPS"
					@input=${handlers.rps}
				></s-range-slider>
			</div>
			<div class="control">
				<s-range-slider
					visible-label="Request Cost"
					show-tooltip
					min="1"
					max=${simulation.requestCostMax}
					step="1"
					.value=${[requestRange.min, requestRange.max]}
					.tooltipFormatter=${(value: number) => `${formatValue(value)}ms`}
					label="Request Cost"
					@input=${handlers.requestCost}
				></s-range-slider>
			</div>
			<div class="control">
				<s-range-slider
					visible-label="Server Power"
					show-tooltip
					min="1"
					max=${simulation.serverPowerMax}
					step="1"
					.value=${[minimumPower, maximumPower]}
					.tooltipFormatter=${formatValue}
					label="Server Power"
					@input=${handlers.serverPower}
				></s-range-slider>
			</div>
			<div class="control">
				<s-slider
					visible-label="Num Servers"
					show-tooltip
					min="1"
					max=${Math.min(9, Math.floor((simulation.clientWidth || 748) / 50))}
					step="1"
					.value=${String(simulation.numServers)}
					label="Num Servers"
					@input=${handlers.numServers}
				></s-slider>
			</div>
		</fieldset>
	`;
}

export function renderPlaybackControls(
	isPaused: boolean,
	showShuffle: boolean,
	hideReset: boolean,
	handlers: PlaybackHandlers,
) {
	const showReset = !hideReset;
	return html`
		<div class="playback-controls">
			${
				showReset || showShuffle
					? html`<div class="playback-actions">
							${
								showReset
									? html`<s-button
											class="reset"
											label="Reset simulation"
											@click=${handlers.reset}
										>
											<s-icon
												slot="icon"
												name="uncropped-arrow_clockwise"
												aria-hidden="true"
											></s-icon>
										</s-button>`
									: undefined
							}
							${
								showShuffle
									? html`<s-button
											class="shuffle"
											label="Shuffle server power"
											@click=${handlers.shuffle}
										>
											<s-icon
												slot="icon"
												name="uncropped-shuffle"
												aria-hidden="true"
											></s-icon>
										</s-button>`
									: undefined
							}
						</div>`
					: undefined
			}
			<s-speed-slider
				.value=${String(simulationSpeed.get())}
				@input=${handlers.speed}
			></s-speed-slider>
			<s-button
				class="pause"
				label=${isPaused ? "Play simulation" : "Pause simulation"}
				@click=${handlers.toggle}
			>
				<s-icon
					slot="icon"
					name=${isPaused ? "uncropped-play_fill" : "uncropped-pause_fill"}
					aria-hidden="true"
				></s-icon>
			</s-button>
		</div>
	`;
}
