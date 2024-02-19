import { Color } from "pixi.js-legacy";

const PALETTES = {
  wong: [
    new Color("#e69f00"),
    new Color("#56b4e9"),
    new Color("#009e73"),
    new Color("#f0e442"),
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
const selectedPalette = PALETTES[palette];

export const one = selectedPalette[0];
export const two = selectedPalette[1];
export const three = selectedPalette[2];
export const four = selectedPalette[3];
export const five = selectedPalette[4];
export const six = selectedPalette[5];
export const seven = selectedPalette[6];
export const eight = selectedPalette[7];

export function getColors(): Color[] {
  return selectedPalette;
}
