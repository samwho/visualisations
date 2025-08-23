const PALETTES = {
  wong: [
    "#e69f00",
    "#56b4e9",
    "#009e73",
    "#f0e442",
    "#0072b2",
    "#d55e00",
    "#cc79a7",
    "#2e3440",
  ],
  tol: [
    "#332288",
    "#117733",
    "#44AA99",
    "#88CCEE",
    "#DDCC77",
    "#CC6677",
    "#AA4499",
    "#882255",
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

export function getColors(): string[] {
  return selectedPalette;
}