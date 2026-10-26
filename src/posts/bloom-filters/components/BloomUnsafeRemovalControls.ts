import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import "../../../shared/components/Button";
import { BloomFilter } from "./BloomFilter";
import "./Icon";

@customElement("s-bloom-unsafe-removal-controls")
export class BloomUnsafeRemovalControls extends LitElement {
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

	private get filter(): BloomFilter {
		return this.closest<BloomFilter>("s-bloom-filter")!;
	}

	protected override render() {
		return html`
			<s-button
				variant="success"
				label="Add foo"
				@click=${() => this.filter.add("foo")}
				><s-icon
					slot="icon"
					name="add"
				></s-icon
				>foo</s-button
			>
			<s-button
				variant="success"
				label="Add baz"
				@click=${() => this.filter.add("baz")}
				><s-icon
					slot="icon"
					name="add"
				></s-icon
				>baz</s-button
			>
			<s-button
				variant="danger"
				label="Remove baz"
				@click=${() => this.filter.unsafeRemoveValue("baz")}
				><s-icon
					slot="icon"
					name="remove"
				></s-icon
				>baz</s-button
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
