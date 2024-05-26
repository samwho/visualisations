import { Color } from "pixi.js-legacy";
import chroma from "chroma-js";

export const BACKGROUND = new Color(0xeeeee1);

const PALETTES = {
  wong: [
    new Color("#e69f00"),
    new Color("#56b4e9"),
    new Color("#009e73"),
    //new Color("#f0e442"),
    new Color("#0072b2"),
    new Color("#d55e00"),
    new Color("#cc79a7"),
    new Color("#2e3440"),
  ],
  tol: [
    new Color("#332288"),
    new Color("#117733"),
    new Color("#44AA99"),
    new Color("#88CCEE"),
    new Color("#DDCC77"),
    new Color("#CC6677"),
    new Color("#AA4499"),
    new Color("#882255"),
  ],
};

const urlParams = new URLSearchParams(window.location.search);
const palette = (urlParams.get("palette") || "wong") as keyof typeof PALETTES;
let selectedPalette = PALETTES[palette];

export function setPalette(palette: keyof typeof PALETTES) {
  selectedPalette = PALETTES[palette];
}

export function getColors(): Color[] {
  return selectedPalette;
}

export function getColor(index: number): Color {
  return selectedPalette[index];
}

let index = 0;
export function nextColor(): Color {
  return selectedPalette[index++ % selectedPalette.length];
}

export function findContrastingColor(
  color: Color,
  opts?: { base?: Color; direction?: Color; ratio?: number }
): Color {
  const c = chroma(color.toRgbaString());
  const {
    base = BACKGROUND,
    direction = new Color(0x000000),
    ratio = 3,
  } = opts || {};

  for (const candidate of chroma
    .scale([c, direction.toRgbaString()])
    .mode("lab")
    .colors(20)) {
    if (chroma.contrast(candidate, base.toRgbaString()) > ratio) {
      return new Color(candidate);
    }
  }

  throw new Error("No contrasting color found");
}
