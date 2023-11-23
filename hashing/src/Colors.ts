export const black = 0x000000;
export const grey = 0x2e3440;
export const orange = 0xE69F00;
export const lightBlue = 0x56B4E9;
export const green = 0x009E73;
export const yellow = 0xF0E442;
export const blue = 0x0072B2;
export const red = 0xD55E00;
export const purple = 0xCC79A7;

export function getColor(name: string): number {
    switch (name) {
        case "black":
            return black;
        case "orange":
            return orange;
        case "lightBlue":
            return lightBlue;
        case "green":
            return green;
        case "yellow":
            return yellow;
        case "blue":
            return blue;
        case "red":
            return red;
        case "purple":
            return purple;
        case "grey":
            return grey;
        default:
            throw new Error(`Unknown color: ${name}`);
    }
}
