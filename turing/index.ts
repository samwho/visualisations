/// <reference types="bun-types" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import Dog from "./components/Dog";
import { HighlightedWord } from "./components/HighlightedWord";
import { TuringMachine } from "./components/TuringMachine";
import { Compiler } from "./machine/Compiler";
import * as colors from "./core/Colors";

declare global {
  interface Window {
    globalSpeedMultiplier: number;
  }
}

window.globalSpeedMultiplier = 1;

async function main() {
  customElements.define("turing-machine", TuringMachine);
  // @ts-expect-error
  customElements.define("h-", HighlightedWord);
  // @ts-expect-error
  customElements.define("dog-", Dog);

  if (window.location.pathname.startsWith("/turing-machines")) {
    HighlightedWord.parse(document.body);
  }
}

window.addEventListener("load", main);

export { TuringMachine, Compiler, colors };
