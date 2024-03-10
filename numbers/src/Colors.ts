import { Color } from "pixi.js";

const PALETTES = {
  warm2: [
    new Color("#4968A6"),
    new Color("#3F5073"),
    new Color("#F2AE30"),
    new Color("#F28B30"),
    new Color("#F26B1D"),
  ],
};

const urlParams = new URLSearchParams(window.location.search);
const palette = (urlParams.get("palette") || "warm2") as keyof typeof PALETTES;
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

let index = 0;
export function nextColor(): Color {
  const color = selectedPalette[index % selectedPalette.length];
  index++;
  return color;
}
