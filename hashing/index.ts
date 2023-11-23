/// <reference types="bun-types" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin.js";
import * as PIXI from 'pixi.js';
var WebFont = require('webfontloader');

import HeatMapElement from "./src/HeatMapElement";
import AvalancheElement from "./src/AvalancheElement";
import HashMapElement from "./src/HashMapElement";

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

gsap.ticker.add(() => {
    if (gsap.globalTimeline.getChildren().length === 0) {
        gsap.ticker.sleep();
    }
});

async function main() {
    WebFont.load({
        google: {
            families: ['Fira Code'],
        },
        active: function () {
            HeatMapElement.register();
            HashMapElement.register();
            AvalancheElement.register();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    main();
});
