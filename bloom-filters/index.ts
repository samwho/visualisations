/// <reference types="bun-types" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin.js";
import { TextPlugin } from "gsap/TextPlugin.js";
import * as PIXI from "pixi.js-legacy";
import * as elements from "./src/elements";

PIXI.settings.RESOLUTION = window.devicePixelRatio;
PIXI.settings.ROUND_PIXELS = true;

gsap.registerPlugin(PixiPlugin);
gsap.registerPlugin(TextPlugin);
PixiPlugin.registerPIXI(PIXI);

// Need to reference the elements otherwise bundling will optimise them
// out.
elements;

gsap.ticker.add((time, deltaTime, frame) => {
  const children = gsap.globalTimeline.getChildren();
  if (frame % 120 === 0) {
    if (children.length === 0) {
      gsap.ticker.sleep();
    }
  }
});
