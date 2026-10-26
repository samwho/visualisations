import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import "../../../shared/components/Button";
import { CountingBloomFilter } from "./CountingBloomFilter";
import "./Icon";

@customElement("s-counting-bloom-false-negative-controls")
export class CountingBloomFalseNegativeControls extends LitElement {
	static override styles = css`
		:host {
			display: flex;
			flex-wrap: wrap;
			gap: var(--space-2);
			align-items: center;
		}
		s-button {
			flex: 1 0 auto;
		}
	`;

	private get filter(): CountingBloomFilter {
		return this.closest<CountingBloomFilter>("s-counting-bloom-filter")!;
	}

	protected override render() {
		return html`
			<s-button
				variant="success"
				label="Add loved"
				@click=${() => this.filter.add("loved")}
				><s-icon
					slot="icon"
					name="add"
				></s-icon
				>loved</s-button
			>
			<s-button
				variant="success"
				label="Add your"
				@click=${() => this.filter.add("your")}
				><s-icon
					slot="icon"
					name="add"
				></s-icon
				>your</s-button
			>
			<s-button
				variant="danger"
				label="Remove response"
				@click=${() => this.filter.removeValue("response")}
				><s-icon
					slot="icon"
					name="remove"
				></s-icon
				>response</s-button
			>
			<s-button
				variant="danger"
				@click=${() => this.filter.reset()}
				><s-icon
					slot="icon"
					name="clear"
				></s-icon
				>Clear</s-button
			>
		`;
	}
}
