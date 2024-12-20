import { type Color, default as chroma } from "chroma-js";

export const BACKGROUND = "#eeeee1";

const PALETTES = {
  wong: [
    chroma("#e69f00"),
    chroma("#56b4e9"),
    chroma("#009e73"),
    chroma("#f0e442"),
    chroma("#0072b2"),
    chroma("#d55e00"),
    chroma("#cc79a7"),
    chroma("#2e3440"),
  ],
  tol: [
    chroma("#332288"),
    chroma("#117733"),
    chroma("#44AA99"),
    chroma("#88CCEE"),
    chroma("#DDCC77"),
    chroma("#CC6677"),
    chroma("#AA4499"),
    chroma("#882255"),
  ],
};

const urlParams = new URLSearchParams(window.location.search);
const palette = (urlParams.get("palette") || "wong") as keyof typeof PALETTES;
let selectedPalette = PALETTES[palette] || PALETTES.wong;

export function setPalette(palette: keyof typeof PALETTES) {
  selectedPalette = PALETTES[palette];
}

export function getColors(): Color[] {
  return selectedPalette;
}

export function getColor(index: number): Color {
  return selectedPalette[index]!;
}

let index = 0;
export function nextColor(): Color {
  return selectedPalette[index++ % selectedPalette.length]!;
}

export function availableColors(): number[] {
  return selectedPalette.map((_, i) => i);
}

export function findContrastingColor(
  color: Color,
  opts?: { base?: Color; direction?: Color; ratio?: number },
): Color {
  const {
    base = BACKGROUND,
    direction = chroma("#000000"),
    ratio = 3,
  } = opts || {};

  for (const candidate of chroma
    .scale([color, direction])
    .mode("lab")
    .colors(20)) {
    if (chroma.contrast(candidate, base) > ratio) {
      return chroma(candidate);
    }
  }

  throw new Error("No contrasting color found");
}

export function invert(color: Color): Color {
  let hex = color.hex();
  if (hex.indexOf("#") === 0) {
    hex = hex.slice(1);
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0]! + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
    throw new Error("Invalid HEX color.");
  }
  // invert color components
  const r = (255 - Number.parseInt(hex.slice(0, 2), 16)).toString(16);
  const g = (255 - Number.parseInt(hex.slice(2, 4), 16)).toString(16);
  const b = (255 - Number.parseInt(hex.slice(4, 6), 16)).toString(16);

  // pad each with zeros and return
  return chroma(`#${padZero(r)}${padZero(g)}${padZero(b)}`);
}

function padZero(str: string, len = 2) {
  const zeros = new Array(len).join("0");
  return (zeros + str).slice(-len);
}

export const STATE = getColor(1);
export const VALUE = getColor(0);
export const INSTRUCTION = getColor(2).alpha(0.8);
export const HEAD = getColor(5);
