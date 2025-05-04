import { CardSelectBarChart } from "./src/elements/CardSelectBarChart";
import { CardReservoirSample } from "./src/elements/CardReservoirSample";
import Dog from "./src/elements/Dog";
import { Hero } from "./src/elements/Hero";
import { LogStream } from "./src/elements/LogStream";
import { RandomSelect } from "./src/elements/RandomSelect";
import { RandomShuffle } from "./src/elements/RandomShuffle";
import { CardReservoirSample2 } from "./src/elements/CardReservoirSample2";
import { SparkLines } from "./src/elements/SparkLines";
import { HighlightedWord } from "./src/elements/HighlightedWord";
import { CardOddsBarChart } from "./src/elements/CardOddsBarChart";
import { Card } from "./src/elements/Card";

async function main() {
  customElements.define("s-hero", Hero);
  customElements.define("s-dog", Dog);
  customElements.define("s-card-reservoir-sample", CardReservoirSample);
  customElements.define("s-card-reservoir-sample-2", CardReservoirSample2);
  customElements.define("s-random-shuffle", RandomShuffle);
  customElements.define("s-random-select", RandomSelect);
  customElements.define("s-card-select-bar-chart", CardSelectBarChart);
  customElements.define("s-card-odds-bar-chart", CardOddsBarChart);
  customElements.define("s-log-stream", LogStream);
  customElements.define("s-spark-lines", SparkLines);
  customElements.define("s-card", Card);
  customElements.define("h-", HighlightedWord);
}

document.addEventListener("DOMContentLoaded", main);
