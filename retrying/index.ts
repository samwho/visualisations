/// <reference types="bun-types" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js-legacy";
import TrafficSimulation from "./src/elements/TrafficSimulation";
import FailureRateControl from "./src/elements/FailureRateControl";
import ServersControl from "./src/elements/ServersControl";
import AnimationSpeedControl from "./src/elements/AnimationSpeedControl";

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

gsap.ticker.add(() => {
  if (gsap.globalTimeline.getChildren().length === 0) {
    gsap.ticker.sleep();
  }
});

async function main() {
  TrafficSimulation.register();
  FailureRateControl.register();
  ServersControl.register();
  AnimationSpeedControl.register();
}

document.addEventListener("DOMContentLoaded", () => {
  main();
});
