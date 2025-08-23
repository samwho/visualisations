import { Debugger } from "./src/components/Debugger";
import { ArrayViewer } from "./src/components/ArrayViewer";
import { DebuggerControls } from "./src/components/DebuggerControls";
import { Hero } from "./src/components/Hero";
import { CodeTimer } from "./src/components/CodeTimer";
import { CodeTimerBarGraph } from "./src/components/CodeTimerBarGraph";
import { SortGrid } from "./src/components/SortGrid";
import { HigherOrLower } from "./src/components/HigherOrLower";
import { HigherOrLowerTable } from "./src/components/HigherOrLowerTable";
import { init } from "./src/core/CodeWorker";
import Dog from "./src/components/Dog";
import { HighlightedWord } from "./src/components/HighlightedWord";
import { BubbleSortViewer } from "./src/components/BubbleSortViewer";
import Graph from "./src/components/Graph";

async function main() {
  // Initialize the code worker first
  init();

  // Define custom elements
  customElements.define("s-debugger", Debugger);
  customElements.define("s-array", ArrayViewer);
  customElements.define("s-debugger-controls", DebuggerControls);
  customElements.define("s-hero", Hero);
  customElements.define("s-code-timer", CodeTimer);
  customElements.define("s-code-timer-bar-graph", CodeTimerBarGraph);
  customElements.define("s-sort-grid", SortGrid);
  customElements.define("s-higher-or-lower", HigherOrLower);
  customElements.define("s-higher-or-lower-table", HigherOrLowerTable);
  customElements.define("s-dog", Dog);
  customElements.define("h-", HighlightedWord);
  customElements.define("s-bubble-sort-viewer", BubbleSortViewer);
  customElements.define("s-graph", Graph);
}

document.addEventListener("DOMContentLoaded", main);
