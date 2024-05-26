/// <reference types="bun-types" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// https://pixijs.download/v7.4.0/docs/index.html
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin.js";
import * as PIXI from "pixi.js-legacy";
import * as elements from "./src/elements";
import { Fonts } from "./src/core/Fonts";
import { initCustomElements } from "./src/core/Decorators";

PIXI.settings.RESOLUTION = Math.max(2, window.devicePixelRatio);
PIXI.settings.ROUND_PIXELS = true;
PIXI.Graphics.curves.adaptive = true;
PIXI.Graphics.curves.maxLength = 4;

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

// Need to reference the elements otherwise bundling will optimise them
// out.
elements;

// @ts-ignore
window.startQueueingBlogScript = async () => {
  await Fonts.haveBeenLoaded();
  initCustomElements();
};

// This prevents the default double click zoom behaviour on the canvas, which
// would otherwise trigger when double clicking the request button fast enough.
document.ondblclick = (e) => {
  if (e.target instanceof HTMLCanvasElement) {
    e.preventDefault();
  }
};

// window.onanimationiteration = console.log;

gsap.ticker.add((time, deltaTime, frame) => {
  if (frame % 120 === 0) {
    const children = gsap.globalTimeline.getChildren(true, false, true);
    const allPaused = children.every((tl) => tl.paused());
    if (children.length === 0 || allPaused) {
      gsap.ticker.sleep();
    }
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  // @ts-ignore
  window.startQueueingBlogScript();
});
