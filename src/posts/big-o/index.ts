import "../../shared/components/Button";
import "../../shared/components/FullBleed";
import "../../shared/components/PingForm";
import "../../shared/components/Slider";
import "../../shared/components/dogs/Doe";
import "../../shared/components/dogs/HaskieConfused";
import "../../shared/components/dogs/HaskieTriumphant";
import "../../shared/components/dogs/SageCaution";
import "../../shared/components/dogs/SageProud";
import "./components/BigOHero";
import "./components/Term";
import "./components/CodeTimer";
import "./components/CodeTimerBarGraph";
import "./components/BubbleSort1";
import "./components/HigherOrLower";
import "./components/HigherOrLowerTable";
import { Graph } from "./components/Graph";
import { Slider } from "../../shared/components/Slider";
import { makeCodeBlocksFocusable } from "../../shared/core/Accessibility";

makeCodeBlocksFocusable();
for (const slider of document.querySelectorAll<Slider>(
	"s-slider[data-graph]",
)) {
	const graph = document.getElementById(slider.dataset.graph ?? "");
	if (graph instanceof Graph) {
		slider.addEventListener("input", () => {
			graph.drawupto = Number(slider.value);
		});
	}
}
