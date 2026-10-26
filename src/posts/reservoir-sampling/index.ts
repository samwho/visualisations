import "../../shared/components/BadgedValue";
import "../../shared/components/FullBleed";
import "../../shared/components/PingForm";
import "../../shared/components/Button";
import type { Button } from "../../shared/components/Button";
import "../../shared/components/Card";
import "./components/FlushProgress";
import type { FlushProgress } from "./components/FlushProgress";
import "./components/Icon";
import "./components/SparkLines";
import type { Icon } from "./components/Icon";
import { LogStream } from "./components/LogStream";
import type { SparkLines } from "./components/SparkLines";
import "../../shared/components/Slider";
import "../../shared/components/dogs/Doe";
import "../../shared/components/dogs/Haskie";
import "../../shared/components/dogs/HaskieConcerned";
import "../../shared/components/dogs/HaskieConfused";
import "../../shared/components/dogs/HaskieTriumphant";
import "./components/PlayingCard";
import "./components/CardReservoirSample";
import "./components/CardReservoirSample2";
import "./components/CardOddsBarChart";
import "./components/Term";
import "./components/ReservoirSamplingHero";
import { RandomSelect } from "./components/RandomSelect";
import { RandomShuffle } from "./components/RandomShuffle";
import { CardSelectBarChart } from "./components/CardSelectBarChart";
import { Slider } from "../../shared/components/Slider";
import "../../shared/components/SpeedSlider";
import type { SpeedSlider } from "../../shared/components/SpeedSlider";
import { makeCodeBlocksFocusable } from "../../shared/core/Accessibility";
import { ObservedState } from "../../shared/core/ObservedState";

const simulationSpeed = new ObservedState(1);

makeCodeBlocksFocusable();
for (const button of document.querySelectorAll<HTMLElement>(
	"s-button[data-target]",
)) {
	const target = document.getElementById(button.dataset.target ?? "");
	const times = Number(button.dataset.times ?? 1);
	button.addEventListener("click", () => {
		if (target instanceof RandomShuffle) {
			void target.shuffle(times);
		}
		if (target instanceof RandomSelect) {
			target.select(times);
		}
		if (target instanceof CardSelectBarChart) {
			target.reset();
		}
	});
}

for (const button of document.querySelectorAll<Button>(
	"s-button[data-log-target]",
)) {
	const stream = document.getElementById(button.dataset.logTarget ?? "");
	const graph = document.querySelector<SparkLines>(
		`s-spark-lines[target-id="${button.dataset.logTarget}"]`,
	);
	const panel = button.closest("s-card");
	const reset = panel?.querySelector<Button>("s-button[data-log-reset]");
	const speed = panel?.querySelector<SpeedSlider>(
		"s-speed-slider[data-log-speed]",
	);
	const progress = panel?.querySelector<FlushProgress>("s-flush-progress");
	const flushCycle = panel?.querySelector<HTMLElement>(".flush-cycle");
	const rate = panel?.querySelector<HTMLElement>(".log-rate [slot=value]");
	const icon = button.querySelector<Icon>("s-icon");
	if (!(stream instanceof LogStream) || !graph || !icon || !reset) {
		continue;
	}
	if (speed) {
		const syncSpeed = () => {
			const value = simulationSpeed.get();
			stream.timeline.setPlaybackRate(value);
			speed.value = String(value);
		};

		speed.addEventListener("input", () => {
			simulationSpeed.set(Number(speed.value));
		});
		simulationSpeed.addEventListener("change", syncSpeed);
		syncSpeed();
	}
	const syncPlayback = () => {
		graph.paused = stream.paused;
		button.label = stream.paused ? "Play logs" : "Pause logs";
		icon.name = stream.paused ? "play" : "pause";
		if (flushCycle) {
			flushCycle.hidden = stream.paused;
		}
	};

	button.addEventListener("click", () => {
		stream.paused = !stream.paused;
		syncPlayback();
	});
	reset.addEventListener("click", () => {
		stream.reset();
		graph.reset();
		progress?.stopCycle();
		syncPlayback();
	});
	if (rate) {
		graph.addEventListener("rate", (event) => {
			// SAFETY: SparkLines emits its smoothed incoming rate to one decimal place.
			rate.textContent = (event as CustomEvent<string>).detail;
		});
	}
	if (progress) {
		stream.addEventListener("flush-start", () =>
			progress.startCycle(1000, stream.timeline),
		);
		stream.addEventListener("flush", () => progress.restartCycle());
		stream.addEventListener("flush-stop", () => progress.stopCycle());
	}
	syncPlayback();
}

for (const slider of document.querySelectorAll<Slider>(
	"s-slider[data-sample-size]",
)) {
	const k = Number(slider.dataset.sampleSize);
	const suffix = k === 1 ? "" : "2";
	const held = document.getElementById("held" + suffix)!;
	const holdPercent = document.getElementById("hold-percent" + suffix)!;
	const replace = document.getElementById("replace" + suffix)!;
	const replacePercent = document.getElementById("replace-percent" + suffix)!;
	slider.addEventListener("input", () => {
		const n = Number(slider.value);
		if (n === k) {
			held.textContent =
				k === 1 ? "1/(n-1) * (1-(1/n))" : "k/(n-1) * (1-(1/n))";
			replace.textContent = k === 1 ? "1/n" : "k/n";
			holdPercent.textContent = "-";
			replacePercent.textContent = "-";
		} else {
			held.textContent = `${k}/(${n}-1) * (1-(1/${n}))`;
			replace.textContent = `${k}/${n}`;
			holdPercent.textContent = `${((k / (n - 1)) * (1 - 1 / n) * 100).toFixed(2)}%`;
			replacePercent.textContent = `${((k / n) * 100).toFixed(2)}%`;
		}
	});
}
