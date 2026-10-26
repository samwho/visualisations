import { html, LitElement, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { type HashName, hash, hashNames } from "../Hashers";
import { randomAnimalName } from "../AnimalNames";
import "./BitLink";
import type { Input } from "../../../shared/components/Input";
import "../../../shared/components/Input";
import "../../../shared/components/Button";
import "./Icon";

@customElement("s-hash-values")
export class HashValues extends LitElement {
	@property() value = "foo";

	@property() bfid = "bf1";

	@property({ type: Number }) mod = 32;

	private rows: { name: HashName; value: number; bit: number }[] = [];

	// Native light-DOM table deliberately inherits the site's canonical table styles.
	protected override createRenderRoot(): HTMLElement {
		return this;
	}

	protected override willUpdate(changed: PropertyValues): void {
		if (!changed.has("value") && !changed.has("mod")) {
			return;
		}
		this.rows = hashNames.map((name) => {
			const result = hash(this.value, name);
			return {
				name,
				value: Number(result % 0x100000000n),
				bit: Number(result % BigInt(this.mod)),
			};
		});
	}

	protected override render() {
		return html`<table
			fixed
			aria-label="Hash values and bloom filter bit positions"
		>
			<thead>
				<tr>
					<th scope="col">fn</th>
					<th
						scope="col"
						title=${`fn(${JSON.stringify(this.value)})`}
					>
						fn(${JSON.stringify(this.value)})
					</th>
					<th scope="col">% ${this.mod}</th>
				</tr>
			</thead>
			<tbody>
				${this.rows.map(
					(row) =>
						html`<tr>
							<td class="hash-name ${row.name}">${row.name}</td>
							<td>${row.value}</td>
							<td>
								<s-bitlink
									appearance="bit"
									bfid=${this.bfid}
									>${keyed(row.bit, row.bit)}</s-bitlink
								>
							</td>
						</tr>`,
				)}
			</tbody>
			<tfoot>
				<tr>
					<td colspan="3">
						<div class="hash-controls">
							<s-input
								label="Value to hash"
								.value=${this.value}
								@input=${(e: Event) => {
									// SAFETY: this listener is attached directly to s-input, not its internal native input.
									this.value = (e.currentTarget as Input).value;
								}}
							></s-input>
							<s-button
								label="Choose a random colour and animal"
								@click=${() => {
									this.value = randomAnimalName(this.value);
								}}
							>
								<s-icon
									slot="icon"
									name="shuffle"
									aria-hidden="true"
								></s-icon>
							</s-button>
						</div>
					</td>
				</tr>
			</tfoot>
		</table>`;
	}
}
