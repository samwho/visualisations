import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { Slider } from "../../../shared/components/Slider";
import { binarySearchGuesses } from "../runtime/BinarySearch";
import "../../../shared/components/Slider";
import "../../../shared/components/BadgedValue";

@customElement("s-higher-or-lower-table")
export class HigherOrLowerTable extends LitElement {
	@state() private target = 2;

	// Light-DOM styles are rendered explicitly and scoped to this component.
	static override styles = css`
		s-higher-or-lower-table {
			display: block;
			width: 100%;
		}
		s-higher-or-lower-table :is(thead, tbody) :is(th, td) {
			padding-inline: clamp(var(--space-1), 2vw, var(--space-4));
			overflow-wrap: anywhere;
		}
		s-higher-or-lower-table .controls {
			display: grid;
			grid-template-columns: max-content minmax(0, 1fr);
			align-items: center;
			gap: var(--space-3);
			font-family: var(--font-family-code);
			font-size: var(--type-ui-size);
		}
		s-higher-or-lower-table :is(.lower, .higher, .correct) {
			font-weight: var(--font-weight-semibold);
			text-transform: uppercase;
		}
		s-higher-or-lower-table .lower {
			color: var(--color-text-data-red);
		}
		s-higher-or-lower-table .higher {
			color: var(--color-text-data-pink);
		}
		s-higher-or-lower-table .correct {
			color: var(--color-text-data-green);
		}
	`;

	// Use the site's canonical table styles across the entire native table.
	protected override createRenderRoot(): HTMLElement {
		return this;
	}

	protected override render() {
		const rows = binarySearchGuesses(this.target);
		return html`
			<style>
				${HigherOrLowerTable.styles}
			</style>
			<table
				fixed
				center
				aria-label="Binary search guesses"
			>
				<thead>
					<tr>
						<th scope="col">Guess #</th>
						<th scope="col">Possibilities</th>
						<th scope="col">I guess</th>
						<th scope="col">You say</th>
					</tr>
				</thead>
				<tbody>
					${Array.from({ length: 7 }, (_, i) => {
						const row = rows[i];
						// Non-breaking spaces keep blank rows as tall as populated ones.
						return row
							? html`<tr>
									<td>${i + 1}</td>
									<td>${row.possibilities}</td>
									<td>${row.guess}</td>
									<td class=${row.response.toLowerCase()}>${row.response}</td>
								</tr>`
							: html`<tr class="empty">
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
								</tr>`;
					})}
				</tbody>
				<tfoot>
					<tr>
						<td colspan="4">
							<div class="controls">
								<s-badged-value
									aria-hidden="true"
									variant="orange"
								>
									<span slot="label">Target</span>
									<span slot="value">${this.target}</span>
								</s-badged-value>
								<s-slider
									label="Target"
									min="1"
									max="100"
									step="1"
									.value=${String(this.target)}
									@input=${this.change}
								></s-slider>
							</div>
						</td>
					</tr>
				</tfoot>
			</table>
		`;
	}

	private readonly change = (event: Event): void => {
		// SAFETY: this handler is attached to the shared slider host.
		this.target = Number((event.currentTarget as Slider).value);
	};
}
