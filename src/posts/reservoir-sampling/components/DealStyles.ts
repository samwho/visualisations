import { css } from "lit";
import { cardCornerRadius, cardHeight, cardWidth } from "./PlayingCard";

const slotOutset = 2;

export const dealStyles = css`
	:host {
		display: block;
		width: 100%;
		font-family: var(--font-family-code);
	}
	.stage {
		padding: var(--space-4);
	}
	.slots {
		--gap: var(--space-6);
		--columns: 3;
		width: 100%;
		display: grid;
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		gap: var(--gap);
		position: relative;
		perspective: 800px;
	}
	.slot {
		aspect-ratio: ${cardWidth} / ${cardHeight};
		position: relative;
		border-radius:
			${(cardCornerRadius / cardWidth) * 100}% /
			${(cardCornerRadius / cardHeight) * 100}%;
	}
	.slot-label {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-weight: var(--font-weight-bold);
		font-size: clamp(var(--font-size-xsmall), 2cqw, var(--type-ui-size));
		pointer-events: none;
	}
	.chosen .slot-label {
		color: var(--color-text-data-dark-blue);
	}
	.discard .slot-label {
		color: var(--color-text-data-red);
	}
	.deck-button {
		position: absolute;
		inset: 0;
		padding: 0;
		border: 0;
		border-radius: inherit;
		background: transparent;
		cursor: pointer;
	}
	.deck-button:disabled {
		cursor: default;
	}
	.deck-button:focus-visible {
		outline: var(--focus-ring-width-strong) solid var(--focus-ring-color);
		outline-offset: var(--focus-ring-offset-wide);
	}
	.slot s-deck,
	.slot s-card-pile {
		position: absolute;
		inset: 0;
		width: 100%;
	}
	.slot::before {
		content: "";
		position: absolute;
		inset: -${slotOutset}px;
		box-sizing: border-box;
		border: var(--border-width-thin) dotted var(--_slot-border, transparent);
		/* Offset percentages against the larger hit target. */
		border-radius:
			calc(
				${(cardCornerRadius / cardWidth) * 100}% +
				${slotOutset * (1 - (2 * cardCornerRadius) / cardWidth)}px
			) /
			calc(
				${(cardCornerRadius / cardHeight) * 100}% +
				${slotOutset * (1 - (2 * cardCornerRadius) / cardHeight)}px
			);
		background: var(--_slot-fill, transparent);
	}
	.chosen {
		--_slot-border: var(--color-palette-dark-blue-border);
		--_slot-fill: var(--color-palette-dark-blue-surface-strong);
	}
	.discard {
		--_slot-border: var(--color-palette-red-border);
		--_slot-fill: var(--color-palette-red-surface-strong);
	}
	.controls {
		display: flex;
		gap: var(--space-2);
		justify-content: flex-end;
		align-items: center;
		flex-wrap: wrap;
	}
	.deal-controls {
		display: flex;
		flex-shrink: 0;
		max-width: 100%;
		gap: var(--space-2);
		align-items: center;
		justify-content: flex-end;
		flex-wrap: wrap;
	}
	.controls s-button:first-child {
		margin-inline-end: auto;
	}
	.counts {
		margin-block-end: var(--space-2);
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		width: 100%;
		gap: var(--space-6);
		font-weight: var(--font-weight-bold);
		font-size: clamp(var(--type-ui-size), 4cqw, var(--font-size-large));
		text-align: center;
	}
	.hold {
		grid-column: 2;
		color: var(--color-text-data-dark-blue);
	}
	.discarded {
		color: var(--color-text-data-red);
	}
	.message:empty {
		display: none;
	}
	.message {
		min-height: calc(1em * var(--line-height-normal) + 2 * var(--space-2) + var(--border-width-thin));
		display: block;
		padding: var(--space-2) var(--space-4);
		font-weight: var(--font-weight-bold);
		line-height: var(--line-height-normal);
		text-align: center;
	}
`;
