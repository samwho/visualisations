import { css } from "lit";

export const simulationStyles = css`
	:host {
		--simulation-latency-color: var(--gray-400);
		--simulation-callout-color: var(--gray-700);
		display: block;
		box-sizing: content-box;
		width: 100%;
		height: auto;
		color: var(--color-text-primary);
	}
	:host([data-theme="dark"]) {
		--simulation-latency-color: var(--gray-500);
		--simulation-callout-color: var(--gray-300);
	}

	.simulation {
		position: relative;
		width: 100%;
		height: var(--simulation-height, 250px);
		overflow: clip;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

	.controls.full-width-controls {
		width: 100%;
		grid-template-columns: max-content minmax(0, 1fr);
	}

	.simulation.with-graph {
		height: calc(var(--simulation-height, 250px) + 44px);
	}

	.with-graph .stage {
		bottom: 48px;
	}

	.graph-queue-toggle {
		position: absolute;
		bottom: 0;
		left: var(--space-2);
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 44px;
		font: var(--type-ui-size) / var(--line-height-tight)
			var(--font-family-body, sans-serif);
		cursor: pointer;
	}

	.graph-queue-toggle input {
		width: 1em;
		height: 1em;
		margin: 0;
		cursor: pointer;
	}

	.graph-queue-toggle code {
		font-family: var(--font-family-code, ui-monospace, monospace);
	}

	.ewma-graph {
		border-top: var(--border-width-thin) solid var(--color-border-separator);
	}

	.footer {
		width: 100%;
	}

	.playback-controls {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		width: 100%;
		min-height: var(--control-min-height);
	}

	.playback-controls s-button {
		display: block;
		flex: none;
		width: var(--control-min-height);
		height: var(--control-min-height);
	}

	.playback-controls s-icon {
		height: var(--icon-size-medium);
	}

	.playback-actions {
		display: flex;
		gap: var(--space-2);
	}

	s-speed-slider {
		flex: 1;
	}

	.stage {
		position: absolute;
		inset: -4px 0 4px;
	}

	.server-grid {
		position: absolute;
		top: calc(var(--queue-max-length) * 20px + 5% + var(--server-grid-offset));
		right: 0;
		left: 0;
		display: grid;
		grid-template-columns: repeat(
				var(--num-servers),
				minmax(0, 1fr) 50px
			) minmax(0, 1fr);
		height: 50px;
		align-items: start;
	}

	.server-slot {
		position: relative;
		width: 50px;
		height: 50px;
		justify-self: center;
	}

	.server-body,
	.load-balancer {
		position: relative;
		width: 50px;
		height: 50px;
		border-radius: 9px;
	}

	.with-ewma .server-body {
		outline: 2px solid var(--server-series-color);
		outline-offset: 2px;
	}

	.server-marker {
		position: absolute;
		top: calc(100% + 8px);
		left: 50%;
		width: 20px;
		height: 20px;
		fill: var(--server-series-color);
		transform: translateX(-50%);
		pointer-events: none;
	}

	.server-anchor {
		position: absolute;
		inset: 0;
	}

	.server-label {
		--server-badge-colour: var(--simulation-latency-color);
		position: absolute;
		top: 100%;
		left: 50%;
		box-sizing: border-box;
		width: 36px;
		padding: 2px 4px 3px;
		border: var(--border-width-thin) solid var(--server-badge-colour);
		border-top: 0;
		border-radius: 0 0 6px 6px;
		/* Tint follows latency, not the page theme. */
		background: color-mix(in srgb, var(--server-badge-colour) 16%, transparent);
		color: var(--simulation-callout-color);
		font: var(--font-weight-semibold) 10px
			var(--font-family-code, ui-monospace, monospace);
		line-height: var(--line-height-solid);
		text-align: center;
		pointer-events: none;
		transform: translateX(-50%);
		white-space: nowrap;
	}

	.load-balancer {
		position: absolute;
		bottom: 5%;
		left: 50%;
		background: var(--load-balancer-color);
		transform: translateX(-50%);
	}

	.queue {
		position: absolute;
		right: 13px;
		bottom: 49px;
		left: 13px;
		box-sizing: border-box;
		border: var(--border-width-thin) solid var(--queue-color);
		border-bottom: 0;
		border-radius: 11px 11px 0 0;
		background: color-mix(in srgb, var(--queue-color) 30%, transparent);
	}

	.request-layer {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.controls {
		position: relative;
		z-index: 1;
		display: grid;
		width: fit-content;
		max-width: 100%;
		margin: var(--space-4) 0 0;
		row-gap: var(--space-1);
		grid-template-columns: max-content minmax(0, 14rem);
		column-gap: var(--space-3);
		align-items: center;
		box-sizing: border-box;
		min-inline-size: 0;
		padding: 0;
		border: 0;
	}

	.control {
		display: contents;
	}

	.control s-select,
	.control s-slider,
	.control s-range-slider {
		--control-label-gap: 0;
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: subgrid;
		align-items: center;
	}

	.control s-select {
		display: grid;
		width: 100%;
		height: var(--control-min-height);
		min-width: 0;
	}

	.control s-slider,
	.control s-range-slider {
		display: grid;
		width: 100%;
		height: var(--control-min-height);
		align-items: center;
	}

	.control s-select::part(label),
	.control s-slider::part(label),
	.control s-range-slider::part(label) {
		min-width: 0;
		font: var(--type-ui-size)/ var(--line-height-tight)
			var(--font-family-body, sans-serif);
		text-align: right;
		white-space: nowrap;
	}

	@media (max-width: 32rem) {
		.controls {
			width: 100%;
			grid-template-columns: max-content minmax(0, 1fr);
		}
	}

	@media (max-width: 24rem) {
		.control s-select::part(label),
		.control s-slider::part(label),
		.control s-range-slider::part(label) {
			font-size: var(--font-size-small);
		}

		.control s-select::part(select) {
			padding: var(--space-2) var(--space-5) var(--space-2) var(--space-2);
			font-size: var(--font-size-xsmall);
		}
	}
`;
