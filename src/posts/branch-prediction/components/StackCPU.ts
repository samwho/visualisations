import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { compile } from "../core/cpu/Compiler";
import { CPU } from "../core/cpu/CPU";
import { repeat } from "lit/directives/repeat.js";
import { classMap } from "lit/directives/class-map.js";

@customElement("s-stack-cpu")
export class StackCPU extends LitElement {
	static override styles = css`
		pre {
			margin: 0;
			white-space: normal;
			font: inherit;
		}

		.line {
			display: block;
		}
	`;

	cpu!: CPU;

	override connectedCallback(): void {
		super.connectedCallback();
		const sourceCode = (this.textContent ?? "").trim();
		this.cpu = new CPU(compile(sourceCode));
	}

	override render() {
		return html`
			<pre><code>
        ${repeat(
				this.cpu.program,
				(instruction) => instruction.line,
				(instruction) => {
					const classes = classMap({
						line: true,
						current: instruction.line === this.cpu.pc,
					});
					return html`<span class=${classes}>${instruction.toHTML()}</span>`;
				},
			)}
      </code></pre>
		`;
	}
}
