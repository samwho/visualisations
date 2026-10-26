import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import type { LineChartOptions } from "../../../shared/components/LineChart";
import "../../../shared/components/LineChart";
import type { RadioGroup } from "../../../shared/components/RadioGroup";
import "../../../shared/components/RadioGroup";
import { visuallyHiddenStyles } from "../../../shared/styles/Accessibility";

type Dataset = "randomUUID" | "intToStr" | "commonWords";
type Counts = readonly [readonly number[], readonly number[]];

const sampleCount = 10_000;
const outputBits = 32;
const datasetOptions = [
	{ value: "randomUUID", label: "Random" },
	{ value: "intToStr", label: "Numbers" },
	{ value: "commonWords", label: "Words" },
];

// InputSequence seed 0x51a6f1e generated each article dataset (indices 1–10,000
// for numbers, 0–9,999 otherwise). Independent mulberry32 seed 0xa61a9e chose
// one input bit to flip per pair. Both hashes used the same pairs.
const counts: Record<Dataset, Counts> = {
	randomUUID: [
		[
			0, 0, 0, 0, 0, 0, 2, 9, 12, 69, 147, 286, 518, 789, 1130, 1347, 1404,
			1286, 1137, 814, 511, 277, 163, 54, 35, 7, 2, 0, 1,
		],
		[0, 4970, 2436, 1476, 649, 266, 115, 63, 17, 7, 1],
	],
	intToStr: [
		[
			0, 0, 0, 0, 0, 1, 5, 8, 24, 61, 151, 302, 553, 830, 1063, 1369, 1376,
			1330, 1109, 768, 501, 304, 132, 69, 29, 10, 4, 1,
		],
		[0, 3534, 3805, 2273, 273, 102, 13],
	],
	commonWords: [
		[
			0, 0, 0, 0, 0, 1, 3, 3, 18, 66, 124, 301, 558, 828, 1120, 1303, 1401,
			1298, 1093, 799, 546, 298, 148, 59, 20, 6, 7, 0, 0, 0, 0, 0, 0,
		],
		[
			0, 4921, 2570, 1132, 807, 363, 120, 57, 18, 9, 3, 0, 0, 0, 0, 0, 0, 0, 0,
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
		],
	],
};

function percentages(values: readonly number[]) {
	return Array.from({ length: outputBits + 1 }, (_, bits) => ({
		x: (bits / outputBits) * 100,
		y: ((values[bits] ?? 0) / sampleCount) * 100,
	}));
}

@customElement("s-avalanche-histogram")
export class AvalancheHistogram extends LitElement {
	static override styles = [
		visuallyHiddenStyles,
		css`
			:host {
				display: block;
				width: 100%;
			}
			s-radio-group {
				display: block;
				width: max-content;
				max-width: 100%;
				margin-inline: auto;
			}
		`,
	];

	private selected: Dataset = "randomUUID";

	private displayed = counts.randomUUID.map((series) =>
		Array.from({ length: outputBits + 1 }, (_, bits) => series[bits] ?? 0),
	);

	private frame = 0;

	private readonly changeDataset = (event: Event): void => {
		// SAFETY: the change listener is attached to this radio group.
		const value = (event.currentTarget as RadioGroup).value as Dataset;
		if (!(value in counts) || value === this.selected) {
			return;
		}
		this.selected = value;
		cancelAnimationFrame(this.frame);
		const from = this.displayed.map((series) => [...series]);
		const to = counts[value].map((series) =>
			Array.from({ length: outputBits + 1 }, (_, bits) => series[bits] ?? 0),
		);
		if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
			this.displayed = to;
			this.requestUpdate();
			return;
		}
		const duration =
			Number.parseFloat(
				getComputedStyle(this).getPropertyValue("--motion-duration-playful"),
			) || 300;
		let started: number | undefined;
		const step = (now: number) => {
			started ??= now;
			const progress = Math.min(1, (now - started) / duration);
			const eased = progress * progress * (3 - 2 * progress);
			this.displayed = from.map((series, index) =>
				series.map((count, bit) => count + (to[index]![bit]! - count) * eased),
			);
			this.requestUpdate();
			if (progress < 1) {
				this.frame = requestAnimationFrame(step);
			}
		};

		this.frame = requestAnimationFrame(step);
		this.requestUpdate();
	};

	override disconnectedCallback(): void {
		cancelAnimationFrame(this.frame);
		super.disconnectedCallback();
	}

	protected override render() {
		const options: LineChartOptions = {
			title: "Avalanche bit flip distribution",
			xAxisTitle: "Percent of output bits flipped",
			yAxisTitle: "Percent of input",
			height: 320,
			xMinimum: 0,
			xMaximum: 100,
			xTickStep: 20,
			yMinimum: 0,
			yMaximum: 60,
			yTickStep: 10,
			xTickFormat: (value) => `${value}%`,
			yTickFormat: (value) => `${value}%`,
			smoothLines: true,
			series: [
				{
					name: "murmur3",
					points: percentages(this.displayed[0]!),
					color: "var(--color-palette-green-line)",
				},
				{
					name: "stringSum",
					points: percentages(this.displayed[1]!),
					color: "var(--color-palette-red-line)",
					texture: "dashed",
				},
			],
		};
		return html`
			<s-line-chart
				.options=${options}
				full-width
			>
				<s-radio-group
					slot="footer"
					.options=${datasetOptions}
					.value=${this.selected}
					label="Input dataset"
					appearance="button"
					@change=${this.changeDataset}
				></s-radio-group>
			</s-line-chart>
			<p
				class="visually-hidden"
				aria-live="polite"
			>
				${datasetOptions.find((option) => option.value === this.selected)?.label}:
				Each line shows the percentage of input pairs at each percentage of
				changed output bits after one input bit changes. Both algorithms use the
				same 10,000 input pairs.
			</p>
		`;
	}
}
